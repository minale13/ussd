/**
 * Shared plumbing for the preview servers that render the admin console.
 *
 * Both `scripts/ui-preview.js` (the Android dashboard preview, which now also
 * mounts the console at `/admin`) and `scripts/admin-ui-preview.js` serve the
 * same real page and real client out of `dist/`, and both mock the admin API
 * over an in-memory fleet. Keeping the fixtures, the page loader and the API
 * handler here means the two harnesses can never drift apart, and it means the
 * configured `ADMIN_USERNAME` / `ADMIN_API_KEY` are enforced identically by
 * whichever preview happens to be on port 3000.
 *
 * Nothing in this file touches a database; it is dev-only code and is never
 * part of the shipped server.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CONTROLLER_DIR = path.join(ROOT, "src", "controllers");
export const BUILD = path.join(ROOT, "dist", "src", "controllers", "admin-dashboard.controller.js");
export const WATCHED = "admin-dashboard.controller.ts";

/** Every screen of the console serves the same single-page shell. */
export const CONSOLE_SECTIONS = [
  "/admin", "/admin/transactions", "/admin/devices", "/admin/more",
  "/admin/send", "/admin/device", "/admin/notifications", "/admin/profile",
];

export const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const secondsAgo = (n) => new Date(Date.now() - n * 1000).toISOString();

// A representative fleet: healthy Telebirr phones, a CBE phone on SIM 2, a
// nearly-flat one, one that has gone quiet (offline), a blocked phone, and one
// that reports no telemetry at all - every row state the console must render.
function seedDevices() {
  return [
    { device_id: "a1b2c3d4e5f60001", phone_model: "Tecno Spark 8", active_status: true, sim_slot: 0, channel: "TELEBIRR", carrier: "Ethio Telecom", battery_level: 82, network_type: "4G", app_version: "2.0.0", last_ip: "196.188.44.12", online: true, last_seen_at: secondsAgo(4) },
    { device_id: "a1b2c3d4e5f60002", phone_model: "Samsung Galaxy A12", active_status: true, sim_slot: 1, channel: "CBE", carrier: "Safaricom", battery_level: 46, network_type: "4G", app_version: "2.0.0", last_ip: "196.188.44.87", online: true, last_seen_at: secondsAgo(9) },
    { device_id: "a1b2c3d4e5f60003", phone_model: "Infinix Hot 30", active_status: true, sim_slot: 0, channel: "TELEBIRR", carrier: "Ethio Telecom", battery_level: 12, network_type: "2G", app_version: "1.9.4", last_ip: "10.44.2.19", online: true, last_seen_at: secondsAgo(21) },
    { device_id: "a1b2c3d4e5f60004", phone_model: "Tecno Camon 20", active_status: true, sim_slot: 1, channel: "CBE", carrier: "Etharicom", battery_level: 63, network_type: "3G", app_version: "2.0.0", last_ip: "196.188.51.3", online: false, last_seen_at: secondsAgo(37 * 60) },
    { device_id: "a1b2c3d4e5f60005", phone_model: "Nokia G11 Plus", active_status: false, sim_slot: 0, channel: "TELEBIRR", carrier: "Ethio Telecom", battery_level: 55, network_type: "4G", app_version: "2.0.0", last_ip: "196.188.44.140", online: true, last_seen_at: secondsAgo(12) },
    // Never reported telemetry, so the app has to degrade rather than invent it.
    { device_id: "a1b2c3d4e5f60006", phone_model: "Realme C25", active_status: true, sim_slot: null, channel: null, carrier: null, battery_level: null, network_type: null, app_version: null, last_ip: null, online: true, last_seen_at: secondsAgo(2) },
  ];
}

/**
 * The cash-in feed behind the "Cash-in" filter tab.
 *
 * These are bank credit SMS the handsets forwarded, which is a different thing
 * from the payout ledger: money arriving on a device's SIM rather than a payout
 * the gateway sent. The client keeps them in a separate store.
 */
function seedCashIns() {
  return [
    { id: "sms-preview-1", device_id: "a1b2c3d4e5f60001", provider: "telebirr", sender: "127", direction: "CREDIT", amount: "5000.00", counterparty: "0911234567", account_balance: "12450.00", received_at: secondsAgo(6 * 60) },
    { id: "sms-preview-2", device_id: "a1b2c3d4e5f60002", provider: "cbe", sender: "8290", direction: "CREDIT", amount: "12500.00", counterparty: "0934455667", account_balance: "48200.00", received_at: secondsAgo(42 * 60) },
    { id: "sms-preview-3", device_id: "a1b2c3d4e5f60001", provider: "telebirr", sender: "127", direction: "DEBIT", amount: "300.00", counterparty: "0945566778", account_balance: "12150.00", received_at: secondsAgo(75 * 60) },
  ];
}

function seedTransactions() {
  return [
    { transaction_id: "WD-7F3A21C9D4E81056", amount: "1250.00", currency: "ETB", destination: "0911234567", status: "COMPLETED", channel: "TELEBIRR", device_id: "a1b2c3d4e5f60001", device_model: "Tecno Spark 8", created_at: secondsAgo(95) },
    { transaction_id: "WD-2B8E44F17A2C6D03", amount: "480.50", currency: "ETB", destination: "0923344556", status: "PROCESSING", channel: "CBE", device_id: "a1b2c3d4e5f60002", device_model: "Samsung Galaxy A12", created_at: secondsAgo(14 * 60) },
    { transaction_id: "WD-9C5D12E83F604B77", amount: "75.00", currency: "ETB", destination: "0934455667", status: "FAILED", channel: "TELEBIRR", device_id: "a1b2c3d4e5f60003", device_model: "Infinix Hot 30", created_at: secondsAgo(52 * 60) },
    { transaction_id: "WD-44E8B0C6D25A1F92", amount: "2100.00", currency: "ETB", destination: "0945566778", status: "PENDING", channel: "CBE", device_id: "a1b2c3d4e5f60004", device_model: "Tecno Camon 20", created_at: secondsAgo(3 * 60 * 60) },
    { transaction_id: "WD-1D6F39B0A7C8E241", amount: "320.75", currency: "ETB", destination: "0956677889", status: "COMPLETED", channel: "TELEBIRR", device_id: null, device_model: null, created_at: secondsAgo(26 * 60 * 60) },
  ];
}

/**
 * The withdrawal queue mirrors the ledger but carries the operational columns
 * the Withdrawals view needs: attempt count and failure reason, plus a stable id
 * so a cancel can address one row.
 */
function seedWithdrawals() {
  return seedTransactions().map((row, index) => ({
    id: `wd-${index + 1}`,
    ...row,
    destination_type: "PHONE",
    notes: null,
    failure_reason: row.status === "FAILED" ? "Provider rejected the payout" : null,
    provider_transaction_id: row.status === "COMPLETED" ? `prov-${index}` : null,
    target_device_id: row.device_id,
    user_id: "11111111-1111-4111-8111-111111111111",
    attempt_count: row.status === "COMPLETED" ? 1 : row.status === "FAILED" ? 3 : 0,
    updated_at: row.created_at,
  }));
}

/** Sample wallets so the Users view has real balances to render. */
function seedUsers() {
  return [
    { id: "11111111-1111-4111-8111-111111111111", email: "ops@telebirr.et", available_balance: "18450.25", reserved_balance: "2100.00", currency: "ETB", has_wallet: true, withdrawal_count: 5, last_withdrawal_at: secondsAgo(95), is_admin_user: true },
    { id: "22222222-2222-4222-8222-222222222222", email: "merchant@example.com", available_balance: "1200.00", reserved_balance: "0.00", currency: "ETB", has_wallet: true, withdrawal_count: 2, last_withdrawal_at: secondsAgo(14 * 60), is_admin_user: false },
    { id: "33333333-3333-4333-8333-333333333333", email: "agent@merchant.et", available_balance: "0.00", reserved_balance: "0.00", currency: "ETB", has_wallet: false, withdrawal_count: 0, last_withdrawal_at: null, is_admin_user: false },
  ];
}

/** Webhooks, attempts and outbox delivery, merged into one activity feed. */
function seedActivity() {
  return [
    { kind: "webhook", title: "payment.succeeded", detail: "telebirr", level: "info", settled: true, created_at: secondsAgo(30) },
    { kind: "attempt", title: "payout attempt 1", detail: "COMPLETED", level: "info", settled: true, created_at: secondsAgo(95) },
    { kind: "outbox", title: "withdrawal.completed", detail: "published", level: "info", settled: true, created_at: secondsAgo(140) },
    { kind: "webhook", title: "payment.received", detail: "cbe", level: "error", settled: false, created_at: secondsAgo(52 * 60) },
    { kind: "outbox", title: "withdrawal.failed", detail: "unpublished", level: "warn", settled: false, created_at: secondsAgo(3 * 60 * 60) },
  ];
}

// The in-memory fleet both previews serve. `reset()` restores the seed rows so
// /__reset and a fresh run always start from the same fixture.
export let devices = seedDevices();
export let transactions = seedTransactions();
export let withdrawals = seedWithdrawals();
export let users = seedUsers();
export let activity = seedActivity();
export let cashIns = seedCashIns();

export function reset() {
  devices = seedDevices();
  transactions = seedTransactions();
  withdrawals = seedWithdrawals();
  users = seedUsers();
  activity = seedActivity();
  cashIns = seedCashIns();
}

// ---------------------------------------------------------------------------
// The real page + real client, pulled from the built controller.
// ---------------------------------------------------------------------------
let view = null;

export async function loadConsole() {
  if (!fs.existsSync(BUILD)) {
    throw new Error("dist/ is missing - run `npm run build` first.");
  }
  // The cache-busting query forces a re-read so a rebuild is picked up.
  const mod = await import(`file://${BUILD.replace(/\\/g, "/")}?t=${Date.now()}`);
  const collect = () => ({
    headers: {},
    contentType: "",
    payload: "",
    header(k, v) { this.headers[String(k).toLowerCase()] = v; return this; },
    type(v) { this.contentType = v; return this; },
    send(p) { this.payload = String(p); return this; },
  });
  const page = collect();
  const script = collect();
  await mod.dashboard({}, page);
  await mod.dashboardScript({}, script);
  view = { html: page.payload, js: script.payload };
  return view;
}

/** The cached console view, loading it on first use. */
export async function getConsole() {
  if (!view) await loadConsole();
  return view;
}

/** Drop the cache so the next request picks up a rebuilt controller. */
export function invalidateConsole() {
  view = null;
}

export const LIVE_RELOAD = `<script>
/* UI preview harness - served only by the preview servers, never committed. */
(function () {
  "use strict";
  try {
    var source = new EventSource("/__livereload");
    source.addEventListener("message", function (event) {
      if (event.data === "reload") location.reload();
    });
  } catch (err) { console.warn("live reload unavailable", err); }
})();
</script>`;

export function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": MIME[".json"],
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

export function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

export const errorPage = (message) => `<!doctype html><meta charset="utf-8">
<title>Admin preview</title>
<body style="font:15px/1.6 system-ui;background:#090d16;color:#f6f9fc;padding:48px">
<h1 style="font-size:20px">Admin preview cannot start</h1>
<pre style="color:#fda4af;white-space:pre-wrap">${message}</pre></body>`;

// ---------------------------------------------------------------------------
// Credentials. The console signs in with the ADMIN_USERNAME / ADMIN_API_KEY pair
// from the environment (.env is loaded so a preview started straight from the
// shell sees the same values as the API), and every /api/admin/ call is checked
// against them exactly like the real `authenticateAdmin` middleware does.
// ---------------------------------------------------------------------------
dotenv.config({ path: path.join(ROOT, ".env") });

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
export const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

/** True when the request carries the configured admin username + key. */
export function isAuthorized(req) {
  const username = req.headers["x-admin-username"];
  const key = req.headers["x-admin-key"];
  return Boolean(ADMIN_API_KEY) && username === ADMIN_USERNAME && key === ADMIN_API_KEY;
}

/** The 401 body the real middleware sends, so the client shows its message. */
export function deny(res) {
  return sendJson(res, 401, { success: false, error: "Admin authentication required" });
}

const clamp = (value, fallback) => {
  const requested = Number(value ?? fallback);
  return Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), 200) : fallback;
};

/**
 * The mocked admin API. Returns true when the route was handled.
 *
 * Auth is enforced first: a sign-in with the wrong username or password gets
 * the same 401 the real server returns, which is what keeps the login flow
 * honest in the preview. ?devices=0 / ?txns=0 empty a table for reviewing the
 * empty state, and ?reject=1 makes a dispatch fail so the error toast can be
 * reviewed too.
 */
export async function handleAdminApi(req, res, url) {
  const route = url.pathname;
  if (!route.startsWith("/api/admin/")) return false;
  if (!isAuthorized(req)) { deny(res); return true; }

  const emptied = (rows) => (url.searchParams.get("devices") === "0" || url.searchParams.get("txns") === "0" ? [] : rows);

  if (req.method === "GET" && route === "/api/admin/overview") {
    sendJson(res, 200, {
      success: true,
      overview: { total_cash_in: "184250.00", total_withdrawals: "42305.25", remaining_balance: "141944.75" },
    });
    return true;
  }

  if (req.method === "GET" && route === "/api/admin/devices") {
    sendJson(res, 200, { success: true, devices: emptied(devices) });
    return true;
  }

  if (req.method === "GET" && route === "/api/admin/transactions") {
    // Same clamp the real controller applies, so the limit behaves identically.
    sendJson(res, 200, { success: true, transactions: emptied(transactions).slice(0, clamp(url.searchParams.get("limit"), 50)) });
    return true;
  }

  // The queue applies the same status/channel filters as the real controller,
  // so an operator can preview a filtered view without a database.
  if (req.method === "GET" && route === "/api/admin/withdrawals") {
    const status = url.searchParams.get("status");
    const channel = url.searchParams.get("channel");
    let rows = emptied(withdrawals);
    if (status) rows = rows.filter((row) => row.status === status);
    if (channel) rows = rows.filter((row) => row.channel === channel);
    sendJson(res, 200, { success: true, withdrawals: rows.slice(0, clamp(url.searchParams.get("limit"), 25)) });
    return true;
  }

  // Cancelling a settled payout is refused, mirroring the real state machine.
  if (req.method === "POST" && route.startsWith("/api/admin/withdrawals/") && route.endsWith("/cancel")) {
    const id = decodeURIComponent(route.slice("/api/admin/withdrawals/".length, -"/cancel".length));
    const row = withdrawals.find((w) => w.id === id);
    if (!row) { sendJson(res, 404, { success: false, error: "Withdrawal not found" }); return true; }
    if (row.status !== "PENDING") {
      sendJson(res, 409, { success: false, error: `A ${row.status} withdrawal can no longer be cancelled` });
      return true;
    }
    row.status = "CANCELLED";
    console.log("[preview] withdrawal", row.transaction_id, "→ CANCELLED");
    sendJson(res, 200, { success: true, withdrawal: row });
    return true;
  }

  if (req.method === "GET" && route === "/api/admin/users") {
    sendJson(res, 200, { success: true, users: users.slice(0, clamp(url.searchParams.get("limit"), 25)) });
    return true;
  }

  if (req.method === "GET" && route === "/api/admin/activity") {
    const level = url.searchParams.get("level");
    const rows = level ? activity.filter((row) => row.level === level) : activity;
    sendJson(res, 200, { success: true, activity: rows.slice(0, clamp(url.searchParams.get("limit"), 50)) });
    return true;
  }

  if (req.method === "GET" && route === "/api/admin/settings") {
    // Read-only and deliberately free of any secret: this is what the browser
    // is allowed to see.
    const online = devices.filter((d) => d.online).length;
    sendJson(res, 200, {
      success: true,
      settings: {
        read_only: true,
        environment: "development",
        local_infra_fallback: true,
        channels: ["TELEBIRR", "CBE"],
        currency: "ETB",
        min_withdrawal: "1.00",
        max_withdrawal: "100000.00",
        worker_concurrency: 10,
        processing_timeout_seconds: 300,
        device_online_window_seconds: 90,
        auto_refresh_seconds: 30,
        health: {
          devices_total: devices.length,
          devices_online: online,
          pending_withdrawals: withdrawals.filter((w) => w.status === "PENDING").length,
          processing_withdrawals: withdrawals.filter((w) => w.status === "PROCESSING").length,
          failed_withdrawals: withdrawals.filter((w) => w.status === "FAILED").length,
          outbox_backlog: activity.filter((row) => row.level === "warn").length,
          rejected_webhooks: activity.filter((row) => row.level === "error").length,
        },
      },
    });
    return true;
  }

  if (req.method === "GET" && route === "/api/admin/sms") {
    // The cash-in feed. Only CREDIT messages become cash-in cards; the rest
    // are kept so the DEBIT direction can be seen being filtered out.
    sendJson(res, 200, { success: true, events: cashIns.slice(0, clamp(url.searchParams.get("limit"), 50)) });
    return true;
  }

  if (req.method === "GET" && route === "/api/admin/stream") {
    // A real SSE stream, so the client's reader is exercised rather than
    // falling straight through to its catch branch. Nothing is published in
    // the preview, so it only carries the opening frame and heartbeats.
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("event: ready\ndata: {}\n\n");
    const beat = setInterval(() => { try { res.write(": ping\n\n"); } catch { /* closed */ } }, 15000);
    req.on("close", () => clearInterval(beat));
    return true;
  }

  if (req.method === "POST" && route.startsWith("/api/admin/devices/") && route.endsWith("/restart")) {
    const id = decodeURIComponent(route.slice("/api/admin/devices/".length, -"/restart".length));
    const device = devices.find((d) => d.device_id === id);
    if (!device) { sendJson(res, 404, { success: false, error: "Device not found" }); return true; }
    // Mirrors the real service: clear the address and network telemetry and
    // let the phone re-register on its next poll.
    device.last_ip = null;
    device.network_type = null;
    console.log("[preview] restart requested for", id);
    sendJson(res, 200, { success: true, device });
    return true;
  }

  if (req.method === "PATCH" && route.startsWith("/api/admin/devices/")) {
    const id = decodeURIComponent(route.slice("/api/admin/devices/".length));
    const body = await readBody(req);
    const device = devices.find((d) => d.device_id === id);
    if (!device) { sendJson(res, 404, { success: false, error: "Device not found" }); return true; }
    if (typeof body.activeStatus !== "boolean") {
      sendJson(res, 400, { success: false, error: "activeStatus must be boolean" });
      return true;
    }
    device.active_status = body.activeStatus;
    console.log("[preview] device", id, "→", body.activeStatus ? "active" : "blocked");
    sendJson(res, 200, { success: true, device });
    return true;
  }

  if (req.method === "POST" && route === "/api/admin/withdrawals") {
    const body = await readBody(req);
    const target = typeof body.targetDeviceId === "string" && body.targetDeviceId !== "ANY" ? body.targetDeviceId : null;
    // ?reject=1 forces the failure path so the error toast can be reviewed.
    if (url.searchParams.get("reject") === "1") {
      sendJson(res, target ? 409 : 400, {
        success: false,
        error: target ? "Target device is blocked" : "Invalid manual withdrawal request",
      });
      return true;
    }
    const device = target ? devices.find((d) => d.device_id === target) : null;
    if (target && !device) { sendJson(res, 404, { success: false, error: "Target device is not registered" }); return true; }
    if (device && !device.active_status) { sendJson(res, 409, { success: false, error: "Target device is blocked" }); return true; }
    const id = `WD-PREVIEW${Math.floor(Math.random() * 90000 + 10000)}`;
    transactions.unshift({
      transaction_id: id,
      amount: Number(body.amount || 0).toFixed(2),
      currency: "ETB",
      destination: body.destinationPhone || "—",
      status: "PENDING",
      channel: body.channel || null,
      device_id: device ? device.device_id : null,
      device_model: device ? device.phone_model : null,
      created_at: new Date().toISOString(),
    });
    console.log("[preview] payout", id, "→", device ? device.device_id : "auto-assign");
    sendJson(res, 202, { success: true, withdrawal: transactions[0] });
    return true;
  }

  sendJson(res, 404, { success: false, error: "Not found" });
  return true;
}

/**
 * The console itself: every screen serves the same shell, /admin/app.js serves
 * the real client, and /health answers the splash check. Returns true when the
 * route was handled so the host preview can fall through to its own routes.
 */
export async function handleConsole(req, res, url) {
  const route = url.pathname;

  if (CONSOLE_SECTIONS.includes(route)) {
    try {
      const current = await getConsole();
      res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" });
      res.end(current.html.replace(/<\/head>/i, LIVE_RELOAD + "</head>"));
    } catch (err) {
      res.writeHead(500, { "Content-Type": MIME[".html"] });
      res.end(errorPage(err.message));
    }
    return true;
  }

  if (route === "/admin/app.js") {
    try {
      const current = await getConsole();
      res.writeHead(200, { "Content-Type": MIME[".js"], "Cache-Control": "no-store" });
      res.end(current.js);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return true;
  }

  // Public in the real server too, and the splash screen's connection indicator
  // reads it before sign-in.
  if (route === "/health") {
    sendJson(res, 200, { status: "ok", database: "required", redis: "required" });
    return true;
  }

  return handleAdminApi(req, res, url);
}






