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

## Android gateway and administration

Run every SQL file in `migrations/` with `npm run db:migrate`, then replace `ADMIN_API_KEY` in `.env` with a strong secret. The Android gateway sends `x-device-id` (the phone's stable `ANDROID_ID`) and `x-phone-model` while polling `GET /api/withdrawals/pending`; blocked devices receive `403` and cannot claim withdrawals. Device records are created on first poll.

Manual payouts can be pinned to a single phone. `POST /api/admin/withdrawals` accepts an optional `targetDeviceId` that is either a registered device id or `"ANY"`; an omitted, blank or `"ANY"` value means auto-assignment and is stored as `NULL` in `withdrawals.target_device_id` (migration `004_target_device.sql`). `GET /api/withdrawals/pending` only returns payouts whose target is `NULL`, `"ANY"` or the polling device, so the Android app keeps sending its own device id to receive targeted work. Targeting an unregistered device returns `404`, targeting a blocked device returns `409`, and a targeted payout stays `PENDING` until that exact device polls.

The admin dashboard is available at `/admin`. Enter the admin key in the page to load the financial overview and connected devices, then pick a `TARGET DEVICE` in the direct withdrawal form — the dropdown is populated from `GET /api/admin/devices` with each device's name, id and active/blocked status, plus an "Any Available Device" auto-assign option. The protected admin API also exposes `GET /api/admin/overview`, `GET /api/admin/devices`, and `PATCH /api/admin/devices/:deviceId` with `{ "activeStatus": false }` to block or `true` to unblock a device. The console renders with the Helmet Content Security Policy in force, so it loads its UI script from the same-origin asset `/admin/app.js` and binds every interaction with event listeners instead of inline handlers.

When PostgreSQL and Redis are unavailable locally, keep `LOCAL_INFRA_FALLBACK=true` to start the API in degraded mode. The API will report `degraded` from `/health` and will not start the outbox publisher; withdrawal persistence and queue processing remain unavailable until infrastructure is running. Set `LOCAL_INFRA_FALLBACK=false` when using real local infrastructure, and never enable it in production.

### Android signing key

`android/app/keystore.jks` is a fixed JKS keystore that signs both the debug and the release build, so the APK published by the `Android Build` workflow and a local `./gradlew assembleDebug` carry the same certificate and a newer build installs over an existing install instead of requiring an uninstall. Alias `androiddebugkey`, store and key password `android`.

Regenerate it only if the file is lost — a new key changes the signature, so the app has to be uninstalled once before the next install:

```bash
keytool -genkeypair -v -keystore app/keystore.jks -storetype JKS \
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