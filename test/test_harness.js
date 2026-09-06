#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { encode, decode, compare } = require('./support/streams');
const { normalize, plan } = require('./support/timeline');
const { run, available } = require('./support/process');
const native = require('./support/native');

// Known bytes establish endian and channel order independently of the decoder.
assert.strictEqual(encode([[1, -0], [-2, Infinity]], 2).toString('hex'),
    '0000803f00000080000000c00000807f');
const special = [[NaN, Infinity, -Infinity, -0, 0, 2 ** -149]];
compare(decode(encode(special, 6), 1, 6), special);
assert.throws(() => decode(Buffer.alloc(3), 1, 1), /byte count/);
assert.throws(() => decode(Buffer.alloc(8), 1, 1), /byte count/);
assert.throws(() => encode([[1]], 2), /frame count/);
assert.throws(() => compare([[0]], [[1e-6]]), /sample 0/);
assert.throws(() => compare([[-0]], [[0]]), /got -0, expected 0/);
assert.throws(() => compare([[NaN]], [[0]]), /sample 0/);
assert.throws(() => compare([[Infinity]], [[-Infinity]]), /sample 0/);
assert.throws(() => compare([[1]], [[1, 2]]), /frame count/);
assert.throws(() => compare([], [[1]]), /channel count/);
const tolerance = { mode: 'tolerance', absolute: 1e-8, relative: 1e-6 };
compare([[1.0000001]], [[1]], tolerance);
assert.throws(() => compare([[0]], [[1e-6]], tolerance), /sample 0/);
assert.throws(() => compare([[NaN]], [[1]], tolerance), /sample 0/);
assert.throws(() => compare([[Infinity]], [[1]], tolerance), /sample 0/);
assert.throws(() => compare([[-0]], [[0]], tolerance), /sample 0/);
assert.throws(() => compare([[1]], [[1]], { mode: 'tolerance', absolute: NaN }), /tolerance/);

const stream = normalize({ inputs: [[0, 0, 0, 0, 0, 0, 0, 0]], expected: [[0, 0, 0, 0, 0, 0, 0, 0]],
    controls: { gain: 1 }, events: [
        { at: 2, type: 'control', name: 'gain', value: 3 },
        { at: 5, type: 'reset' }, { at: 5, type: 'rate', value: 96000 },
        { at: 8, type: 'reset' },
    ] });
assert.deepStrictEqual(plan(stream, 'whole').filter(s => s.type === 'process'), [
    { type: 'process', at: 0, frames: 2 }, { type: 'process', at: 2, frames: 3 }, { type: 'process', at: 5, frames: 3 },
]);
for (const layout of ['whole', 'single', 'fixed', 'irregular']) {
    const steps = plan(stream, layout);
    assert.deepStrictEqual(steps.filter(s => s.at !== undefined && s.type !== 'process'), stream.events);
    const samples = steps.filter(s => s.type === 'process').flatMap(s => Array.from({ length: s.frames }, (_, i) => s.at + i));
    assert.deepStrictEqual(samples, [0, 1, 2, 3, 4, 5, 6, 7]);
}
assert.throws(() => normalize({ ...stream, events: [{ at: -1, type: 'reset' }] }), /offset/);
assert.throws(() => normalize({ ...stream, events: [{ at: 1, type: 'control', name: 'missing', value: 0 }] }), /unknown control/);
assert.throws(() => normalize({ ...stream, inputs: [[0]] }), /stream lengths/);
assert.throws(() => normalize({ ...stream, controls: { gain: [1] } }), /frame count/);

// A hung executable is a test failure, with its command retained for diagnosis.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zampogna-harness-'));
try {
    assert.throws(() => run(process.execPath, ['-e', 'process.on("SIGTERM", () => {}); for (;;) {}'], dir, 'hang', 200), /ETIMEDOUT/);
    assert(fs.existsSync(path.join(dir, 'hang.command.json')));
    assert.throws(() => run(process.execPath, ['-e', 'process.exit(3)'], dir, 'exit'), /exit 3/);
    assert.strictEqual(available(path.join(dir, 'missing-tool')), false);
    const blocked = path.join(dir, 'blocked-tool');
    fs.writeFileSync(blocked, 'not executable', { mode: 0o600 });
    assert.throws(() => available(blocked), /cannot run/);

    // Prove the full C -> raw file -> oracle path rejects wrong code. The old
    // blanket 1e-4 tolerance would have passed this deliberately broken program.
    const broken = native.prepare({ name: 'deliberately wrong routing',
        code: 'y = probe(x) { y = x * 0.0; }', inputs: [[1e-6]], expected: [[1e-6]] },
    path.join(dir, 'broken'), false);
    native.generate(broken, 'C');
    const build = native.build(broken, 'C', { name: 'O0', cc: process.env.CC || 'cc', flags: ['-O0'] });
    assert.throws(() => native.execute(broken, build, 'whole'), /output 0, sample 0: got 0, expected/);
    assert(fs.existsSync(path.join(build, 'whole/commands.txt')));
    assert.strictEqual(fs.readFileSync(path.join(build, 'whole/output-0-0.f32')).readFloatLE(), 0);
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
console.log('Raw transport, numeric comparisons, event planning, subprocess failures and wrong-code detection: passed');
