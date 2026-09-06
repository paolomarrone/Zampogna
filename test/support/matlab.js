'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { run } = require('./process');

const quote = text => "'" + text.replace(/'/g, "''") + "'";
const literal = value => Object.is(value, -0) ? '-0.0' : String(value);

// MATLAB exposes a one-shot function, not the native lifecycle API. Keep its
// original double-precision oracle checks separate from native stream tests.
function check(prepared) {
    const { test, streams, dir } = prepared;
    assert(streams.length === 1 && streams[0].events.length === 0, 'MATLAB fixture requires a single static stream');
    const stream = streams[0];
    const inputs = stream.inputs.map((_, i) => 'x' + i);
    const outputs = stream.expected.map((_, i) => 'y' + i);
    const args = [...(inputs.length ? inputs : [stream.frames]), stream.sampleRate,
        ...Object.values(stream.controls).map(literal)];
    const script = [
        `addpath(${quote(dir)}); clear probe;`,
        ...stream.inputs.map((v, i) => `x${i} = [${v.map(literal).join(' ')}];`),
        `[${outputs.join(', ')}] = probe(${args.join(', ')});`,
        ...stream.expected.flatMap((v, i) => [
            `expected = [${v.map(literal).join(' ')}];`,
            `assert(isequal(size(y${i}), size(expected)), ${quote(test.name + ': shape')});`,
            `assert(all(abs(y${i} - expected) < 1e-10), ${quote(test.name)});`,
            `assert(isequal(1 ./ y${i}(expected == 0), 1 ./ expected(expected == 0)), ${quote(test.name + ': signed zero')});`,
        ]),
        `rmpath(${quote(dir)});`,
    ];
    const file = path.join(dir, 'check.m');
    fs.writeFileSync(file, script.join('\n') + '\n');
    return file;
}

function execute(files, root) {
    if (!files.length) return;
    const script = files.map(file => `run(${quote(file)});`).join('\n') + '\n';
    fs.writeFileSync(path.join(root, 'matlab.m'), script);
    run('octave', ['--quiet', '--no-gui', 'matlab.m'], root, 'matlab', 60000);
}

module.exports = { check, execute };
