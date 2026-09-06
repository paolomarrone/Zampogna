#!/usr/bin/env node
'use strict';

// Execute generated code: graph shape and successful compilation alone cannot
// detect a delay that accidentally reads the newly written state.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const z = require('../src/zampogna');
const util = require('../src/util');

const delay = `float y = delay(float x) {
    mem[1] float s; y = s[0]; s[0] = x; s.init = x;
}`;
const clock = [0, 1, 0, 1, 1, 0, 0, 1];
const samples = [1, 2, 3, 4, 5, 6, 7, 8];
const sampleRates = [48000, 96000, 48000, 144000, 96000, 48000, 96000, 48000];
const lifecycle = {
    'lifecycle.json': JSON.stringify({
        block_name: 'lifecycle',
        header: `static void lifecycle_init(float *out) { *out = 7.0f; }
            static float lifecycle_fs(float fs) { return fs / 48000.0f; }
            static float lifecycle_reset(void) { return 10.0f; }
            static float lifecycle_process(float x) { return x; }`,
        block_inputs: [{ type: 'float32' }, { type: 'float32' }],
        block_outputs: Array.from({ length: 4 }, () => ({ type: 'float32' })),
        init: { f_name: 'lifecycle_init', f_inputs: ['o0'], f_outputs: [] },
        set_sample_rate: { f_name: 'lifecycle_fs', f_inputs: ['i0'], f_outputs: ['o1'] },
        reset_state: { f_name: 'lifecycle_reset', f_inputs: [], f_outputs: ['o2'] },
        process1: { f_name: 'lifecycle_process', f_inputs: ['i1'], f_outputs: ['o3'] },
    }),
};
const tests = [
    { name: 'reset values combined with changing controls', cOnly: true,
      prefix: 'include lifecycle\n', files: lifecycle,
      code: `a, b = probe(x, gain) {
        boot, frequency, seed, tick = lifecycle(fs, x);
        a = seed + gain; b = boot * 2.0 + frequency + tick;
      }`, controls: { gain: samples }, inputs: [samples],
      expected: [[11, 12, 13, 14, 15, 16, 17, 18], [16, 17, 18, 19, 20, 21, 22, 23]] },
    { name: 'setup results available on first branch activation', cOnly: true,
      prefix: 'include lifecycle\n', files: lifecycle,
      code: `y = probe(x, c) {
        y = if(c > 0.5) {
          boot, frequency, seed, tick = lifecycle(fs, x);
          y = boot * 2.0 + frequency + seed + tick;
        } else { y = -1.0; };
      }`, inputs: [samples, clock], expected: [[-1, 27, -1, 29, 30, -1, -1, 33]] },
    { name: 'reset values combined with changing sample rate', cOnly: true,
      prefix: 'include lifecycle\n', files: lifecycle, sampleRates,
      code: `y = probe(x) {
        boot, frequency, seed, tick = lifecycle(fs, x);
        y = seed + frequency + boot + tick;
      }`, inputs: [samples], expected: [[19, 21, 21, 24, 24, 24, 26, 26]] },
    { name: 'reset initializer snapshots mixed setup phases', cOnly: true,
      prefix: 'include seeded\n', sampleRates,
      files: { 'seeded.json': JSON.stringify({
        block_name: 'seeded', state: 'seeded_state',
        header: `typedef struct { float n; } seeded_state;
          static float seeded_reset(seeded_state *s) { return s->n = 10.0f; }
          static float seeded_process(seeded_state *s, float x) { return s->n += x; }`,
        block_inputs: [{ type: 'float32' }],
        block_outputs: [{ type: 'float32' }, { type: 'float32' }],
        reset_state: { f_name: 'seeded_reset', f_inputs: ['state'], f_outputs: ['o0'] },
        process1: { f_name: 'seeded_process', f_inputs: ['state', 'i0'], f_outputs: ['o1'] },
        wrapper: ['y = seeded_wrapper(x) { y.init, y = seeded(x); }'],
      }) }, code: `y = probe(x) { t = seeded_wrapper(x); y = delay(t + fs / 48000.0); }`,
      inputs: [samples], expected: [[11, 12, 15, 17, 23, 27, 32, 40]] },
    { name: 'typed overloads with different output counts in branches',
      code: `y = choose(float v) { y = v + 100.0; }
      a, b = choose(int v) { a = float(v); b = float(v) + 10.0; }
      a, b = probe(x, c) {
        a, b = if(c > 0.5) { a, b = choose(int(x)); }
        else { a = choose(x); b = -1.0; };
      }`, inputs: [samples, clock],
      expected: [[101, 2, 103, 4, 5, 106, 107, 8], [-1, 12, -1, 14, 15, -1, -1, 18]] },
    { name: 'branch outputs inherit integer and boolean declarations',
      code: `int selected = choose(float x) {
        selected = if(x > 2.0) { selected = int(x); }
          else if(x > 0.0) { selected = 1; } else { selected = 0; };
      }
      bool gate = flag(float x) {
        gate = if(x > 1.0) { gate = true; } else { gate = false; };
      }
      a, b = probe(x) { a = float(choose(x)); b = float(flag(x)); }`,
      inputs: [[-2, 0, 1, 2, 3]], expected: [[0, 0, 1, 1, 3], [0, 0, 0, 1, 1]] },
    { name: 'nested captures belong to their parent instance',
      code: `y = parent(v) {
        t = v * 10.0;
        y = child() { y = delay(t); }
        y = child();
      }
      a, b = probe(x, c) {
        a = parent(x);
        b = if(c > 0.5) { b = parent(x + 100.0); } else { b = -1.0; };
      }`, inputs: [samples, clock],
      expected: [[0, 10, 20, 30, 40, 50, 60, 70], [-1, 1000, -1, 1020, 1040, -1, -1, 1050]] },
    { name: 'lexical calls and captures survive caller shadowing',
      code: `y = helper(v) { y = delay(v); }
      a, b = probe(x, c) {
        t = x * 10.0;
        y = captured() { y = helper(t); }
        a = captured();
        b = if(c > 0.5) {
          t = x + 100.0;
          y = helper(v) { y = v + 1.0; }
          b = captured() + helper(t);
        } else { b = -1.0; };
      }`, inputs: [samples, clock],
      expected: [[0, 10, 20, 30, 40, 50, 60, 70], [-1, 103, -1, 125, 146, -1, -1, 159]] },
    { name: 'external overloads resolve from argument types',
      prefix: 'include choose_float\ninclude choose_int\n', cOnly: true,
      files: {
        'choose_float.json': JSON.stringify({
          block_name: 'choose_c', header: 'static float choose_float(float x) { return x + 100.0f; }',
          block_inputs: [{ type: 'float32' }], block_outputs: [{ type: 'float32' }],
          process1: { f_name: 'choose_float', f_inputs: ['i0'], f_outputs: ['o0'] },
        }),
        'choose_int.json': JSON.stringify({
          block_name: 'choose_c', header: 'static float choose_int(int x, float *b) { *b = x + 10.0f; return x; }',
          block_inputs: [{ type: 'int32' }], block_outputs: [{ type: 'float32' }, { type: 'float32' }],
          process1: { f_name: 'choose_int', f_inputs: ['i0', 'o1'], f_outputs: ['o0'] },
        }),
      }, code: `a, b = probe(x) { a = choose_c(x); l, r = choose_c(int(x)); b = l + r; }`,
      inputs: [samples], expected: [[101, 102, 103, 104, 105, 106, 107, 108], [12, 14, 16, 18, 20, 22, 24, 26]] },
    { name: 'shared inner negation and repeated constants',
      code: `a, b = probe(x, c) {
        a, b = if(c > 0.5) {
          a = -x; b = -(-x) + -(-(-3.0));
        } else { a = -(-x); b = -3.0; };
      }`, inputs: [samples, clock],
      expected: [[1, -2, 3, -4, -5, 6, 7, -8], [-3, -1, -3, 1, 2, -3, -3, 5]] },
    { name: 'constant and runtime signed zero',
      code: `a, b = probe(x, c) {
        a, b = if(c > 0.5) { a = -0.0; b = -(-x); }
        else { a = 0.0; b = -(-x); };
      }`, inputs: [[-0.0, 0.0, -0.0, 0.0], [1, 1, 0, 0]],
      expected: [[-0.0, -0.0, 0.0, 0.0], [-0.0, 0.0, -0.0, 0.0]] },
    { name: 'integer and boolean negation in branches',
      code: `a, b = probe(x, c) {
        bool gate = !(!(c > 0.5));
        a, b = if(gate) { a = float(-(-int(x))); b = float(-(-123)); }
        else { a = float(-(-(-int(x)))); b = float(-123); };
      }`, inputs: [[7, -7, 9, -9], [1, 1, 0, 0]],
      expected: [[7, -7, -9, 9], [123, 123, -123, -123]] },
    { name: 'decimator example', noDelay: true,
      code: fs.readFileSync(path.join(__dirname, '../examples/decimator/decimator.crm'), 'utf8')
        + '\ny = probe(x, bypass) { y = decimator(x, bypass); }',
      inputs: [samples, [0, 0, 1, 0, 0, 1, 0, 0]], expected: [[1, 1, 3, 4, 4, 6, 7, 7]] },
    { name: 'bypass filter example', noDelay: true,
      code: fs.readFileSync(path.join(__dirname, '../examples/lp1_bypass/lp1_bypass.crm'), 'utf8')
        + '\ny = probe(x, bypass) { y = lp1_bypass(x, bypass); }',
      inputs: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [0, 0, 1, 1, 0, 0, 0, 1, 1, 0]],
      expected: [[0.115748279538573, 0.333847174399580, 3, 4, 4.115748279538574,
        4.333847174399581, 4.642449776949734, 8, 9, 9.115748279538574]] },
    { name: 'external reset result initializes branch memory', prefix: 'include seeded\n', cOnly: true,
      files: { 'seeded.json': JSON.stringify({
        header: '#include "seeded.h"', block_name: 'seeded',
        block_inputs: [{ type: 'float32' }],
        block_outputs: [{ type: 'float32' }, { type: 'float32' }],
        state: 'seeded_state',
        reset_state: { f_name: 'seeded_reset', f_inputs: ['state'], f_outputs: ['o0'] },
        process1: { f_name: 'seeded_process', f_inputs: ['state', 'i0'], f_outputs: ['o1'] },
        wrapper: ['y = seeded_wrapper(x) { y.init, y = seeded(x); }'],
      }), 'seeded.h': `typedef struct { float n; } seeded_state;
        static float seeded_reset(seeded_state *s) { return s->n = 10.0f; }
        static float seeded_process(seeded_state *s, float x) { return s->n += x; }`,
      }, code: `y = probe(x, c) { y = if(c > 0.5) {
        t = seeded_wrapper(x); y = delay(t + 1.0);
      } else { y = -1.0; }; }`, inputs: [samples, clock],
      expected: [[-1, 11, -1, 13, 17, -1, -1, 22]] },
    { name: 'builtin delay line in branch', noDelay: true, prefix: 'include builtin\n',
      code: `a, b = probe(x, c) { a = delay(x, 3);
        b = if(c > 0.5) { b = delay(x, 2); } else { b = -1.0; };
      }`, inputs: [samples, clock],
      expected: [[0, 0, 0, 1, 2, 3, 4, 5], [-1, 0, -1, 0, 2, -1, -1, 4]] },
    { name: 'integer arithmetic in branch', code: `y = probe(x) {
        y = if(x != 0.0) { y = float(12 / int(x) + int(x) % 3); }
        else { y = 0.0; };
      }`, inputs: [[0, 7, -7, 5, -5]], expected: [[0, 2, -2, 4, -4]] },
    { name: 'branch with control coefficients', code: `y = probe(x, c, gain) {
        y = if(c > 0.5) { scaled = gain * 2.0; y = delay(x) + scaled; }
        else { y = -1.0; };
      }`, controls: { gain: 3 }, inputs: [samples, clock],
      expected: [[-1, 6, -1, 8, 10, -1, -1, 11]] },
    { name: 'sample-rate initializer inside branch', code: `y = probe(x, c) {
        y = if(c > 0.5) { y = delay(y) + x; y.init = fs / 48000.0; }
        else { y = -1.0; };
      }`, inputs: [samples, clock], expected: [[-1, 3, -1, 7, 12, -1, -1, 20]] },
    { name: 'control changes while branch inactive', cOnly: true,
      code: `y = probe(x, c, gain) {
        y = if(c > 0.5) { y = delay(gain) + x * gain; } else { y = -1.0; };
      }`, controls: { gain: [1, 2, 3, 4, 5, 6, 7, 8] }, inputs: [samples, clock],
      expected: [[-1, 4, -1, 18, 29, -1, -1, 69]] },
    { name: 'else-if conditions are guarded', code: `y = probe(x) {
        y = if(x < 0.5) { y = -1.0; }
        else if(12 / int(x) > 3) { y = delay(x); } else { y = -2.0; };
      }`, inputs: [[0, 2, 4, 0, 3, 2]], expected: [[-1, 0, -2, -1, 2, 3]] },
    { name: 'ternary branch clocks', code: `y = probe(x, c) {
        y = c > 0.5 ? delay(x) : -1.0;
      }`, inputs: [samples, clock], expected: [[-1, 0, -1, 2, 4, -1, -1, 5]] },
    { name: 'boolean and integer ternaries', code: `a, b = probe(x) {
        bool gate = x > 0.5 ? true : false;
        int v = gate ? 12 / int(x) : -1;
        a = float(gate); b = float(v);
      }`, inputs: [[0, 2, 3]], expected: [[0, 1, 1], [-1, 6, 4]] },
    { name: 'external C branch clock and callback order', prefix: 'include tick\n', cOnly: true,
      files: { 'tick.json': JSON.stringify({
        header: '#include "tick.h"', block_name: 'tick',
        block_inputs: [{ type: 'float32', isParameter: true, name: 'step' }],
        block_outputs: [{ type: 'float32', updaterate: 'audio' }],
        state: 'tick_state', coeffs: 'tick_coeffs', prefix: 'tick',
        reset_state: { f_name: 'tick_reset', f_inputs: ['state'], f_outputs: [] },
        update_coeffs_ctrl: { f_name: 'tick_ctrl', f_inputs: ['coeffs'], f_outputs: [] },
        update_coeffs_audio: { f_name: 'tick_audio', f_inputs: ['coeffs'], f_outputs: [] },
        process1: { f_name: 'tick_process', f_inputs: ['coeffs', 'state'], f_outputs: ['o0'] },
      }), 'tick.h': `typedef struct { float n; } tick_state;
        typedef struct { float step, ctrl, audio; } tick_coeffs;
        static void tick_reset(tick_state *s) { s->n = 0; }
        static void tick_set_step(tick_coeffs *c, float step) { c->step = step; }
        static void tick_ctrl(tick_coeffs *c) { c->ctrl = c->step; }
        static void tick_audio(tick_coeffs *c) { c->audio = c->ctrl; }
        static float tick_process(tick_coeffs *c, tick_state *s) { return s->n += c->audio; }`,
      }, code: `y = probe(x, c) { y = if(c > 0.5) { y = tick(x + 1.0); }
        else { y = -1.0; }; }`, inputs: [samples, clock], expected: [[-1, 3, -1, 8, 14, -1, -1, 23]] },
    { name: 'single delay', code: 'y = probe(x) { y = delay(x); }',
      inputs: [samples], expected: [[0, 1, 2, 3, 4, 5, 6, 7]] },
    { name: 'chained delays', code: 'y = probe(x) { y = delay(delay(x)); }',
      inputs: [samples], expected: [[0, 0, 1, 2, 3, 4, 5, 6]] },
    { name: 'captured input, independent clocks', code: `a, b = probe(x, c) {
        a = delay(x);
        b = if(c > 0.5) { b = delay(x); } else { b = -1.0; };
      }`, inputs: [samples, clock],
      expected: [[0, 1, 2, 3, 4, 5, 6, 7], [-1, 0, -1, 2, 4, -1, -1, 5]] },
    { name: 'named condition', code: `y = probe(x, c) {
        bool gate = c > 0.5;
        y = if(gate) { y = delay(x); } else { y = -1.0; };
      }`, inputs: [samples, clock], expected: [[-1, 0, -1, 2, 4, -1, -1, 5]] },
    ...['y', 'a'].map(id => ({ name: 'local counter named ' + id,
      code: `y = probe(c) { ${id} = if(c > 0.5) {
          ${id} = delay(${id}) + 1.0; ${id}.init = 0.0;
        } else { ${id} = 0.0; }; ${id === 'y' ? '' : 'y = a;'} }`,
      inputs: [clock], expected: [[0, 1, 0, 2, 3, 0, 0, 4]] })),
    { name: 'captured feedback', code: `y = probe(c) {
        t = y; t.init = 0.0;
        y = if(c > 0.5) { y = delay(t) + 1.0; } else { y = 0.0; };
      }`, inputs: [clock], expected: [[0, 1, 0, 2, 3, 0, 0, 4]] },
    { name: 'independent calls and initializers', code: `y = counter(c, seed) {
        y = if(c > 0.5) { y = delay(y) + 1.0; } else { y = 0.0; };
        y.init = seed;
      }
      a, b = probe(c) { a = counter(c, 0.0); b = counter(c, 100.0); }`,
      inputs: [clock], expected: [[0, 1, 0, 2, 3, 0, 0, 4], [0, 101, 0, 102, 103, 0, 0, 104]] },
    { name: 'nested selection', code: `y = probe(x, c, d) {
        y = if(c > 0.5) {
          y = if(d > 0.5) { y = x + 10.0; } else { y = x + 20.0; };
        } else { y = x + 30.0; };
      }`, inputs: [samples, clock, [0, 0, 1, 1, 0, 1, 0, 1]],
      expected: [[31, 22, 33, 14, 25, 36, 37, 18]] },
    { name: 'nested delay clock', code: `y = probe(x, c, d) {
        y = if(c > 0.5) {
          y = if(d > 0.5) { y = delay(x); } else { y = -2.0; };
        } else { y = -1.0; };
      }`, inputs: [samples, clock, [0, 0, 1, 1, 0, 1, 0, 1]],
      expected: [[-1, -2, -1, 0, -2, -1, -1, 4]] },
    { name: 'multiple outputs', code: `y = probe(x, c) {
        a, b = if(c > 0.5) { a = x + 1.0; b = x + 2.0; }
          else { a = x - 1.0; b = x - 2.0; }; y = a + b;
      }`, inputs: [samples, clock], expected: [[-1, 7, 3, 11, 13, 9, 11, 19]] },
    { name: 'inactive integer division', code: `y = probe(x, c) {
        y = if(c > 0.5) { int v = 12 / int(x); y = float(v * v); }
          else { y = 0.0; };
      }`, inputs: [[0, 2, 0, 3], [0, 1, 0, 1]], expected: [[0, 36, 0, 16]] },
    { name: 'simultaneous writes', code: `a, b = probe(x) {
        mem[2] float s; s.init = 0.0;
        a = s[0]; b = s[1]; s[0] = s[1] + x; s[1] = s[0] + 10.0;
      }`, inputs: [[1, 2, 3, 4]], expected: [[0, 1, 12, 14], [0, 10, 11, 22]] },
    { name: 'write index uses old state', code: `y = probe(x) {
        mem[1] int index; index.init = 0;
        mem[2] float data; data.init = 0.0;
        y = data[index[0]]; index[0] = 1 - index[0]; data[index[0]] = x;
      }`, inputs: [samples], expected: [[0, 0, 1, 2, 3, 4, 5, 6]] },
    { name: 'arithmetic parentheses', code: 'y = probe(x, z, w) { y = (x + z) * w; }',
      inputs: [[1, 2], [3, 4], [10, 20]], expected: [[40, 120]] },
    { name: 'numeric casts', code: 'a, b = probe(x) { a = float(bool(x)); b = float(int(x)); }',
      inputs: [[0.5, 2.9, 0, -2.9]], expected: [[1, 1, 0, 1], [0, 2, 0, -2]] },
    { name: 'branch initializer expression', code: `y = probe(x, c) {
        y = if(c > 0.5) { seed = 2.0 + 3.0;
          y = delay(y) + x; y.init = seed;
        } else { y = -1.0; };
      }`, inputs: [samples, clock], expected: [[-1, 7, -1, 11, 16, -1, -1, 24]] },
    { name: 'branch memory size expression', code: `y = probe(x, c) {
        y = if(c > 0.5) { int n = 1 + 1; mem[n] float s;
          s.init = 0.0; y = s[1]; s[1] = s[0]; s[0] = x;
        } else { y = -1.0; };
      }`, inputs: [samples, clock], expected: [[-1, 0, -1, 0, 2, -1, -1, 4]] },
    { name: 'boolean delayed condition', code: `bool y = delay(bool x) {
        mem[1] bool s; s.init = x; y = s[0]; s[0] = x;
      }
      y = probe(x) { bool gate = delay(x > 0.5);
        y = if(gate) { y = 1.0; } else { y = 0.0; };
      }`, inputs: [clock], expected: [[0, 0, 1, 0, 1, 1, 0, 0]] },
];

const outdir = path.join(__dirname, 'output', 'semantics');
fs.mkdirSync(outdir, { recursive: true });
const matlabChecks = [];
let passed = 0;
let bwPassed = 0;
const literal = value => Object.is(value, -0) ? '-0.0' : String(value);
for (const [i, t] of tests.entries()) {
    for (const optimized of [false, true]) {
        const dir = path.join(outdir, i + '_' + optimized);
        fs.mkdirSync(dir, { recursive: true });
        const controls = Object.entries(t.controls || {});
        const options = { initial_block_id: 'probe', optimizations: {
            remove_dead_graph: optimized, negative_negative: optimized,
            negative_consts: optimized, unify_consts: optimized,
        },
            control_inputs: controls.map(([name]) => name) };
        const reader = util.get_filereader([dir, path.join(__dirname, '..', 'src')]);
        try {
            for (const [name, content] of Object.entries(t.files || {}))
                fs.writeFileSync(path.join(dir, name), content);
            // The existing VST wrapper supports only mono/stereo audio buses.
            const hasBw = t.inputs.length <= 2 && t.expected.length <= 2;
            const targets = ['C', ...(hasBw ? ['bw'] : []), ...(t.cOnly ? [] : ['MATLAB'])];
            for (const target_language of targets) {
                for (const f of z.compile((t.prefix || '') + (t.noDelay ? '' : delay) + '\n' + t.code, reader, { ...options, target_language })) {
                    const dest = path.join(dir, f.path);
                    fs.mkdirSync(dest, { recursive: true });
                    fs.writeFileSync(path.join(dest, f.name), f.str);
                }
            }
            const n = t.inputs[0].length;
            const inputs = t.inputs.map((v, j) => `float x${j}[] = {${v.map(literal).join(',')}};`).join('\n');
            const outputs = t.expected.map((_, j) => `float y${j}[${n}];`).join('\n');
            const args = offset => t.inputs.map((_, j) => `x${j} + ${offset}`)
                .concat(t.expected.map((_, j) => `y${j} + ${offset}`)).join(', ');
            const checks = t.expected.map((v, j) => v.map((e, k) =>
                `if (!(fabsf(y${j}[${k}] - (${literal(e)})) < 0.0001f)${e === 0 ? ` || !!signbit(y${j}[${k}]) != ${Object.is(e, -0) ? 1 : 0}` : ''}) { fprintf(stderr, "output ${j} sample ${k}: %g, expected ${literal(e)}\\n", y${j}[${k}]); return 1; }`).join('\n')).join('\n');
            const setters = k => controls.map(([name, value]) =>
                `probe_set_parameter(&instance, p_${name}, ${Array.isArray(value) ? `control_${name}[${k}]` : value});`).join('\n');
            const step = `for (int k = 0; k < ${n}; k++) {
                ${setters('k')}
                ${t.sampleRates ? 'probe_set_sample_rate(&instance, sample_rates[k]);' : ''}
                run(&instance, ${args('k')}, 1);
            }`;
            // Check a full buffer, then reset and repeat across process calls.
            fs.writeFileSync(path.join(dir, 'main.c'), `#include <math.h>
#include <stdio.h>
#ifdef BRICKWORKS
#include "probe/src/probe.h"
static void run(probe *instance, ${t.inputs.map((_, j) => `const float *x${j}`).concat(t.expected.map((_, j) => `float *y${j}`)).join(', ')}, int n) {
    const float *x[] = {${t.inputs.map((_, j) => 'x' + j).join(', ')}};
    float *y[] = {${t.expected.map((_, j) => 'y' + j).join(', ')}};
    probe_process(instance, x, y, n);
}
#else
#include "probe.h"
#define run probe_process
#endif
int main(void) {
    probe instance = {0}; probe_init(&instance); probe_set_sample_rate(&instance, 48000);
    ${inputs}\n${outputs}
    ${t.sampleRates ? `float sample_rates[] = {${t.sampleRates.join(',')}};` : ''}
    ${controls.filter(([, v]) => Array.isArray(v)).map(([name, v]) => `float control_${name}[] = {${v.join(',')}};`).join('\n')}
    ${setters(0)}
    probe_reset(&instance);
    ${t.sampleRates || controls.some(([, v]) => Array.isArray(v)) ? step : `run(&instance, ${args(0)}, ${n});`}
    ${checks}
    probe_reset(&instance);
    ${step}
    ${checks}
    return 0;
}`);
            if (hasBw) fs.writeFileSync(path.join(dir, 'probe/src/platform.h'), '#include <stddef.h>\n');
            for (const extra of [[], ...(hasBw ? [['-DBRICKWORKS', 'probe/src/probe.c']] : [])]) {
                cp.execFileSync('cc', ['-std=c99', '-O0', '-fsanitize=undefined', '-fsanitize-undefined-trap-on-error',
                    '-Werror=implicit-function-declaration', '-Werror=implicit-int', '-I.',
                    'main.c', ...extra, '-lm', '-o', 'check'], { cwd: dir, stdio: 'pipe' });
                cp.execFileSync(path.join(dir, 'check'), [], { stdio: 'pipe' });
            }
            if (!t.cOnly) matlabChecks.push(`addpath('${dir}'); clear probe;`,
                ...t.inputs.map((v, j) => `x${j} = [${v.map(literal).join(' ')}];`),
                `[${t.expected.map((_, j) => 'y' + j).join(', ')}] = probe(${t.inputs.map((_, j) => 'x' + j).join(', ')}, 48000${controls.map(([, v]) => ', ' + v).join('')});`,
                ...t.expected.flatMap((v, j) => [
                    `expected = [${v.map(literal).join(' ')}];`,
                    `assert(max(abs(y${j} - expected)) < 1e-10, '${t.name}');`,
                    `assert(isequal(1 ./ y${j}(expected == 0), 1 ./ expected(expected == 0)), '${t.name}: signed zero');`,
                ]),
                `rmpath('${dir}');`);
            passed++;
            if (hasBw) bwPassed++;
        } catch (e) {
            console.error(`${t.name} (optimized=${optimized}):`, e.stack,
                e.stderr ? String(e.stderr) : '');
            process.exitCode = 1;
        }
    }
}
console.log(`Native C semantics: ${passed}/${tests.length * 2}; Brickworks: ${bwPassed} passed (UBSan enabled)`);
const script = path.join(outdir, 'check.m');
fs.writeFileSync(script, matlabChecks.join('\n') + '\n');
cp.execFileSync('octave', ['--quiet', '--no-gui', script], { stdio: 'inherit' });
assert.strictEqual(passed, tests.length * 2);
console.log(`MATLAB/Octave semantics: ${tests.filter(t => !t.cOnly).length * 2} passed`);
