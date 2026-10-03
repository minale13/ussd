/**
 * Copies the Android App Agent UI into the serverless function directory.
 *
 * The bare host serves the APK's WebView document, and that document has to
 * travel with the function. Vercel traces `api/` for a Node function, so placing
 * the assets inside `api/assets/` ships them without any platform-specific
 * bundling directive in vercel.json. That matters: `functions.*.includeFiles`
 * has changed type between schema revisions, and guessing at it is what broke
 * the last build. Copying the files removes the question entirely.
 */
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'android', 'app', 'src', 'main', 'assets');
const to = path.join(root, 'api', 'assets');

const FILES = ['dashboard.html', 'tailwind.css'];

await mkdir(to, { recursive: true });
for (const name of FILES) {
  try {
    await copyFile(path.join(from, name), path.join(to, name));
    console.log(`[assets] ${name}`);
  } catch (error) {
    // Warned about loudly but deliberately NOT fatal. This step once failed the
    // whole deployment ("Command npm run build exited with 1") purely because a
    // packaging rule had dropped the Android assets, which cost two deploy
    // cycles for what is one static page. The `/` route already degrades to an
    // explanatory notice when an asset is absent, so losing it should not block
    // everything else. If you see this in a build log, check .vercelignore.
    console.warn(`[assets] WARNING: could not copy ${name} -> ${error.message}`);
  }
}