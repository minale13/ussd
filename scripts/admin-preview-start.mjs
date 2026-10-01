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
   * Opens the admin console in the default browser.
   *
   * The port is discovered rather than assumed: the server falls back to the
   * next free port when 3000 is taken, so a hardcoded URL would open a dead
   * tab whenever something else (the Android preview) already holds 3000.
   */
  async function findUrl() {
    for (let candidate = 3000; candidate <= 3020; candidate++) {
      const url = `http://127.0.0.1:${candidate}/admin`;
      try {
        // Generous: the console loads its page before /__status can answer,
        // and a too-tight budget would race past a live server.
        const response = await fetch(`http://127.0.0.1:${candidate}/__status`, {
          signal: AbortSignal.timeout(1500),
        });
        if (!response.ok) continue;
        const body = await response.json();
        // Only the admin console reports `page`; the Android preview does not.
        if (body && body.page) return url;
      } catch {
        // Nothing listening on this port.
      }
    }
    return null;
  }

  const url = await findUrl();
  if (!url) {
    console.error('No admin preview is running. Start it with: npm run admin:ui');
    process.exit(1);
  }
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
