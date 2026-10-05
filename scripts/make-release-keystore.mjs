#!/usr/bin/env node
/**
 * Generates the private release signing key for the Android gateway.
 *
 * Why a script rather than a documented keytool command: the key must never be
 * committed, and a developer who skips this step silently falls back to the
 * shared development key in android/app/keystore.jks, whose password is public.
 * That produces an APK carrying an accessibility service and the ability to
 * place calls, signed with a certificate anyone can forge.
 *
 * What it writes:
 *   android/release-keystore.jks                     the private key (gitignored)
 *   android/local.properties  RELEASE_* entries     the passwords (gitignored)
 *
 * Usage:
 *   node scripts/make-release-keystore.mjs
 *   node scripts/make-release-keystore.mjs --password "a-strong-passphrase"
 *   node scripts/make-release-keystore.mjs --days 10950     # 30 years
 *
 * Back up the keystore somewhere safe. Play Store cannot restore it: losing it
 * means the listing can never be updated again, only replaced under a new
 * application id.
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID = path.join(ROOT, 'android');
const KEYSTORE = path.join(ANDROID, 'release-keystore.jks');
const LOCAL_PROPERTIES = path.join(ANDROID, 'local.properties');
const ALIAS = 'release';

// keytool ships with every JDK, so resolve it the same way Gradle does.
function keytool() {
  if (process.env.KEYTOOL) return process.env.KEYTOOL;
  const javaHome = process.env.JAVA_HOME;
  if (javaHome) {
    const candidate = path.join(javaHome, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool');
    if (existsSync(candidate)) return candidate;
  }
  return process.platform === 'win32' ? 'keytool.exe' : 'keytool';
}

const argv = process.argv.slice(2);
function flag(name, fallback) {
  const i = argv.indexOf(name);
  return i === -1 || !argv[i + 1] ? fallback : argv[i + 1];
}

const password = flag('--password', randomBytes(18).toString('base64url'));
const days = flag('--days', '10950');

if (existsSync(KEYSTORE)) {
  console.error(`[keystore] ${path.relative(ROOT, KEYSTORE)} already exists.`);
  console.error('         Refusing to overwrite it: a new key means a new signature, and the');
  console.error('         installed app would have to be uninstalled before the new build installs.');
  console.error('         Delete it first only if you are certain it is not in use.');
  process.exit(1);
}

console.log('[keystore] generating a release signing key');
try {
  execFileSync(
    keytool(),
    [
      '-genkeypair',
      '-alias', ALIAS,
      '-keyalg', 'RSA',
      '-keysize', '4096',
      '-validity', days,
      '-storetype', 'JKS',
      '-keystore', KEYSTORE,
      '-storepass', password,
      '-keypass', password,
      '-dname', 'CN=USSD Gateway, OU=Mobile, O=USSD Gateway, L=Addis Ababa, C=ET',
    ],
    { stdio: 'inherit' }
  );
} catch {
  console.error('\n[keystore] keytool failed. Install a JDK 17 and put its bin/ on PATH, or set');
  console.error('          JAVA_HOME, or point KEYTOOL at the keytool executable.');
  process.exit(1);
}

// Merge the credentials into local.properties without disturbing sdk.dir or
// any API_BASE_URL the developer already set there.
const existing = existsSync(LOCAL_PROPERTIES) ? readFileSync(LOCAL_PROPERTIES, 'utf8') : '';
const kept = existing
  .split(/\r?\n/)
  .filter((line) => line && !/^\s*(RELEASE_|APK_)/.test(line));
const added = [
  `RELEASE_STORE_PASSWORD=${password}`,
  `RELEASE_KEY_ALIAS=${ALIAS}`,
  `RELEASE_KEY_PASSWORD=${password}`,
];
writeFileSync(LOCAL_PROPERTIES, [...kept, ...added].join('\n') + '\n', 'utf8');

console.log(`\n[keystore] key      ${path.relative(ROOT, KEYSTORE)}`);
console.log(`[keystore] alias    ${ALIAS}`);
console.log('[keystore] saved the password to android/local.properties (gitignored)');
console.log('\n[keystore] Back up this keystore now. Play Store cannot restore it.');
console.log('[keystore] Build with: npm run apk:release');