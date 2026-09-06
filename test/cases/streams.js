'use strict';

const { delay } = require('./semantics');

// Independent sample-by-sample models use float32 inputs. The delay oracle is a
// queue, deliberately different from the generated program's circular memory.
const seed = 0x51a7e;
let random = seed;
const noise = Array.from({ length: 4097 }, () => {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    return Math.fround(((random >>> 8) - 0x800000) / 0x800000);
});
const gates = noise.map((_, i) => i >= 200 && i < 3200 ? 0 : (i % 7 < 3 ? 1 : 0));
const queue = Array(17).fill(0);
const branch = [];
const outer = [];
let previous = 0;
for (let i = 0; i < noise.length; i++) {
    outer.push(previous);
    previous = noise[i];
    if (gates[i]) { branch.push(queue.shift()); queue.push(noise[i]); }
    else branch.push(-1);
}

const eventCode = `y = probe(x, gain) {
    y = delay(x) * gain + fs / 48000.0;
}`;
const first = {
    inputs: [[1, 2, 3, 4, 5, 6, 7, 8]], controls: { gain: 2 },
    events: [
        { at: 2, type: 'control', name: 'gain', value: 3 },
        { at: 4, type: 'rate', value: 96000 },
        { at: 5, type: 'reset' },
        { at: 5, type: 'control', name: 'gain', value: 4 },
        { at: 7, type: 'rate', value: 48000 },
    ],
    expected: [[1, 3, 7, 10, 14, 2, 26, 29]],
};
const second = {
    inputs: [[10, 20, 30, 40, 50, 60]], controls: { gain: -1 }, sampleRate: 96000,
    events: [{ at: 1, type: 'reset' }, { at: 3, type: 'control', name: 'gain', value: 2 }],
    expected: [[2, 2, -18, 62, 82, 102]],
};

module.exports = [
    { name: 'long seeded stream with ring wrap and inactive branch', seed, cOnly: true,
      code: `y = ring(x) {
        mem[17] float data; data.init = 0.0;
        mem[1] int index; index.init = 0;
        y = data[index[0]]; data[index[0]] = x;
        index[0] = (index[0] + 1) % 17;
      }
      a, b = probe(x, c) {
        a = delay(x);
        b = if(c > 0.5) { b = ring(x); } else { b = -1.0; };
      }`, inputs: [noise, gates], expected: [outer, branch] },
    { name: 'tiny samples survive routing and delay', cOnly: true,
      code: 'a, b = probe(x) { a = x; b = delay(x); }',
      inputs: [[1e-6, -1e-8, 2 ** -126, 2 ** -149, -0, 0]],
      expected: [[1e-6, -1e-8, 2 ** -126, 2 ** -149, -0, 0], [0, 1e-6, -1e-8, 2 ** -126, 2 ** -149, -0]] },
    { name: 'IEEE special values survive routing and delay', cOnly: true,
      code: 'a, b = probe(x) { a = x; b = delay(x); }',
      inputs: [[NaN, Infinity, -Infinity, -0, 0, 1]],
      expected: [[NaN, Infinity, -Infinity, -0, 0, 1], [0, NaN, Infinity, -Infinity, -0, 0]] },
    { name: 'independent instance timelines with controls rate and reset', cOnly: true,
      code: eventCode, streams: [first, second] },
    { name: 'generator without audio inputs and midstream reset', cOnly: true,
      code: 'y = probe() { y = delay(y) + 1.0; y.init = 0.0; }',
      inputs: [], frames: 129, events: [{ at: 65, type: 'reset' }],
      expected: [Array.from({ length: 129 }, (_, i) => i < 65 ? i + 1 : i - 64)] },
    { name: 'empty process calls preserve delay history', cOnly: true, emptyCalls: true,
      code: 'y = probe(x) { y = delay(x); }', inputs: [[1, 2, 3, 4, 5]], expected: [[0, 1, 2, 3, 4]] },
    { name: 'zero frame stream', cOnly: true, emptyCalls: true,
      code: 'y = probe(x) { y = delay(x); }', inputs: [[]], expected: [[]] },
].map(test => ({ ...test, prelude: delay + '\n' }));
