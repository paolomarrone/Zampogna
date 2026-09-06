'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const z = require('../../src/zampogna');
const util = require('../../src/util');
const { run } = require('./process');
const { encode, decode, compare, json } = require('./streams');
const { normalize, plan, partitions } = require('./timeline');

function prepare(test, dir, optimized) {
    fs.mkdirSync(dir, { recursive: true });
    const streams = (test.streams || [test]).map(normalize);
    assert(streams.length >= 1 && streams.length <= 2, 'one or two streams required');
    const inputs = streams[0].inputs.length;
    const outputs = streams[0].expected.length;
    const controls = Object.keys(streams[0].controls);
    assert(outputs > 0, 'at least one output required');
    for (const stream of streams) {
        assert.strictEqual(stream.inputs.length, inputs, 'inconsistent input counts');
        assert.strictEqual(stream.expected.length, outputs, 'inconsistent output counts');
        assert.deepStrictEqual(Object.keys(stream.controls), controls, 'inconsistent controls');
    }
    const source = (test.prelude || '') + test.code;
    fs.writeFileSync(path.join(dir, 'source.crm'), source);
    fs.writeFileSync(path.join(dir, 'case.json'), json({ name: test.name, seed: test.seed,
        comparison: test.comparison || { mode: 'exact' }, streams }));
    for (const [name, text] of Object.entries(test.files || {})) {
        const file = path.join(dir, name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text);
    }
    const options = { initial_block_id: 'probe', control_inputs: controls, optimizations: {
        remove_dead_graph: optimized, negative_negative: optimized,
        negative_consts: optimized, unify_consts: optimized,
    } };
    fs.writeFileSync(path.join(dir, 'compiler-options.json'), json(options));
    return { test, dir, streams, source, options, inputs, outputs, controls };
}

function generate(prepared, target) {
    const { source, options, dir } = prepared;
    const reader = util.get_filereader([dir, path.join(__dirname, '../../src')]);
    for (const file of z.compile(source, reader, { ...options, target_language: target })) {
        const dest = path.join(dir, file.path, file.name);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, file.str);
    }
    if (target === 'bw') fs.writeFileSync(path.join(dir, 'probe/src/platform.h'), '#include <stddef.h>\n');
}

function build(prepared, target, config) {
    const { dir, inputs, outputs, controls } = prepared;
    const buildDir = path.join(dir, `${target}-${config.name}`);
    fs.mkdirSync(buildDir);
    const args = Array.from({ length: inputs }, (_, i) => `x[${i}]`)
        .concat(Array.from({ length: outputs }, (_, i) => `y[${i}]`));
    fs.writeFileSync(path.join(buildDir, 'adapter.h'), `#include "${target === 'C' ? 'probe.h' : 'probe/src/probe.h'}"
#define INPUTS ${inputs}
#define OUTPUTS ${outputs}
#define CONTROLS ${controls.length}
static void adapter_process(probe *state, const float **x, float **y, int frames) {
    (void)x; (void)y;
    probe_process(state, ${target === 'C' ? args.join(', ') : 'x, y'}, frames);
}
static void adapter_control(probe *state, int index, float value) {
    ${controls.length ? `static const int ids[] = { ${controls.map(name => 'p_' + name).join(', ')} };
    probe_set_parameter(state, ids[index], value);` : '(void)state; (void)index; (void)value;'}
}
`);
    // Keep a copy with failed builds so the executable can be rebuilt in place.
    fs.copyFileSync(path.join(__dirname, 'native.c'), path.join(buildDir, 'driver.c'));
    run(config.cc, ['-std=c99', ...config.flags,
        '-Werror=implicit-function-declaration', '-Werror=implicit-int', '-I.', '-I..',
        'driver.c', ...(target === 'bw' ? ['../probe/src/probe.c'] : []), '-lm', '-o', 'check'],
    buildDir, 'build');
    return buildDir;
}

function command(step, id, controls) {
    const number = value => Object.is(value, -0) ? '-0' : String(Math.fround(value));
    switch (step.type) {
    case 'rate': return `rate ${id} ${number(step.value)}`;
    case 'control': return `control ${id} ${controls.indexOf(step.name)} ${number(step.value)}`;
    case 'reset': return `reset ${id}`;
    case 'process': return `process ${id} ${step.at} ${step.frames}`;
    default: throw new Error('unknown step');
    }
}

function execute(prepared, buildDir, partition) {
    const { controls, test } = prepared;
    // Use two live instances even for single-stream fixtures, with different
    // storage poison and process boundaries. Explicit streams can differ too.
    const streams = prepared.streams.length === 2 ? prepared.streams : [prepared.streams[0], prepared.streams[0]];
    const dir = path.join(buildDir, partition);
    fs.mkdirSync(dir);
    const layouts = [partition, partition === 'single' ? 'irregular' : 'single'];
    const plans = streams.map((stream, id) => plan(stream, layouts[id]));
    const commands = streams.map((stream, id) => `init ${id} ${stream.frames} ${id ? 90 : 165}`);
    streams.forEach((stream, id) => {
        fs.writeFileSync(path.join(dir, `input-${id}.f32`), encode(stream.inputs, stream.frames));
        fs.writeFileSync(path.join(dir, `expected-${id}.f32`), encode(stream.expected, stream.frames));
    });
    // Interleave instances, then reset and replay without calling init again.
    for (let pass = 0; pass < 2; pass++) {
        for (let step = 0; step < Math.max(...plans.map(p => p.length)); step++)
            plans.forEach((p, id) => { if (p[step]) commands.push(command(p[step], id, controls)); });
        streams.forEach((_, id) => commands.push(`save ${id} ${pass}`));
    }
    fs.writeFileSync(path.join(dir, 'plan.json'), json({ partitions: layouts, plans }));
    fs.writeFileSync(path.join(dir, 'commands.txt'), commands.join('\n') + '\n');
    run(path.join(buildDir, 'check'), ['commands.txt'], dir, 'run', 10000);
    for (let id = 0; id < streams.length; id++) {
        for (let pass = 0; pass < 2; pass++) {
            const stream = streams[id];
            try {
                const actual = decode(fs.readFileSync(path.join(dir, `output-${id}-${pass}.f32`)),
                    stream.expected.length, stream.frames);
                compare(actual, stream.expected, stream.comparison || test.comparison);
            } catch (error) {
                throw new Error(`${partition}, instance ${id}, ${pass ? 'reset replay' : 'first run'}: ${error.message}\nArtifacts: ${dir}`);
            }
        }
    }
}

module.exports = { prepare, generate, build, execute, partitions };
