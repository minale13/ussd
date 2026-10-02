/**
 * Builds the admin app, then starts the preview server on port 3000.
 *
 * Run: node scripts/admin-serve.cjs
 *
 * The command returns immediately: it re-launches itself as a detached worker so
 * the compile and the server survive the shell that started them. Progress and
 * the server's own output go to admin-preview.log.
 *
 * Stop the server with http://127.0.0.1:3000/__shutdown.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const log = path.join(root, 'admin-preview.log');
const worker = process.argv.includes('--worker');

/**
 * TypeScript's own entry point, run through this node binary.
 *
 * Spawning the `npm` / `tsc` .cmd shims would need `shell: true` on Windows,
 * which then mangles the arguments; calling tsc's JS entry directly is both
 * cross-platform and quoting-proof.
 */
const TSC = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');

/** Runs one command to completion, with both streams appended to the log. */
function step(label, command, args, out) {
  return new Promise((resolve, reject) => {
    fs.writeSync(out, `[serve] ${label}\n`);
    const child = spawn(command, args, { cwd: root, stdio: ['ignore', out, out] });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${label} exited with code ${code}`))));
  });
}

async function main() {
  const out = fs.openSync(log, 'w');
  try {
    await step('building', process.execPath, [TSC, '-p', 'tsconfig.json'], out);
    fs.writeSync(out, '[serve] starting preview on 3000\n');
    const server = spawn(process.execPath, [path.join(root, 'scripts', 'admin-ui-preview.js')], {
      cwd: root,
      detached: true,
      stdio: ['ignore', out, out],
      env: { ...process.env, PREVIEW_NO_OPEN: '1' },
    });
    server.unref();
    fs.writeSync(out, `[serve] preview pid ${server.pid}\n`);
  } catch (error) {
    // stdout is detached, so a failure has to be reported in the log file.
    fs.writeSync(out, `[serve] failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (worker) {
  main();
} else {
  // Detach immediately so the compile and the server outlive this shell.
  const child = spawn(process.execPath, [__filename, '--worker'], {
    cwd: root,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  console.log('admin preview starting (build + serve), pid', child.pid, '| log:', path.basename(log));
}
