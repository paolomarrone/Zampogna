#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const args = process.argv.slice(2);
if (args.some(arg => !['--extended', '--keep', '--require-octave'].includes(arg))) {
    console.error('Usage: node test/run.js [--extended] [--keep] [--require-octave]');
    process.exit(1);
}
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zampogna-tests-'));
const suites = fs.readdirSync(__dirname).filter(name => /^test_.*\.js$/.test(name)).sort();
let failed = 0;
try {
    for (const suite of suites) {
        const dir = path.join(root, suite.slice(0, -3));
        fs.mkdirSync(dir);
        const start = Date.now();
        const result = cp.spawnSync(process.execPath,
            [path.join(__dirname, suite), ...(suite === 'test_semantics.js' ? args : [])], {
                cwd: __dirname, encoding: 'utf8', timeout: args.includes('--extended') ? 600000 : 300000,
                killSignal: 'SIGKILL', maxBuffer: 16 * 1024 * 1024,
                env: { ...process.env, ZAMPOGNA_TEST_OUTPUT: dir,
                    ZAMPOGNA_REQUIRE_OCTAVE: args.includes('--require-octave') ? '1' : (process.env.ZAMPOGNA_REQUIRE_OCTAVE || '0') },
            });
        const output = (result.stdout || '') + (result.stderr || '');
        fs.writeFileSync(path.join(dir, 'suite.log'), output);
        const ok = !result.error && result.status === 0;
        console.log(`${ok ? 'PASS' : 'FAIL'} ${suite} (${((Date.now() - start) / 1000).toFixed(1)}s)`);
        // Preserve explicit skipped checks and the native matrix counts in the
        // top-level report. Full legacy diagnostic dumps stay in the log.
        for (const line of output.split('\n'))
            if (/^(SKIP |Native semantics:|MATLAB\/Octave:|Semantic artifacts:)/.test(line)) console.log('  ' + line);
        if (!ok) {
            failed++;
            console.error(result.error || `exit ${result.status}, signal ${result.signal}`);
            console.error(output.slice(-6000));
        }
    }
    console.log(`${suites.length - failed}/${suites.length} suites passed; ${failed} failed`);
    if (failed) process.exitCode = 1;
} catch (error) {
    failed++;
    console.error(error.stack);
    process.exitCode = 1;
} finally {
    if (failed || args.includes('--keep')) console.log(`Suite artifacts: ${root}`);
    else fs.rmSync(root, { recursive: true, force: true });
}
