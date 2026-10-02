// Opens the Android app agent preview in the default browser, detached so the
// shell is not held open by the browser process.
const { spawn } = require('node:child_process');

const urls = process.argv.slice(2);
if (!urls.length) {
  console.error('usage: node scripts/open-app-preview.cjs <url> [...]');
  process.exit(1);
}

for (const url of urls) {
  const child = spawn('cmd', ['/c', 'start', '', url], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  console.log('opened', url);
}
