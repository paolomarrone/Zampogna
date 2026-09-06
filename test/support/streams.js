'use strict';

const assert = require('assert');

// Files contain planar IEEE-754 binary32 samples, little endian, with no header.
function encode(channels, frames) {
    const data = Buffer.alloc(channels.length * frames * 4);
    channels.forEach((samples, channel) => {
        assert.strictEqual(samples.length, frames, `channel ${channel}: wrong frame count`);
        samples.forEach((value, frame) => data.writeFloatLE(value, (channel * frames + frame) * 4));
    });
    return data;
}

function decode(data, channels, frames) {
    assert.strictEqual(data.length, channels * frames * 4, 'wrong output byte count');
    return Array.from({ length: channels }, (_, channel) =>
        Array.from({ length: frames }, (_, frame) => data.readFloatLE((channel * frames + frame) * 4)));
}

const describe = value => Object.is(value, -0) ? '-0' : String(value);

function compare(actual, expected, policy = { mode: 'exact' }) {
    assert(['exact', 'tolerance'].includes(policy.mode), 'unknown comparison mode');
    const absolute = policy.absolute ?? 0;
    const relative = policy.relative ?? 0;
    assert(Number.isFinite(absolute) && absolute >= 0 && Number.isFinite(relative) && relative >= 0,
        'invalid comparison tolerance');
    assert.strictEqual(actual.length, expected.length, 'wrong output channel count');
    expected.forEach((samples, channel) => {
        assert.strictEqual(actual[channel].length, samples.length, `output ${channel}: wrong frame count`);
        samples.forEach((value, frame) => {
            const want = Math.fround(value);
            const got = actual[channel][frame];
            // Exact includes signed zero. NaN matches only an explicitly expected
            // NaN; its payload is unspecified. Infinity must match its sign.
            if (Object.is(got, want)) return;
            if (policy.mode === 'tolerance' && Number.isFinite(got) && Number.isFinite(want)
                && !(got === 0 && want === 0)
                && Math.abs(got - want) <= absolute + relative * Math.abs(want)) return;
            const start = Math.max(0, frame - 2);
            const end = frame + 3;
            throw new Error(`output ${channel}, sample ${frame}: got ${describe(got)}, expected ${describe(want)}\n`
                + `  actual[${start}..]: ${actual[channel].slice(start, end).map(describe).join(', ')}\n`
                + `expected[${start}..]: ${samples.slice(start, end).map(Math.fround).map(describe).join(', ')}`);
        });
    });
}

// Unlike JSON's default conversion, retain NaN, infinities and signed zero in
// diagnostic metadata. The binary files remain the authoritative sample data.
function json(value) {
    return JSON.stringify(value, (_, v) => typeof v === 'number'
        && (!Number.isFinite(v) || Object.is(v, -0)) ? describe(v) : v, 2) + '\n';
}

module.exports = { encode, decode, compare, json };
