#!/usr/bin/env node
'use strict';

const assert = require('assert');
const z = require('../src/zampogna');
const bs = require('../src/blocks').BlockTypes;
const TYPES = require('../src/types');
const graph = require('../src/graph');

function compileGraph(code, optimizations, stage = 'optimize') {
    const options = { initial_block_id: 'probe', debug_last_step: stage, debug_return_intermediates: true };
    if (optimizations !== undefined) options.optimizations = optimizations;
    return z.compile(code, null, options).graph;
}
const count = (g, type) => g.blocks.filter(b => type.isPrototypeOf(b)).length;

const doubleNegative = 'y = probe(x) { y = -(-(-(-x))); }';
assert.strictEqual(count(compileGraph(doubleNegative, {}), bs.UminusBlock), 4);
assert.strictEqual(count(compileGraph(doubleNegative), bs.UminusBlock), 0);
assert.strictEqual(count(compileGraph('y = probe(x) { y = float(!(!(x > 0.0))); }'), bs.LogicalNotBlock), 0);
// Removing signed integer negations could hide overflow for INT_MIN.
assert.strictEqual(count(compileGraph('y = probe(x) { y = float(-(-int(x))); }'), bs.UminusBlock), 2);

const negativeConstants = 'y = probe(x) { y = x + -(-(-3.0)); }';
assert.strictEqual(count(compileGraph(negativeConstants, { remove_dead_graph: true, negative_consts: true }), bs.UminusBlock), 0);
for (const expr of ['-(-2147483647 - 1)', '-2147483648']) {
    const g = compileGraph(`y = probe(x) { y = x + float(${expr}); }`, { negative_consts: true });
    assert.strictEqual(count(g, bs.UminusBlock), 1);
}

const constants = compileGraph(`a, b, c, d, e = probe(x) {
    a = 0.0; b = -0.0; c = float(0); d = float(false); e = 0.0;
}`);
const zeros = constants.blocks.filter(b => bs.ConstantBlock.isPrototypeOf(b));
assert.strictEqual(zeros.length, 4);
assert(zeros.some(b => b.datatype === TYPES.Float32 && Object.is(b.value, 0)));
assert(zeros.some(b => b.datatype === TYPES.Float32 && Object.is(b.value, -0)));
assert(zeros.some(b => b.datatype === TYPES.Int32 && b.value === 0));
assert(zeros.some(b => b.datatype === TYPES.Bool && b.value === false));

// A graph producer can have several consumers. Removing -(-x) must preserve
// the shared -x for the other output, even when blocks are in reverse order.
const shared = compileGraph('a, b = probe(x) { a = x; b = -(-x); }', {}, 'flatten');
const minuses = shared.blocks.filter(b => bs.UminusBlock.isPrototypeOf(b));
const inner = minuses.find(b => !bs.UminusBlock.isPrototypeOf(shared.connections.find(c => c.out === b.i_ports[0]).in.block));
const a = shared.blocks.find(b => b.id === 'a');
shared.connections.find(c => c.out === a.i_ports[0]).in = inner.o_ports[0];
shared.blocks.reverse();
graph.optimize(shared, { control_inputs: [], optimizations: { remove_dead_graph: true, negative_negative: true } });
assert.strictEqual(count(shared, bs.UminusBlock), 1);
assert(shared.blocks.includes(inner));
assert.strictEqual(shared.connections.find(c => c.out === a.i_ports[0]).in, inner.o_ports[0]);

const code = `float y = delay(float x) {
    mem[1] float s; s.init = x; y = s[0]; s[0] = x;
}
a, b = probe(x, c) {
    unused = x * 123.0;
    bool gate = c > 0.5;
    a = delay(x);
    b = if(gate) { b = delay(x); } else { b = -1.0; };
}`;

for (const remove_dead_graph of [false, true]) {
    const { graph: g, schedule } = z.compile(code, null, {
        initial_block_id: 'probe', optimizations: { remove_dead_graph },
        debug_last_step: 'schedule', debug_return_intermediates: true,
    });
    assert.strictEqual(g.blocks.some(b => b.id === 'unused'), !remove_dead_graph);
    assert.strictEqual(g.blocks.filter(b => bs.MemoryBlock.isPrototypeOf(b)).length, 2);
    const writers = g.blocks.filter(b => bs.MemoryWriterBlock.isPrototypeOf(b));
    assert.deepStrictEqual(writers.map(b => b.guard_ports.length).sort(), [0, 1]);

    // Every guard is an ordinary, typed dependency whose value precedes its use.
    const blocks = new Set([g, ...g.blocks]);
    for (const c of g.connections) {
        assert(blocks.has(c.in.block) && blocks.has(c.out.block), 'dangling connection');
        assert([...c.out.block.inputs(), ...c.out.block.o_ports].includes(c.out));
    }
    for (const [i, b] of schedule.entries()) {
        for (const p of b.inputs()) {
            const edges = g.connections.filter(c => c.out === p);
            assert.strictEqual(edges.length, 1, 'each input has one source');
            const source = edges[0].in.block;
            assert(source === g || (schedule.indexOf(source) >= 0 && schedule.indexOf(source) < i));
        }
        for (const guard of b.guard_ports) assert.strictEqual(guard.datatype, TYPES.Bool);
        for (const p of b.o_ports) assert.notStrictEqual(p.datatype, TYPES.Generic);
    }
}
console.log('Local optimizations, reachability and scheduling invariants: passed');
