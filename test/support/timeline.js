'use strict';

const assert = require('assert');

const partitions = { whole: [Number.MAX_SAFE_INTEGER], single: [1], fixed: [64], irregular: [3, 1, 17, 2, 63, 5] };

function normalize(stream) {
    const frames = stream.frames ?? stream.expected[0].length;
    assert(Number.isSafeInteger(frames) && frames >= 0 && frames <= 1000000, 'invalid frame count');
    for (const samples of [...stream.inputs, ...stream.expected]) {
        assert.strictEqual(samples.length, frames, 'inconsistent stream lengths');
        assert(samples.every(value => typeof value === 'number'), 'samples must be numbers');
    }
    const controls = Object.entries(stream.controls || {});
    const finite = value => assert(Number.isFinite(Math.fround(value)), 'non-finite setup value');
    const events = [];
    for (const [name, value] of controls) {
        if (Array.isArray(value)) {
            assert(frames > 0 && value.length === frames, `control ${name}: wrong frame count`);
            value.forEach(finite);
        } else finite(value);
    }
    if (stream.sampleRates) {
        assert.strictEqual(stream.sampleRates.length, frames, 'sample rate: wrong frame count');
        stream.sampleRates.forEach(finite);
    }
    // Preserve the original fixtures' setter order and repeated setter calls.
    for (let at = 0; at < frames; at++) {
        for (const [name, value] of controls)
            if (Array.isArray(value)) events.push({ at, type: 'control', name, value: value[at] });
        if (stream.sampleRates) events.push({ at, type: 'rate', value: stream.sampleRates[at] });
    }
    for (const event of stream.events || []) {
        assert(Number.isSafeInteger(event.at) && event.at >= 0 && event.at <= frames, 'invalid event offset');
        assert(['control', 'rate', 'reset'].includes(event.type), 'unknown event type');
        if (event.type === 'control') assert(controls.some(([name]) => name === event.name), 'unknown control');
        if (event.type !== 'reset') finite(event.value);
        events.push({ ...event });
    }
    events.sort((a, b) => a.at - b.at); // Stable: same-offset events keep their order.
    const sampleRate = stream.sampleRate ?? 48000;
    finite(sampleRate);
    assert(sampleRate > 0 && events.every(e => e.type !== 'rate' || e.value > 0), 'invalid sample rate');
    return { ...stream, frames, events, sampleRate,
        controls: Object.fromEntries(controls.map(([name, value]) => [name, Array.isArray(value) ? value[0] : value])) };
}

// Events happen before the sample at their offset. A process call never crosses
// an event; splitting a requested buffer does not move or duplicate the event.
function plan(stream, partition) {
    const sizes = partitions[partition];
    assert(sizes, 'unknown buffer partition');
    const steps = [
        { type: 'rate', value: stream.sampleRate },
        ...Object.entries(stream.controls).map(([name, value]) => ({ type: 'control', name, value })),
        { type: 'reset' },
    ];
    let at = 0, event = 0, buffer = 0;
    while (true) {
        while (event < stream.events.length && stream.events[event].at === at)
            steps.push(stream.events[event++]);
        if (stream.emptyCalls) steps.push({ type: 'process', at, frames: 0 });
        if (at === stream.frames) break;
        const end = Math.min(stream.frames, at + sizes[buffer++ % sizes.length],
            event < stream.events.length ? stream.events[event].at : stream.frames);
        steps.push({ type: 'process', at, frames: end - at });
        at = end;
    }
    return steps;
}

module.exports = { normalize, plan, partitions };
