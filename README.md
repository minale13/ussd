# Auto Withdrawal Service

Provider-independent withdrawal backend using Fastify, PostgreSQL, Redis, BullMQ, and TypeScript. The current provider is an in-memory `MockPaymentProvider`; no real financial API is contacted.

## Run locally

1. Copy `.env.example` to `.env` and replace `JWT_SECRET` with a secret of at least 32 characters.
2. Start infrastructure: `docker compose up -d`.
3. Install dependencies: `npm install`.
4. Run the schema: `npm run db:migrate`.
5. Start the API: `npm run dev`.
6. Start a worker in another terminal: `npm run worker`.

## Test and build

```text
npm test
npm run build
npm run test:load
```

The PostgreSQL concurrency test is gated behind `RUN_INTEGRATION=true` and uses a generated user, then deletes that test data:

```text
$env:RUN_INTEGRATION="true"; npm test -- tests/concurrency.integration.test.ts
```

For the HTTP load test, seed a disposable wallet with sufficient mock balance and provide its user ID:

```text
$env:LOAD_TEST_USER_ID="<test-user-uuid>"; $env:LOAD_TEST_COUNT="100"; npm run test:load
```

The load test only calls the local API and the mock provider; it never sends real money.

The development authentication boundary currently accepts `x-user-id` so the payment flow can be exercised without inventing a token issuer. Replace it with the application's real JWT/session verifier before production deployment. Requests must also include `Idempotency-Key`. A transactional outbox retries publishing committed withdrawals to Redis after API or Redis interruptions.

## Deploy the web admin

Every setting is read from `process.env` through `src/config/env.ts`, so a hosted
platform only needs the same variable names that `.env.example` already uses.
Nothing is read from a config file at runtime, and no secret is baked into the
image.

### Render (recommended)

`render.yaml` is a Render blueprint that creates everything the service needs:
a Postgres 16 database, a Redis instance, the HTTP service for `/admin` and the
`/api` routes, and a **separate worker service** that runs the BullMQ consumer.
Push the repository to GitHub, then in Render choose **New → Blueprint** and point
it at the repo. Render reads the file, provisions the datastores, wires
`DATABASE_URL` and `REDIS_URL` into both services, and runs `npm run db:migrate`
as a pre-deploy command. Fill in the `sync: false` secrets when prompted.

| Service | Command | Role |
| --- | --- | --- |
| `withdrawal-api` | `npm run start` | console + HTTP API, health check `/health` |
| `withdrawal-worker` | `npm run start:worker` | the only process that executes payouts |

Render is the right target rather than a serverless platform because the service
is not purely request/response: it holds a PostgreSQL pool, a BullMQ worker
draining Redis, a transactional-outbox publisher on a timer, and an SSE stream
held open per console session. Serverless platforms freeze between invocations
and cap response duration, which silently drops queued payouts and kills the
live stream.

### Vercel (console + API only)

`vercel.json` and `api/index.js` deploy the admin console and the HTTP API as a
single serverless function. Two caveats are deliberate:

- Set `OUTBOX_PUBLISHER_ENABLED=false`. The outbox publisher is a `setInterval`
  that would otherwise be respawned on every cold start. Payout execution still
  requires the long-lived worker from the Render blueprint.
- The console's SSE stream (`/api/admin/stream`) is subject to serverless
  response-duration limits, so live updates may drop. Deploy to Render for the
  full console.

The single rewrite in `vercel.json` sends every path except `/api/index` to the
function. The exclusion has to name *only* the function's own path: excluding the
whole `/api/` prefix instead would leave `/api/webhooks/payment`, every
`/api/admin/*` call and the phones' `/api/withdrawals/pending` poll unrouted, so
they would 404 with no error anywhere else.

#### Set the secrets on the platform, never in `vercel.json`

`vercel.json` is committed to a public repository, so no secret may appear in it.
Add these under **Project Settings → Environment Variables**:

```
DATABASE_URL          REDIS_URL             JWT_SECRET
ADMIN_USERNAME        ADMIN_PASSWORD        PAYMENT_WEBHOOK_SECRET
ADMIN_WITHDRAWAL_USER_ID
```

`vercel.json` only sets the three non-secret switches (`NODE_ENV`,
`TRUST_PROXY`, `OUTBOX_PUBLISHER_ENABLED`).

A deployment missing variables still boots: `config/env.ts` substitutes a
random per-process placeholder rather than crashing, so `/health` answers 200 and
the console shell renders. The affected endpoint then fails **closed** with an
actionable status instead of a bare 500:

| Missing | `/health` | Affected route |
| --- | --- | --- |
| `PAYMENT_WEBHOOK_SECRET` | 200 `degraded`, names it | `POST /api/webhooks/payment` → 503 |
| `ADMIN_API_KEY` / `ADMIN_USERNAME` | 200 `degraded`, names it | `/api/admin/*` → 503 |
| `DATABASE_URL` | 200 `degraded`, names it | data routes fail on connect |

`GET /health` lists the absent variable **names only**, never values, so it is
safe to expose and is the first thing to check when the deployment misbehaves.
A forged webhook signature is still rejected 401 even when configured — the
placeholder path never widens what the endpoint accepts.

### Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `ADMIN_USERNAME` | yes | console sign-in name |
| `ADMIN_PASSWORD` | yes | console sign-in password (alias of `ADMIN_API_KEY`) |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `WEBHOOK_SECRET` | yes | provider HMAC key (alias of `PAYMENT_WEBHOOK_SECRET`) |
| `JWT_SECRET` | yes | ≥ 32 characters |
| `ADMIN_WITHDRAWAL_USER_ID` | yes | UUID the phones poll as |
| `REDIS_URL` | yes | BullMQ connection string |
| `TRUST_PROXY` | no | `true` behind Render/Vercel/Fly so `X-Forwarded-For` is honoured |
| `OUTBOX_PUBLISHER_ENABLED` | no | `false` on serverless; defaults to `true` |
| `HOST` / `PORT` | no | default `0.0.0.0` / `3000` |

`ADMIN_PASSWORD` and `WEBHOOK_SECRET` are folded onto the canonical
`ADMIN_API_KEY` / `PAYMENT_WEBHOOK_SECRET` inside `parseEnv`, so both spellings
work. The canonical name always wins if both are set, which keeps existing
`.env` files and CI secret stores behaving exactly as before.

Leave `TRUST_PROXY` off when the service is exposed directly — with it on, a
client can spoof its own address through `X-Forwarded-For`, which feeds both the
rate limiter and the withdrawal's recorded `lastIp`.



### Channel onboarding

The dashboard opens on a channel picker with the two supported wallets — **Telebirr**
and **CBE** (Commercial Bank of Ethiopia) — each using its official mark and
accent colour (Telebirr blue `#0172bb`, CBE green `#007C4A` with the golden
`#F5C518` emblem). Picking one renders a
branded login form asking for the wallet phone number (a fixed `+251` prefix is
shown, the number itself is entered without it) and the PIN/password. The form
is re-themed at runtime through the `--brand` CSS variables, so both channels
share one code path.

Saving the form is the whole onboarding: `DashboardBridge.setCredentials()`
persists the login and starts `UssdPollingService` in the same call, so the
overlay closes straight onto the minimal active view — a layered neon-green
pulse orb above a glass status pill (`TELEBIRR • LIVE` / `CBE • LIVE`, tinted
with the channel's palette) and the settings gear — with no separate
"Start gateway" step. The active view carries no secondary copy: the orb alone
is the state. The overlay stays a gate for everything else: no payout
can be dialled before a login exists, so `UssdPollingService` skips work and
logs `Payout skipped · open the app and sign in to your channel first` until
`Credentials.isConfigured()` is true. Re-open the flow at any time from the
`Channel login` row on the dashboard or in Settings.

Credentials are stored in the app-private `SharedPreferences("ussd")` via
`Credentials`:

| Key | Contents |
| --- | --- |
| `login_phone` | Normalised local number, `09XXXXXXXX` |
| `login_pin` | The wallet PIN |
| `login_saved_at` | Epoch millis of the last save |
| `channel` | `TELEBIRR` or `CBE` |
| `gateway_active` | Set while the gateway is meant to be running |

`Credentials.save()` re-validates on the native side — the WebView is not a trust
boundary. `UssdAccessibilityService` reads the stored PIN when it answers a USSD
PIN prompt, falling back to the build-time `USSD_PIN` only when nothing is saved.
The page mirrors the channel and phone to `localStorage` under `ussd.credentials`
so the form survives a reload; **the PIN is deliberately never written to
`localStorage`**, and `getState()` returns only the channel and phone, so the
WebView cannot read the PIN back.

The gateway stays armed on its own. `UssdPollingService` sets `gateway_active`
while it runs and clears it on an explicit stop, so a process the system
reclaims is restarted by `START_STICKY`, a reboot is picked up by `BootReceiver`
(`RECEIVE_BOOT_COMPLETED`), and opening the app resumes polling whenever a saved
login exists — no tap on "Start gateway" is needed after onboarding.

Phone numbers are normalised identically on both sides (`+251…`, `251…`, `9…` and
`0…` all resolve to the local 10 digit form; only `07`/`09` prefixes are
accepted). `tests/dashboard-onboarding.test.ts` pins that contract so the page
and `Credentials.normalizePhone()` cannot drift apart.

### Mobile app / web admin boundary

The Android app is a **device client only**. Its UI is deliberately tiny: the
channel login form, and once the gateway is live, a centered glowing green circle
with a Settings icon in the top right. There are no analytics, transaction logs or
system controls on the phone — device fleet management, payout dispatching and
transaction history all live in the standalone web console at `/admin`.

`MainActivity.getState()` is the whole bridge contract and stays minimal: running
state, channel, SIM slot, permissions, SIM list, the activity log, and the saved
channel/phone. The PIN is never handed to the WebView, and no payout ledger is
exposed. `node check-dashboard.cjs` enforces this by failing if any admin marker
(`admin-view`, `admin-btn`, `renderAdmin`, `s.transactions || []`, `view=admin`,
…) ever reappears in `assets/dashboard.html`, and it still parses the page's inline
JavaScript so a broken script cannot ship.

Payout outcomes are therefore reported exactly once, by
`UssdAccessibilityService.sendWebhook()` to `POST /api/webhooks/payment`. The
server's `withdrawals` table is the single source of truth the console reads, so
no per-phone ledger is kept on the device.

### Build the Android APK

The backend URL is a build-time setting, not a runtime one, so the same project
produces a debug APK pointed at a laptop and a release APK pointed at the
deployed web admin without editing a line of source.
`android/app/build.gradle.kts` resolves each value from a Gradle property first,
then the matching environment variable, then a built-in default.

| Property | Default | Meaning |
| --- | --- | --- |
| `API_BASE_URL` | `http://10.0.2.2:3000/` | backend root; a trailing `/` is added if you omit it |
| `GATEWAY_USER_ID` | placeholder | must equal `ADMIN_WITHDRAWAL_USER_ID` on the server |
| `WEBHOOK_SECRET` | placeholder | must equal `PAYMENT_WEBHOOK_SECRET` on the server |
| `USSD_PREFIX` | `*806` | Telebirr USSD menu prefix |
| `USSD_PIN` | placeholder | fallback PIN when none is saved on the phone |

```text
npm run apk:debug
npm run apk:release -- --url https://withdrawal.example.com
```

`scripts/build-apk.mjs` also generates the Gradle wrapper when it is missing (the
wrapper is not committed; CI generates it the same way), so no separate Gradle
install is needed beyond a JDK 17 and the Android SDK. It expects `ANDROID_HOME`
or an `sdk.dir` entry in `android/local.properties`.

`npm run apk:release` fails fast when `GATEWAY_USER_ID`, `WEBHOOK_SECRET` or
`USSD_PIN` is still a `replace-with-…` placeholder — such a build would sign
webhooks with a published key and poll as nobody. The Gradle script enforces the
same rule independently, so `--release` cannot be bypassed. Values can be set
once in `android/local.properties` (git-ignored) instead of per build:

```properties
API_BASE_URL=https://withdrawal.example.com/
GATEWAY_USER_ID=11111111-1111-4111-8111-111111111111
WEBHOOK_SECRET=<matches PAYMENT_WEBHOOK_SECRET>
```

The finished APK is copied to `dist/apk/`:

```text
adb install -r dist/apk/app-release.apk
```

Debug and release are signed with the same committed `android/app/keystore.jks`,
so a new build replaces an installed copy in place without uninstalling — and
without losing the saved channel login.

**Cleartext HTTP.** Android blocks plain HTTP from API 28 and this app targets
35, so a release APK only talks to an HTTPS backend. That is why
`src/main/res/xml/network_security_config.xml` sets
`cleartextTrafficPermitted="false"`, while the debug source set overrides it to
`true` so a debug build can reach `http://10.0.2.2:3000/` or a LAN address. A
release build pointed at a plain-HTTP host fails with *"CLEARTEXT communication
not permitted"*; either serve the deployment over HTTPS or add that one host to
the main config rather than re-enabling cleartext globally.

> `WEBHOOK_SECRET` and `USSD_PIN` are compiled into `BuildConfig`, so they are
> recoverable by anyone who unpacks the APK. Scope the webhook key to what the
> phone actually needs and rotate it if an APK leaves a trusted network.


### Device polling and administration

Run every SQL file in `migrations/` with `npm run db:migrate`, then replace `ADMIN_API_KEY` in `.env` with a strong secret. The Android gateway sends `x-device-id` (the phone's stable `ANDROID_ID`) and `x-phone-model` while polling `GET /api/withdrawals/pending`; blocked devices receive `403` and cannot claim withdrawals. Device records are created on first poll.

Each poll also carries fleet telemetry — `x-device-channel`, `x-device-sim`, `x-device-carrier`, `x-device-battery` and `x-device-network` — which `claimPendingWithdrawals()` upserts onto `mobile_devices` in the same statement that claims the payout (migration `005_device_fleet.sql`). `DeviceTelemetry` reads the battery percentage and maps the active data connection to a `2G`/`3G`/`4G`/`5G`/`OFFLINE` label. Every header is optional and none of them gate the claim, so an older client keeps working; the server clamps the battery to the `0-100` range the column is `CHECK`ed against rather than rejecting the poll. Online/offline is derived in SQL from `last_seen_at` against a 90 second window, so the API and the dashboard can never disagree about it.

Manual payouts can be pinned to a single phone. `POST /api/admin/withdrawals` accepts an optional `targetDeviceId` that is either a registered device id or `"ANY"`; an omitted, blank or `"ANY"` value means auto-assignment and is stored as `NULL` in `withdrawals.target_device_id` (migration `004_target_device.sql`). `GET /api/withdrawals/pending` only returns payouts whose target is `NULL`, `"ANY"` or the polling device, so the Android app keeps sending its own device id to receive targeted work. Targeting an unregistered device returns `404`, targeting a blocked device returns `409`, and a targeted payout stays `PENDING` until that exact device polls.

The admin dashboard is available at `/admin` and is the **only** operations surface. Sign in with the administrator username and password from `.env` (`ADMIN_USERNAME` and `ADMIN_API_KEY`); the username is prefilled on the login form and the password is sent as the `x-admin-key` header alongside it as `x-admin-username`, so neither is ever stored on the device. It has three parts:

- **Device fleet** — every registered phone with its online/offline/blocked state, device id and model, active channel and SIM, a battery bar (tiered into `low` under 35% and `critical` under 15% so a flat phone is never dispatched to), and a network badge. Blocked outranks online so a blocked phone cannot be misread as ready.
- **Payout dispatcher** — the direct withdrawal form, including the `TARGET DEVICE` dropdown. It is populated from `GET /api/admin/devices` with each device's model, id and active/blocked status plus an "Any Available Device" auto-assign option; blocked devices stay listed but cannot be selected. Once a device is pinned the note under the control names the exact id that the payout will be routed to.
- **Transaction history** — a centralized ledger of every payout across the whole fleet, newest first, with transaction id, device, phone, amount, channel, status and creation time. A payout that was auto-assigned has no recorded owner, so its device column reads "Unassigned" rather than attributing it to a phone that merely happens to be online.

The protected admin API also exposes `GET /api/admin/overview`, `GET /api/admin/devices`, `GET /api/admin/transactions` (with an optional `?limit=`, clamped to 1-200), and `PATCH /api/admin/devices/:deviceId` with `{ "activeStatus": false }` to block or `true` to unblock a device. The console renders with the Helmet Content Security Policy in force, so it loads its UI script from the same-origin asset `/admin/app.js` and binds every interaction with event listeners instead of inline handlers.

`tests/admin-dashboard.test.ts` drives the real `/admin` page and its real client in jsdom against a stubbed admin API: the fleet columns and battery tiers, the online summary and empty states, the target-device dropdown including the disabled blocked entry, the device id actually sent to `POST /api/admin/withdrawals`, and the transaction rows and their "Unassigned" labelling.

`npm run admin:preview` goes one step further and exercises the console over real HTTP against a running server with a stubbed database pool: it boots the built app, requests `/admin` and `/admin/app.js`, checks the fleet/history/dispatch panels are present and that no mobile markup leaked in, confirms the admin API rejects a bad key and answers an authorised one, and verifies the transaction history joins its target device while leaving an auto-assigned payout unassigned.

To inspect the console in a browser, `npm run admin:ui` serves it on `http://localhost:3000/admin` (falling back to the next free port) and opens it. `scripts/admin-ui-preview.js` serves the real page and the real client from the built controller, with only the admin API mocked over an in-memory fleet — so Block/Unblock, the target-device dropdown and creating a payout all really work, and a payout you create shows up in Transaction history. It checks the same `ADMIN_USERNAME` / `ADMIN_API_KEY` pair as the real API, so the credentials in `.env` are the ones that unlock it. Query params for reviewing the awkward states: `?devices=0` / `?txns=0` for the empty states, and `?reject=1` to make a dispatch fail so the error toast can be seen. `npm run admin:ui -- --open` reopens the tab without restarting, `/__reset` restores the seed data, and `/__shutdown` stops the server. The page is generated from source, so after editing `admin-dashboard.controller.ts` run `npm run build` to pick the change up.

`npm run ui:dev` (`node scripts/ui-preview.js`) mounts the same console at `/admin` on port 3000 alongside the Android dashboard preview, using the shared harness in `scripts/admin-console.preview.js`, so the sign-in flow can be checked from either preview without a database.

When PostgreSQL and Redis are unavailable locally, keep `LOCAL_INFRA_FALLBACK=true` to start the API in degraded mode. The API will report `degraded` from `/health` and will not start the outbox publisher; withdrawal persistence and queue processing remain unavailable until infrastructure is running. Set `LOCAL_INFRA_FALLBACK=false` when using real local infrastructure, and never enable it in production.

### Android signing key

`android/app/keystore.jks` is a fixed JKS keystore that signs both the debug and the release build, so the APK published by the `Android Build` workflow and a local `./gradlew assembleDebug` carry the same certificate and a newer build installs over an existing install instead of requiring an uninstall. Alias `androiddebugkey`, store and key password `android`.

Regenerate it only if the file is lost — a new key changes the signature, so the app has to be uninstalled once before the next install:

```bash
# Run from the repository root; CI reads the same file as app/keystore.jks
# from its android/ working directory.
keytool -genkeypair -v -keystore android/app/keystore.jks -storetype JKS \
  -storepass android -keypass android -alias androiddebugkey \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Android Debug,O=Android,C=US"
```

## API

```text
POST /api/withdrawals
GET /api/withdrawals/:id
POST /api/withdrawals/:id/cancel
GET /health
```

The request's `userId` must match the authenticated `x-user-id`. The worker uses a stable BullMQ job ID and provider transaction ID, so duplicate job delivery does not initiate a second mock payment.