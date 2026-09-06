'use strict';

const cp = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command, args, cwd, log, timeout = 30000) {
    fs.writeFileSync(path.join(cwd, log + '.command.json'), JSON.stringify({ command, args, cwd, timeout }, null, 2) + '\n');
    const result = cp.spawnSync(command, args, { cwd, timeout, killSignal: 'SIGKILL',
        encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    fs.writeFileSync(path.join(cwd, log + '.log'), (result.stdout || '') + (result.stderr || ''));
    if (result.error || result.status !== 0)
        throw new Error(`${command}: ${result.error ? result.error.message : `exit ${result.status}, signal ${result.signal}`}\n`
            + (result.stderr || result.stdout || '').slice(-4000) + `\nLog: ${path.join(cwd, log + '.log')}`);
    return result.stdout;
}

function available(command) {
    const result = cp.spawnSync(command, ['--version'], { timeout: 10000, killSignal: 'SIGKILL', stdio: 'ignore' });
    if (result.error && result.error.code === 'ENOENT') return false;
    if (result.error || result.status !== 0) throw new Error(`cannot run ${command}: ${result.error || result.status}`);
    return true;
}

module.exports = { run, available };
