#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { tests: regressions } = require('./cases/semantics');
const streams = require('./cases/streams');
const native = require('./support/native');
const matlab = require('./support/matlab');
const { available, run } = require('./support/process');

function main() {
    let cc = process.env.CC || 'cc', filter = '', keep = false, extended = false;
    let requireOctave = process.env.ZAMPOGNA_REQUIRE_OCTAVE === '1';
    const args = process.argv.slice(2);
    while (args.length) {
        const arg = args.shift();
        if (arg === '--keep') keep = true;
        else if (arg === '--extended') extended = true;
        else if (arg === '--require-octave') requireOctave = true;
        else if ((arg === '--cc' || arg === '--filter') && args.length) {
            const value = args.shift();
            if (arg === '--cc') cc = value; else filter = value;
        } else throw new Error('Usage: node test/test_semantics.js [--keep] [--extended] [--require-octave] [--cc executable] [--filter name]');
    }
    const tests = [...regressions, ...streams].filter(test => test.name.includes(filter));
    if (!tests.length) throw new Error(`no semantic cases match ${JSON.stringify(filter)}`);
    const matrix = [
        { name: 'O0-ubsan', cc, flags: ['-O0', '-fsanitize=undefined', '-fsanitize-undefined-trap-on-error'] },
        { name: 'O2', cc, flags: ['-O2'] },
    ];
    if (extended) matrix.push({ name: 'O1-asan-ubsan', cc,
        flags: ['-O1', '-g', '-fno-omit-frame-pointer', '-fsanitize=address,undefined', '-fno-sanitize-recover=all'] });
    for (const compiler of new Set(matrix.map(c => c.cc)))
        if (!available(compiler)) throw new Error(`required C compiler not found: ${compiler}`);
    const hasOctave = available('octave');
    if (!hasOctave && requireOctave) throw new Error('required tool not found: octave');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zampogna-semantics-'));
    let failed = 0, builds = 0, executions = 0, bwSkipped = 0;
    const matlabFiles = [];
    try {
        for (const [i, compiler] of [...new Set(matrix.map(c => c.cc))].entries())
            run(compiler, ['--version'], root, `compiler-${i}`);
        // Check the requested compiler and sanitizer runtime before repeating a
        // missing-toolchain failure across every source case.
        fs.writeFileSync(path.join(root, 'toolchain.c'), 'int main(void) { return 0; }\n');
        for (const config of matrix) {
            run(config.cc, ['-std=c99', ...config.flags, 'toolchain.c', '-o', 'toolchain'], root, config.name);
            run(path.join(root, 'toolchain'), [], root, config.name + '-run', 10000);
        }
        for (const [index, test] of tests.entries()) {
            for (const optimized of [false, true]) {
                const dir = path.join(root, `${index}-${test.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${optimized ? 'opt' : 'plain'}`);
                try {
                    const prepared = native.prepare(test, dir, optimized);
                    const targets = ['C'];
                    // The generated VST wrapper supports only mono/stereo buses.
                    if (prepared.inputs <= 2 && prepared.outputs <= 2) targets.push('bw');
                    else bwSkipped++;
                    for (const target of targets) {
                        native.generate(prepared, target);
                        for (const config of matrix) {
                            const buildDir = native.build(prepared, target, config);
                            for (const partition of Object.keys(native.partitions)) {
                                native.execute(prepared, buildDir, partition);
                                executions += 4; // Two instances, first run and reset replay.
                            }
                            builds++;
                        }
                    }
                    if (!test.cOnly && hasOctave) {
                        native.generate(prepared, 'MATLAB');
                        matlabFiles.push(matlab.check(prepared));
                    }
                } catch (error) {
                    failed++;
                    console.error(`FAIL ${test.name} (optimizations=${optimized})\n${error.stack}\nArtifacts: ${dir}`);
                }
            }
            console.log(`${index + 1}/${tests.length}: ${test.name}`);
        }
        try {
            matlab.execute(matlabFiles, root);
            console.log(`MATLAB/Octave: ${matlabFiles.length} execution checks passed`);
        } catch (error) {
            failed++;
            console.error(`FAIL MATLAB/Octave: ${error.message}`);
        }
        if (!hasOctave) console.log(`SKIP ${tests.filter(t => !t.cOnly).length * 2} MATLAB/Octave checks: octave not installed`);
        if (bwSkipped) console.log(`SKIP ${bwSkipped} Brickworks cases: wrapper supports at most two audio channels`);
        console.log(`Native semantics: ${builds} builds passed; ${executions} stream comparisons passed; ${failed} failures`);
        if (failed) process.exitCode = 1;
    } catch (error) {
        failed++;
        throw error;
    } finally {
        if (failed || keep) console.log(`Semantic artifacts: ${root}`);
        else fs.rmSync(root, { recursive: true, force: true });
    }
}

try { main(); } catch (error) { console.error(error.stack); process.exitCode = 1; }
