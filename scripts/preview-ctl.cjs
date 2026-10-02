/**
 * Admin preview control: reports which ports are serving and stops extras.
 *
 *   node scripts/preview-ctl.cjs status           # list live preview ports
 *   node scripts/preview-ctl.cjs stop 3001        # shut one down
 *   node scripts/preview-ctl.cjs stop-extras      # keep 3000, stop the rest
 *
 * The preview falls back to the next free port when 3000 is taken, so a stray
 * instance from an earlier run can end up holding 3001 and confusing a refresh.
 */
const RANGE = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];

async function probe(port) {
  try {
    // Generous: /__status warms the admin console by importing the built
    // controller on a cold start, and a too-tight budget would race past a
    // live server and report it as down.
    const response = await fetch(`http://127.0.0.1:${port}/__status`, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) return null;
    const body = await response.json();
    // A preview that serves the admin console reports `page`; a dashboard-only
    // one does not.
    return body && body.page ? body : null;
  } catch {
    return null;
  }
}

async function live() {
  const found = [];
  for (const port of RANGE) {
    const status = await probe(port);
    if (status) found.push({ port, status });
  }
  return found;
}

async function stop(port) {
  try {
    await fetch(`http://127.0.0.1:${port}/__shutdown`, { signal: AbortSignal.timeout(1500) });
    console.log(`stopped ${port}`);
  } catch {
    // The server closes the socket as it exits, which can surface as an error.
    console.log(`stopped ${port} (connection closed)`);
  }
}

(async () => {
  const [command, argument] = process.argv.slice(2);
  const found = await live();

  if (command === 'status' || !command) {
    if (!found.length) console.log('no admin preview is running');
    for (const entry of found) {
      console.log(`${entry.port}  ${entry.status.url}  (${entry.status.devices} devices, ${entry.status.transactions} payouts)`);
    }
    return;
  }

  if (command === 'stop') {
    const port = Number(argument);
    if (!port) throw new Error('usage: node scripts/preview-ctl.cjs stop <port>');
    await stop(port);
    return;
  }

  if (command === 'stop-extras') {
    const extras = found.filter((entry) => entry.port !== 3000);
    if (!extras.length) console.log('only port 3000 is running');
    for (const entry of extras) await stop(entry.port);
    return;
  }

  console.log('usage: node scripts/preview-ctl.cjs [status | stop <port> | stop-extras]');
})();
