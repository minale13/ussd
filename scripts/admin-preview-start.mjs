/**
 * Detached launcher for the admin dashboard preview.
 *
 * spawn with `detached` + `ignore` so the server survives this shell: cmd's own
 * background operators are unreliable here, and the preview is meant to keep
 * running while the user inspects the console.
 *
 * Run: node scripts/admin-preview-start.mjs
 */
import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const log = path.join(root, 'admin-preview.log');
const start = process.argv.includes('--open');

if (start) {
  /**
   * Opens the admin preview in the default browser. The server itself never
   * opens a tab (PREVIEW_NO_OPEN), so this is the single place that does.
   */
  const url = 'http://localhost:3001/admin';
  try {
    if (process.platform === 'win32') {
      // `start` needs the (empty) window title first, or it treats the URL as one.
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
      spawn(opener, [url], { detached: true, stdio: 'ignore' }).unref();
    }
    console.log('opened', url);
  } catch (err) {
    console.error('could not open a browser:', err.message);
    console.error('open this manually:', url);
  }
  process.exit(0);
}

const out = openSync(log, 'w');
const child = spawn(process.execPath, [path.join(root, 'scripts', 'admin-ui-preview.js')], {
  cwd: root,
  detached: true,
  // openSync returns a bare fd, which is exactly what stdio wants.
  stdio: ['ignore', out, out],
  // PREVIEW_NO_OPEN: the launcher reports the URL itself, and a second browser
  // tab popping up mid-command is just noise.
  env: { ...process.env, PREVIEW_NO_OPEN: '1' },
});
child.unref();

console.log('admin preview starting, pid', child.pid, '| log:', path.basename(log));
