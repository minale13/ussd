#!/usr/bin/env node
/**
 * Builds the Android gateway APK, pointed at a configurable backend.
 *
 * The wrapper is not committed (see .github/workflows/android-build.yml, which
 * generates it on demand), so this script bootstraps it when missing rather
 * than failing with a confusing "not recognised as an internal command".
 *
 * Configuration is passed straight through to Gradle as -P properties, which
 * android/app/build.gradle.kts resolves in preference to the environment and to
 * its own defaults:
 *
 *   API_BASE_URL    backend root, trailing slash added if absent  (default
 *                   http://10.0.2.2:3000/, the host from an emulator)
 *   GATEWAY_USER_ID the user the phone polls as                  (required for release)
 *   WEBHOOK_SECRET  HMAC key matching PAYMENT_WEBHOOK_SECRET     (required for release)
 *   USSD_PREFIX     Telebirr USSD menu prefix                    (default *806)
 *   USSD_PIN        fallback PIN when none is saved on the phone (required for release)
 *
 * Values are read from the environment, falling back to android/local.properties
 * so a machine can be configured once instead of per build.
 *
 * Usage:
 *   node scripts/build-apk.mjs                              # debug APK, defaults
 *   node scripts/build-apk.mjs --release                    # release APK
 *   node scripts/build-apk.mjs --release --url https://withdrawal.example.com
 *   node scripts/build-apk.mjs --user-id <uuid> --webhook-secret <secret>
 *
 * Release builds fail fast if a required value is still a placeholder; the
 * Gradle script enforces that too, this just reports it earlier and more
 * legibly.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID = path.join(ROOT, 'android');
const LOCAL_PROPERTIES = path.join(ANDROID, 'local.properties');
const OUTPUT = path.join(ROOT, 'dist', 'apk');

// Placeholders the Gradle script refuses to ship in a release build.
const REQUIRED_FOR_RELEASE = {
  GATEWAY_USER_ID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  WEBHOOK_SECRET: null, // any non-placeholder value
  USSD_PIN: null,
};
const PLACEHOLDER = /^replace-with-/;

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
function flagValue(name) {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

const release = flags.has('--release');
const variantArg = flagValue('--variant') ?? (release ? 'release' : 'debug');
if (!['debug', 'release'].includes(variantArg)) {
  console.error(`--variant must be "debug" or "release" (got "${variantArg}")`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Configuration: CLI flag > environment > android/local.properties > Gradle default
// ---------------------------------------------------------------------------
/** Reads `key=value` pairs out of android/local.properties, ignoring sdk.dir. */
function readLocalProperties() {
  if (!existsSync(LOCAL_PROPERTIES)) return {};
  const entries = {};
  for (const line of readFileSync(LOCAL_PROPERTIES, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([\w.]+)\s*=\s*(.*)$/.exec(line);
    if (match) entries[match[1]] = match[2].trim();
  }
  return entries;
}

const localProperties = readLocalProperties();
const config = {};
const set = (key, value) => {
  if (value !== undefined && value !== '') config[key] = value;
};

set('API_BASE_URL', flagValue('--url'));
set('GATEWAY_USER_ID', flagValue('--user-id'));
set('WEBHOOK_SECRET', flagValue('--webhook-secret'));
set('USSD_PREFIX', flagValue('--ussd-prefix'));
set('USSD_PIN', flagValue('--ussd-pin'));

for (const key of Object.keys(REQUIRED_FOR_RELEASE)) set(key, process.env[key]);
set('API_BASE_URL', process.env.API_BASE_URL ?? localProperties.API_BASE_URL);

if (config.API_BASE_URL) {
  // Retrofit requires the trailing slash; normalise it here so the value the
  // user typed is the value that ends up in BuildConfig.
  const url = config.API_BASE_URL.trim();
  if (!/^https?:\/\//i.test(url)) {
    console.error(`--url must start with http:// or https:// (got "${url}")`);
    process.exit(1);
  }
  if (!url.endsWith('/')) config.API_BASE_URL = `${url}/`;
}

if (variantArg === 'release') {
  const missing = [];
  for (const [key, pattern] of Object.entries(REQUIRED_FOR_RELEASE)) {
    const value = config[key] ?? localProperties[key];
    if (!value || PLACEHOLDER.test(value) || (pattern && !pattern.test(value))) missing.push(key);
  }
  if (missing.length) {
    console.error('Cannot build a release APK: these are still unset or placeholders:');
    for (const key of missing) {
      const flag = `--${key.toLowerCase().replace(/_/g, '-')}`;
      console.error(`  - ${key}   (pass ${flag}=<value>, export ${key}, or set it in android/local.properties)`);
    }
    console.error('\nNote: WEBHOOK_SECRET here must match PAYMENT_WEBHOOK_SECRET on the server.');
    process.exit(1);
  }

  // A release APK that falls back to the committed development keystore is signed
  // with a public password, which is precisely what Play Protect distrusts. Warn
  // loudly rather than block: the build is still valid, it is just not the key a
  // published app should be signed with.
  const uploadKey = process.env.APK_KEYSTORE_PATH;
  const localReleaseKey = path.join(ANDROID, 'release-keystore.jks');
  if (!uploadKey && !existsSync(localReleaseKey)) {
    console.warn(
      '\n[apk] WARNING: no release keystore found.\n' +
      '      Falling back to android/app/keystore.jks, whose password ("android") is\n' +
      '      public. That signature is what Play Protect flags on a sideload, and it\n' +
      '      cannot enrol in Play App Signing.\n' +
      '      Run "npm run apk:keygen" once to create a private release key.\n'
    );
  }
}

// ---------------------------------------------------------------------------
// Toolchain preflight
// ---------------------------------------------------------------------------
const isWindows = process.platform === 'win32';
const gradlew = path.join(ANDROID, isWindows ? 'gradlew.bat' : 'gradlew');
const hasWrapper =
  existsSync(gradlew) && existsSync(path.join(ANDROID, 'gradle', 'wrapper', 'gradle-wrapper.jar'));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, ...options });
  // ENOENT means the executable is not on PATH at all, which is far more likely
  // than a build failure and deserves the setup hint rather than a stack trace.
  if (result.error && result.error.code === 'ENOENT') {
    rmSync(path.join(ROOT, '.tmp-gradle-wrapper'), { recursive: true, force: true });
    console.error(`\n[apk] "${command}" was not found on PATH.`);
    if (command === 'gradle') {
      console.error(
        '      Install Gradle 8.11+ (https://gradle.org/install/) and a JDK 17 toolchain,\n' +
          '      or commit the wrapper by running `gradle wrapper` once inside android/.',
      );
    }
    process.exit(1);
  }
  if (result.error) throw result.error;
  return result.status ?? 1;
}

/**
 * Generates the wrapper using a scratch project. Gradle 8 refuses to run in a
 * directory with no build at all, and the real build may not configure yet on a
 * fresh machine, so the wrapper is produced somewhere neutral and copied in.
 * Mirrors the CI step in .github/workflows/android-build.yml.
 */
function bootstrapWrapper() {
  console.log('[apk] no Gradle wrapper found, generating one...');
  const scratch = path.join(ROOT, '.tmp-gradle-wrapper');
  mkdirSync(path.join(scratch, 'gradle', 'wrapper'), { recursive: true });
  writeFileSync(path.join(scratch, 'settings.gradle'), '');

  const status = run('gradle', ['wrapper', '--gradle-version', '8.11.1', '--distribution-type', 'bin'], {
    cwd: scratch,
  });
  if (status !== 0) {
    rmSync(scratch, { recursive: true, force: true });
    console.error(
      '\n[apk] Could not generate the Gradle wrapper.\n' +
        '      Install Gradle 8.11+ (https://gradle.org/install/) or a JDK 17 toolchain,\n' +
        '      then re-run. The Android SDK is also required; set ANDROID_HOME or\n' +
        '      sdk.dir in android/local.properties.',
    );
    process.exit(1);
  }
  for (const file of ['gradle-wrapper.jar', 'gradle-wrapper.properties']) {
    copyFileSync(
      path.join(scratch, 'gradle', 'wrapper', file),
      path.join(ANDROID, 'gradle', 'wrapper', file),
    );
  }
  copyFileSync(path.join(scratch, 'gradlew'), path.join(ANDROID, 'gradlew'));
  copyFileSync(path.join(scratch, 'gradlew.bat'), path.join(ANDROID, 'gradlew.bat'));
  // The scratch project has served its purpose; leaving it would leave a stray
  // Gradle build directory in the repository root.
  rmSync(scratch, { recursive: true, force: true });
  console.log('[apk] wrapper generated');
}

if (!hasWrapper) bootstrapWrapper();

// ---------------------------------------------------------------------------
// Assemble
// ---------------------------------------------------------------------------
const gradleArgs = [
  `:app:assemble${variantArg.charAt(0).toUpperCase()}${variantArg.slice(1)}`,
  '--stacktrace',
];
for (const [key, value] of Object.entries(config)) gradleArgs.push(`-P${key}=${value}`);

console.log(`[apk] building the ${variantArg} APK`);
if (config.API_BASE_URL) console.log(`[apk]   backend: ${config.API_BASE_URL}`);
else console.log('[apk]   backend: production (https://ussd-six.vercel.app/) - pass --url to target another host');

const status = run(isWindows ? gradlew : './gradlew', gradleArgs, { cwd: ANDROID });
if (status !== 0) {
  console.error('[apk] Gradle failed; see the output above.');
  process.exit(status);
}

// ---------------------------------------------------------------------------
// Report the artefact
// ---------------------------------------------------------------------------
const built = path.join(ANDROID, 'app', 'build', 'outputs', 'apk', variantArg, `app-${variantArg}.apk`);
if (!existsSync(built)) {
  console.error(`[apk] Gradle reported success but ${built} is missing.`);
  process.exit(1);
}

mkdirSync(OUTPUT, { recursive: true });
const target = path.join(OUTPUT, path.basename(built));
copyFileSync(built, target);

console.log(`\n[apk] built   ${path.relative(ROOT, target)}`);
console.log(`[apk] install adb install -r "${path.relative(ROOT, target)}"`);

