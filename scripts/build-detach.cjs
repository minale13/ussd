/**
 * Runs a full TypeScript emit detached, so the compile outlives the shell.
 *
 * Run: node scripts/build-detach.cjs
 *
 * Returns immediately: a detached worker runs tsc and appends `EXIT=<code>`
 * to build.log when the compile finishes, so you can poll the log for it.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const log = path.join(root, 'build.log');
const TSC = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
const worker = process.argv.includes('--worker');

/** Runs tsc to completion and records the exit code in build.log. */
function main() {
  const out = fs.openSync(log, 'w');
  fs.writeSync(out, '[build] tsc started\n');
  const child = spawn(process.execPath, [TSC, '-p', 'tsconfig.json'], {
    cwd: root,
    stdio: ['ignore', out, out],
  });
  child.on('exit', (code) => {
    fs.writeSync(out, `\nEXIT=${code}\n`);
    fs.closeSync(out);
  });
}

if (worker) {
  main();
} else {
  const child = spawn(process.execPath, [__filename, '--worker'], {
    cwd: root,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  console.log('build detached, pid', child.pid, '-> build.log');
}

