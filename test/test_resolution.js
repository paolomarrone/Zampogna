#!/usr/bin/env node
'use strict';

const assert = require('assert');
const z = require('../src/zampogna');
const graph = require('../src/graph');
const syntax = require('../src/syntax');
const TYPES = require('../src/types');
const bs = require('../src/blocks').BlockTypes;

function analyze(code, descriptors = []) {
    const includes = descriptors.map((_, i) => 'include external' + i + '\n').join('');
    return z.compile(includes + code, name => {
        const match = /^external(\d+)\.json$/.exec(name);
        return match ? JSON.stringify(descriptors[Number(match[1])]) : null;
    }, {
        initial_block_id: 'probe', debug_last_step: 'syntax',
        debug_return_intermediates: true,
    }).AST;
}

for (const definitions of [
    'y = f(x) { y = x; } y = f(float x) { y = x; }',
    'y = f(float x) { y = x; } y = f(x) { y = x; }',
]) {
    assert.throws(() => analyze(definitions), /Block definitions conflict/);
}

const overloads = [
    'y = f(float x) { y = x; }',
    'a, b = f(int x) { a = float(x); b = float(x) + 1.0; }',
];
for (const definitions of [overloads, overloads.slice().reverse()]) {
    const code = definitions.join('\n') + '\ny = probe(x) { a, b = f(int(x)); y = a + b; }';
    assert.doesNotThrow(() => z.compile(code, null, { initial_block_id: 'probe', target_language: 'C' }));
    const ast = analyze(code);
    const call = ast.statements[2].statements[0].expr;
    const callee = ast.statements.find(s => s.inputs[0].symbol.datatype === TYPES.Int32);
    assert.strictEqual(call.symbol, callee.symbol);
    assert.deepStrictEqual(call.result_types, [TYPES.Float32, TYPES.Float32]);
}

// A signature is selected by input types. Output count is checked afterwards,
// including when a closer definition has the same inputs but different outputs.
assert.throws(() => analyze(overloads.join('\n') + '\ny = probe(x) { y = f(int(x)); }'), /Number of outputs/);
assert.throws(() => analyze(`a, b = f(x) { a = x; b = x; }
    y = probe(x) { y = f(x) { y = x; } a, b = f(x); y = a + b; }`), /Number of outputs/);
assert.throws(() => analyze('y = f(x) { y = x; } a, b = f(float x) { a = x; b = x; }'), /Block definitions conflict/);

// All signatures and variable declarations exist before bodies are resolved.
const forward = analyze(`y = probe(x) { y = choose(convert(x)); }
    y = choose(int v) { y = float(v); }
    int y = convert(float v) { y = int(v); }`);
const nestedCall = forward.statements[0].statements[0].expr;
assert.strictEqual(nestedCall.symbol, forward.statements[1].symbol);
assert.strictEqual(nestedCall.args[0].symbol, forward.statements[2].symbol);
assert.deepStrictEqual(nestedCall.args[0].result_types, [TYPES.Int32]);

const lexical = analyze(`y = f(float x) { y = x; }
    y = probe(x) {
        y = child() { y = f(t); }
        y = f(int x) { y = float(x); }
        t = x + 1.0;
        y = child();
    }`);
const parent = lexical.statements[1];
const capturedCall = parent.statements[0].statements[0].expr;
assert.strictEqual(capturedCall.symbol, lexical.statements[0].symbol);
assert.strictEqual(capturedCall.args[0].symbol, parent.statements[2].outputs[0].symbol);

const shadow = analyze(`y = f(x) { y = x; }
    y = probe(x) { y = f(x) { y = x + 1.0; } y = f(x); }`);
assert.strictEqual(shadow.statements[1].statements[1].expr.symbol, shadow.statements[1].statements[0].symbol);
assert.throws(() => analyze('y = f(x) { y = x; } y = probe(x) { f = x; y = f(x); }'), /not callable/);

// Branch outputs have their own declarations and inherit the enclosing type,
// even when the assignment does not repeat the output's declared type.
const branchAST = analyze(`int y = select(float x) {
    y = if(x > 1.0) { y = int(x); }
        else if(x > 0.0) { y = 1; } else { y = 0; };
}`);
const definition = branchAST.statements[0];
const assignment = definition.statements[0];
const branches = assignment.expr.branches;
assert.strictEqual(assignment.outputs[0].symbol, definition.outputs[0].symbol);
assert.strictEqual(new Set([definition.outputs[0].symbol, ...branches.map(b => b.outputs[0].symbol)]).size, 4);
for (const branch of branches) {
    assert.strictEqual(branch.outputs[0].symbol.datatype, TYPES.Int32);
    assert.strictEqual(branch.block.statements[0].outputs[0].symbol, branch.outputs[0].symbol);
}
assert.strictEqual(definition.outputs[0].assigned, undefined);
assert.doesNotThrow(() => syntax.validateAST(branchAST));
assert.throws(() => analyze('y = probe(x) { y = if(x > 0.0) { y = x; } else { t = x; }; }'), /Output not assigned/);

const captures = analyze(`y = probe(x) {
    mem[1] float state; state.init = 0.0; state[0] = x;
    y = child() { y = state[0] + x; }
    y = child();
}`);
const body = captures.statements[0];
const capturedExpression = body.statements[3].statements[0].expr;
assert.strictEqual(capturedExpression.args[0].symbol, body.statements[0].symbol);
assert.strictEqual(capturedExpression.args[1].symbol, body.inputs[0].symbol);

// Graph construction consumes symbol references, not the spelling of uses.
capturedExpression.args[0].id = 'unresolved_memory_spelling';
capturedExpression.args[1].id = 'unresolved_variable_spelling';
body.statements[4].expr.id = 'unresolved_call_spelling';
const g = graph.ASTToGraph(captures, {});
const probe = g.bdefs[0];
const child = probe.bdefs[0];
const memory = probe.blocks.find(b => bs.MemoryBlock.isPrototypeOf(b));
assert.strictEqual(child.blocks.find(b => bs.MemoryReaderBlock.isPrototypeOf(b)).memoryblock, memory);
assert.strictEqual(probe.blocks.find(b => bs.CallBlock.isPrototypeOf(b)).ref, child);

const external = {
    block_name: 'external_call', header: '',
    block_inputs: [{ type: 'int32' }],
    block_outputs: [{ type: 'int32' }, { type: 'bool' }],
};
const externalAST = analyze(`y = probe(x) {
    int value, bool gate = external_call(int(x));
    y = gate ? float(value) : x;
}`, [external]);
assert.strictEqual(externalAST.statements[0].statements[0].expr.symbol, externalAST.externals[0]);
const externalGraph = graph.ASTToGraph(externalAST, {});
assert.strictEqual(externalGraph.bdefs[0].blocks.find(b => bs.CallBlock.isPrototypeOf(b)).ref, externalGraph.cdefs[0]);
assert.throws(() => analyze('y = probe(x) { y = unknown(x); }'), /No matching block definition/);
assert.throws(() => analyze('y = probe(x) { int a, bool b = external_call(x); y = x; }', [external]), /No matching block definition/);

for (const [code, error] of [
    ['y = probe(x) { y = float(1, 2); }', /arity/],
    ['y = probe(x) { y = x + 1; }', /Type mismatch/],
    ['y = probe(x) { y = int(x); }', /Type mismatch/],
    ['y = probe(x) { y = (float x).init; }', /Unexpected type declaration/],
    ['y = probe(x) { y = missing; }', /Unknown identifier/],
    ['y = probe(x) { mem[1] float m; m.init = 0.0; y = m[x]; }', /memory index/],
    ['y = probe(x, x) { y = x; }', /already declared/],
    ['y, y = probe(x) { y = x; }', /already declared/],
]) assert.throws(() => analyze(code), error);

for (const code of [
    'y = probe(x) { y = probe(x); }',
    'y = probe(x) { y = f(x); } y = f(x) { y = probe(x); }',
]) assert.throws(() => z.compile(code, null, { initial_block_id: 'probe', target_language: 'C' }), /Recursive block calls/);

const typed = analyze(`int y = probe(float x) { y = ~(int(x) + 1); }`);
assert.deepStrictEqual(typed.statements[0].statements[0].expr.result_types, [TYPES.Int32]);
assert.doesNotThrow(() => graph.ASTToGraph(typed, {}));

console.log('Name and type resolution: passed');
