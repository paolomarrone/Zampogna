#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const z = require('../src/zampogna');
const graph = require('../src/graph');
const outgen = require('../src/outgen');
const { schedule } = require('../src/scheduler');
const phases = require('../src/phases');
const TYPES = require('../src/types');
const bs = require('../src/blocks').BlockTypes;

function compile(code, options = {}, descriptor) {
    return z.compile((descriptor ? 'include external\n' : '') + code,
        name => name == 'external.json' ? JSON.stringify(descriptor) : null, {
            initial_block_id: 'probe', target_language: 'C', debug_last_step: 'schedule',
            debug_return_intermediates: true, ...options,
        });
}

// The same definition has caller-specific phases after materialization.
const code = `y = twice(v) { y = v + v; }
    a, b, c = probe(x, gain) {
        a = twice(gain); b = twice(x);
        c = if(x > 0.0) { c = twice(gain); } else { c = 0.0; };
    }`;
const result = compile(code, { control_inputs: ['gain'] });
const sums = result.graph.blocks.filter(b => bs.SumBlock.isPrototypeOf(b));
assert.deepStrictEqual(sums.map(b => b.phase).sort(), ['audio', 'audio', 'control']);
assert.strictEqual(sums.find(b => b.guard_ports.length).phase, phases.Audio);
for (const b of result.schedule) {
    for (const p of [...b.inputs(), ...b.o_ports]) {
        assert([TYPES.Float32, TYPES.Int32, TYPES.Bool].includes(p.datatype));
        assert.strictEqual(typeof p.phase, 'string');
        assert.strictEqual(Object.getOwnPropertyDescriptor(p, 'datatype').get, undefined);
        assert.strictEqual(Object.getOwnPropertyDescriptor(p, 'phase').get, undefined);
    }
}

// Missing facts are compiler errors, including when formatting the diagnostic.
const invalidType = compile('y = probe(x) { y = x + 1.0; }').graph;
const literal = invalidType.blocks.find(b => bs.ConstantBlock.isPrototypeOf(b));
literal.o_ports[0].datatype = undefined;
assert.throws(() => literal.validate(), /Invalid port datatype/);
assert.throws(() => invalidType.connectTypes(), /Missing source datatype/);
const invalidPhase = compile('y = probe(x) { y = x + 1.0; }');
invalidPhase.schedule.find(b => bs.SumBlock.isPrototypeOf(b)).o_ports[0].phase = 'unknown';
assert.throws(() => outgen.convert(invalidPhase.graph, invalidPhase.schedule, { target_language: 'C' }),
    /unknown execution phase/);

// Analysis is explicit and repeatable, including after rewiring and changing
// controls. It uses the new graph, never facts captured by old connections.
const mutable = compile('a, b = probe(x, gain) { a = x + 1.0; b = gain * 2.0; }', {
    control_inputs: ['gain'],
}).graph;
const add = mutable.blocks.find(b => bs.SumBlock.isPrototypeOf(b));
const gain = mutable.blocks.find(b => b.id == 'gain');
mutable.connections.find(c => c.out == add.i_ports[0]).in = gain.o_ports[0];
mutable.blocks.reverse();
graph.optimize(mutable, { optimizations: {} });
phases.analyze(mutable, schedule(mutable), { control_inputs: ['gain'] });
assert.strictEqual(add.phase, phases.Control);
phases.analyze(mutable, schedule(mutable), { control_inputs: [] });
assert.strictEqual(add.phase, phases.Audio);

// Count metadata reads instead of using a machine-dependent timing assertion.
// Shared paths must cost O(vertices + edges), even for repeated analysis.
for (const levels of [64, 256, 1024]) {
    const chain = 'y = probe(x) { a0 = x;' + Array.from({ length: levels }, (_, i) =>
        `a${i + 1} = a${i} + a${i};`).join('') + `y = a${levels}; }`;
    const { graph: g, schedule: order } = compile(chain, { control_inputs: ['x'] });
    const ports = [g, ...g.blocks].flatMap(b => [...b.inputs(), ...b.o_ports]);
    let reads = 0;
    for (const p of ports) {
        let value = p.phase;
        Object.defineProperty(p, 'phase', {
            get() { reads++; return value; }, set(v) { value = v; },
        });
    }
    for (let i = 0; i < 2; i++) {
        reads = 0;
        phases.analyze(g, order, { control_inputs: ['x'] });
        assert(reads <= 4 * ports.length + g.connections.length, `excessive reads: ${reads}`);
        assert.strictEqual(g.o_ports[0].phase, phases.Control);
    }
    reads = 0;
    for (let i = 0; i < 100; i++) assert.strictEqual(g.o_ports[0].phase, phases.Control);
    assert.strictEqual(reads, 100, 'reading a result must not traverse dependencies');
}

// A rejected current-sample cycle must fail again without leftover visit marks.
const cyclic = compile('y = probe(x) { y = y + x; }', { debug_last_step: 'optimize' }).graph;
for (let i = 0; i < 2; i++) assert.throws(() => schedule(cyclic), /Found loop/);
assert.doesNotThrow(() => compile(`y = probe(x) {
    mem[1] float s; s.init = 0.0; y = s[0]; s[0] = y + x;
}`));

const descriptor = {
    block_name: 'external', header: '',
    block_inputs: [{ type: 'float32' }, { type: 'float32' }],
    block_outputs: Array.from({ length: 4 }, () => ({ type: 'float32' })),
    init: { f_name: 'initialize', f_inputs: ['o0'], f_outputs: [] },
    set_sample_rate: { f_name: 'set_fs', f_inputs: ['i0'], f_outputs: ['o1'] },
    reset_state: { f_name: 'reset', f_inputs: [], f_outputs: ['o2'] },
    process1: { f_name: 'process', f_inputs: ['i1'], f_outputs: ['o3'] },
};
const ffi = compile(`a, b, c, d = probe(x) { a, b, c, d = external(fs, x); }`, {}, descriptor);
const call = ffi.schedule.find(b => bs.CallBlock.isPrototypeOf(b));
assert.deepStrictEqual(call.o_ports.map(p => p.phase), [phases.Init, phases.Fs, phases.Reset, phases.Audio]);
assert.deepStrictEqual(call.callbacks.map(c => c.phase), [phases.Init, phases.Fs, phases.Reset, phases.Audio]);
assert.throws(() => compile('a, b, c, d = probe(x) { a, b, c, d = external(x, x); }', {}, descriptor),
    /set_fs: audio input is unavailable during sample-rate/);
assert.throws(() => compile('a, b, c, d = probe(x) { a, b, c, d = external(fs, x); }', {}, {
    ...descriptor, init: { f_name: 'initialize', f_inputs: ['i1'], f_outputs: ['o0'] },
}), /initialize: audio input is unavailable during init/);
assert.throws(() => compile('a, b, c, d = probe(x) { a, b, c, d = external(fs, x); }', {}, {
    ...descriptor, process1: { f_name: 'process', f_inputs: ['i1', 'o0'], f_outputs: ['o3'] },
}), /written in multiple phases/);
assert.throws(() => compile('a, b, c, d = probe(x) { a, b, c, d = external(fs, x); }', {}, {
    ...descriptor, init: undefined,
}), /has no producer/);

// Validate callback signatures before emission, including pointer output ports.
for (const [callback, error] of [
    [{ f_inputs: ['i1'], f_outputs: ['i3'] }, /invalid output port i3/],
    [{ f_inputs: ['i1'], f_outputs: ['o99'] }, /unknown output port o99/],
    [{ f_inputs: ['i99'], f_outputs: ['o3'] }, /unknown input port/],
    [{ f_inputs: ['o99'], f_outputs: ['o3'] }, /unknown output port o99/],
    [{ f_inputs: ['missing'], f_outputs: ['o3'] }, /unknown argument missing/],
    [{ f_inputs: ['state'], f_outputs: ['o3'] }, /state is not declared/],
    [{ f_inputs: ['coeffs'], f_outputs: ['o3'] }, /coeffs is not declared/],
    [{ f_inputs: ['i1'], f_outputs: ['o2', 'o3'] }, /only one value/],
    [{ f_inputs: null, f_outputs: ['o3'] }, /must be arrays/],
    [{ f_inputs: ['i1'], f_outputs: 'o3' }, /must be arrays/],
]) {
    assert.throws(() => compile('a, b, c, d = probe(x) { a, b, c, d = external(fs, x); }', {}, {
        ...descriptor, process1: { f_name: 'process', ...callback },
    }), error);
}
assert.throws(() => compile('a, b, c, d = probe(x) { a, b, c, d = external(fs, x); }', {}, {
    ...descriptor, process1: undefined,
}), /process1 is required/);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zampogna-phases-'));
try {
    const options = { control_inputs: ['gain'], debug_last_step: 'all' };
    const plain = compile(code, options).files;
    const debug = compile(code, { ...options, debug_mode: true, debug_output_dir: dir }).files;
    assert.deepStrictEqual(debug, plain, 'diagnostics must not change generated code');
    assert(fs.readFileSync(path.join(dir, '05_schedule.txt'), 'utf8').includes('control'));
} finally {
    fs.rmSync(dir, { recursive: true, force: true });
}
console.log('Stored types, execution phases and shared dependencies: passed');
