/* Raw-stream driver. adapter.h is the only program/target-specific part. */
#include <float.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "adapter.h"

#define MAX_INSTANCES 2
#define GUARD 1234567.0f

typedef struct {
    probe state;
    float *inputs[INPUTS + 1];
    float *outputs[OUTPUTS + 1];
    int frames, next, initialized;
} stream;

static stream streams[MAX_INSTANCES];

static void fail(const char *message) {
    fprintf(stderr, "native driver: %s\n", message);
    exit(1);
}

static float *allocate(int frames) {
    float *data = malloc(((size_t)frames + 2) * sizeof(float));
    if (!data) fail("allocation failed");
    data[0] = data[frames + 1] = GUARD;
    return data + 1;
}

static float read_float(FILE *file) {
    unsigned char bytes[4];
    if (fread(bytes, 1, 4, file) != 4) fail("truncated input stream");
    uint32_t bits = (uint32_t)bytes[0] | (uint32_t)bytes[1] << 8
        | (uint32_t)bytes[2] << 16 | (uint32_t)bytes[3] << 24;
    float value;
    memcpy(&value, &bits, 4);
    return value;
}

static void write_float(FILE *file, float value) {
    uint32_t bits;
    memcpy(&bits, &value, 4);
    unsigned char bytes[4] = { bits & 255, (bits >> 8) & 255, (bits >> 16) & 255, bits >> 24 };
    if (fwrite(bytes, 1, 4, file) != 4) fail("cannot write output stream");
}

static void initialize(stream *s, int id, int frames, int poison) {
    if (s->initialized || frames < 0 || frames > 1000000 || poison < 0 || poison > 255)
        fail("invalid initialization");
    s->initialized = 1;
    s->frames = frames;
    memset(&s->state, poison, sizeof(s->state));
    probe_init(&s->state);
    char name[64];
    snprintf(name, sizeof(name), "input-%d.f32", id);
    FILE *file = fopen(name, "rb");
    if (!file) fail("cannot open input stream");
    for (int c = 0; c < INPUTS; c++) {
        s->inputs[c] = allocate(frames);
        for (int i = 0; i < frames; i++) s->inputs[c][i] = read_float(file);
    }
    if (fgetc(file) != EOF || ferror(file)) fail("wrong input byte count");
    if (fclose(file)) fail("cannot close input stream");
    for (int c = 0; c < OUTPUTS; c++) {
        s->outputs[c] = allocate(frames);
        for (int i = 0; i < frames; i++) s->outputs[c][i] = NAN;
    }
}

static void process(stream *s, int at, int frames) {
    if (at != s->next || frames < 0 || frames > s->frames - at)
        fail("invalid process range");
    const float *x[INPUTS + 1] = {0};
    float *y[OUTPUTS + 1] = {0};
    for (int c = 0; c < INPUTS; c++) x[c] = s->inputs[c] + at;
    for (int c = 0; c < OUTPUTS; c++) y[c] = s->outputs[c] + at;
    adapter_process(&s->state, x, y, frames);
    s->next += frames;
}

static void save(stream *s, int id, int pass) {
    if (s->next != s->frames || pass < 0 || pass > 1) fail("incomplete output stream");
    char name[64];
    snprintf(name, sizeof(name), "output-%d-%d.f32", id, pass);
    FILE *file = fopen(name, "wb");
    if (!file) fail("cannot open output stream");
    for (int c = 0; c < INPUTS; c++)
        if (s->inputs[c][-1] != GUARD || s->inputs[c][s->frames] != GUARD) fail("input guard changed");
    for (int c = 0; c < OUTPUTS; c++) {
        if (s->outputs[c][-1] != GUARD || s->outputs[c][s->frames] != GUARD) fail("output guard changed");
        for (int i = 0; i < s->frames; i++) {
            write_float(file, s->outputs[c][i]);
            s->outputs[c][i] = NAN;
        }
    }
    if (fclose(file)) fail("cannot close output stream");
    s->next = 0; // Rewind transport only. The next pass resets the live instance.
}

int main(int argc, char **argv) {
    if (sizeof(float) != 4 || FLT_RADIX != 2 || FLT_MANT_DIG != 24 || FLT_MAX_EXP != 128)
        fail("IEEE-754 binary32 float required");
    if (argc != 2) fail("usage: check commands.txt");
    FILE *commands = fopen(argv[1], "r");
    if (!commands) fail("cannot open commands");
    char command[16];
    while (fscanf(commands, "%15s", command) == 1) {
        int id, a, b;
        float value;
        if (fscanf(commands, "%d", &id) != 1 || id < 0 || id >= MAX_INSTANCES) fail("invalid instance");
        stream *s = &streams[id];
        if (!strcmp(command, "init")) {
            if (fscanf(commands, "%d %d", &a, &b) != 2) fail("invalid init");
            initialize(s, id, a, b);
            continue;
        }
        if (!s->initialized) fail("instance not initialized");
        if (!strcmp(command, "rate")) {
            if (fscanf(commands, "%f", &value) != 1 || !isfinite(value) || value <= 0) fail("invalid rate");
            probe_set_sample_rate(&s->state, value);
        } else if (!strcmp(command, "control")) {
            if (fscanf(commands, "%d %f", &a, &value) != 2 || a < 0 || a >= CONTROLS || !isfinite(value))
                fail("invalid control");
            adapter_control(&s->state, a, value);
        } else if (!strcmp(command, "reset")) {
            probe_reset(&s->state);
        } else if (!strcmp(command, "process")) {
            if (fscanf(commands, "%d %d", &a, &b) != 2) fail("invalid process");
            process(s, a, b);
        } else if (!strcmp(command, "save")) {
            if (fscanf(commands, "%d", &a) != 1) fail("invalid save");
            save(s, id, a);
        } else fail("unknown command");
    }
    if (ferror(commands) || fclose(commands)) fail("cannot read commands");
    for (int id = 0; id < MAX_INSTANCES; id++) {
        stream *s = &streams[id];
        if (s->next) fail("unsaved output");
        if (!s->initialized) continue;
        for (int c = 0; c < INPUTS; c++) free(s->inputs[c] - 1);
        for (int c = 0; c < OUTPUTS; c++) free(s->outputs[c] - 1);
    }
    return 0;
}
