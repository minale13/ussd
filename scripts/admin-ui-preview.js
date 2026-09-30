#!/usr/bin/env node
/**
 * UI preview server for the standalone Web Admin Dashboard (the console the API
 * serves at /admin). It renders the REAL page and the REAL client script from
 * src/controllers/admin-dashboard.controller.ts, so what you inspect in the
 * browser is exactly what ships - only the three admin API reads are mocked.
 *
 * Dev-only extras, mirroring scripts/ui-preview.js:
 *
 *  1. A mock admin API over an in-memory fleet, so every control works with no
 *     database:
 *       GET   /api/admin/overview        cash-in / withdrawals / balance
 *       GET   /api/admin/devices         the device fleet (mixed states)
 *       GET   /api/admin/transactions    the centralized payout ledger
 *       PATCH /api/admin/devices/:id     Block / Unblock really toggles the row
 *       POST  /api/admin/withdrawals     creates a real PENDING payout, which
 *                                         then appears in Transaction history
 *     Any admin key unlocks. ?devices=0 or ?txns=0 empties a table to review
 *     the empty state, and ?reject=1 makes a dispatch fail so the error toast
 *     (404 unknown / 409 blocked) can be reviewed too.
 *  2. An SSE live-reload client watching the console's source.
 *
 * Endpoints: /admin  /admin/app.js  /__livereload (SSE)
 *            /__status (JSON)  /__reset (restore seed data)  /__shutdown
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTROLLER_DIR = path.join(ROOT, "src", "controllers");
const BUILD = path.join(ROOT, "dist", "src", "controllers", "admin-dashboard.controller.js");
const WATCHED = "admin-dashboard.controller.ts";

const MIME = {
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
    { device_id: "a1b2c3d4e5f60001", phone_model: "Tecno Spark 8", active_status: true, sim_slot: 0, channel: "TELEBIRR", carrier: "Ethio Telecom", battery_level: 82, network_type: "4G", online: true, last_seen_at: secondsAgo(4) },
    { device_id: "a1b2c3d4e5f60002", phone_model: "Samsung Galaxy A12", active_status: true, sim_slot: 1, channel: "CBE", carrier: "Safaricom", battery_level: 46, network_type: "4G", online: true, last_seen_at: secondsAgo(9) },
    { device_id: "a1b2c3d4e5f60003", phone_model: "Infinix Hot 30", active_status: true, sim_slot: 0, channel: "TELEBIRR", carrier: "Ethio Telecom", battery_level: 12, network_type: "2G", online: true, last_seen_at: secondsAgo(21) },
    { device_id: "a1b2c3d4e5f60004", phone_model: "Tecno Camon 20", active_status: true, sim_slot: 1, channel: "CBE", carrier: "Etharicom", battery_level: 63, network_type: "3G", online: false, last_seen_at: secondsAgo(37 * 60) },
    { device_id: "a1b2c3d4e5f60005", phone_model: "Nokia G11 Plus", active_status: false, sim_slot: 0, channel: "TELEBIRR", carrier: "Ethio Telecom", battery_level: 55, network_type: "4G", online: true, last_seen_at: secondsAgo(12) },
    { device_id: "a1b2c3d4e5f60006", phone_model: "Realme C25", active_status: true, sim_slot: null, channel: null, carrier: null, battery_level: null, network_type: null, online: true, last_seen_at: secondsAgo(2) },
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

let devices = seedDevices();
let transactions = seedTransactions();

const reset = () => {
  devices = seedDevices();
  transactions = seedTransactions();
};
// ---------------------------------------------------------------------------
// The real page + real client, pulled from the built controller.
// ---------------------------------------------------------------------------
async function loadConsole() {
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
  return { html: page.payload, js: script.payload };
}

const LIVE_RELOAD = `<script>
/* UI preview harness - served only by scripts/admin-ui-preview.js, never committed. */
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

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
const clients = new Set();
let shuttingDown = false;
let view = null;
let port = Number(process.env.PORT) || 3000;

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": MIME[".json"],
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function broadcastReload(cause) {
  console.log("[preview] change →", cause, clients.size ? "(reloading)" : "(no client yet)");
  for (const res of clients) {
    try { res.write("data: reload\n\n"); } catch { /* client went away */ }
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

const errorPage = (message) => `<!doctype html><meta charset="utf-8">
<title>Admin preview</title>
<body style="font:15px/1.6 system-ui;background:#090d16;color:#f6f9fc;padding:48px">
<h1 style="font-size:20px">Admin preview cannot start</h1>
<pre style="color:#fda4af;white-space:pre-wrap">${message}</pre></body>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const route = url.pathname;

  // The console itself. "/" is an alias so the preview always lands on it.
  if (route === "/admin" || route === "/") {
    if (!view) {
      try {
        view = await loadConsole();
      } catch (err) {
        res.writeHead(500, { "Content-Type": MIME[".html"] });
        return res.end(errorPage(err.message));
      }
    }
    res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" });
    return res.end(view.html.replace(/<\/head>/i, LIVE_RELOAD + "</head>"));
  }

  if (route === "/admin/app.js") {
    if (!view) {
      try {
        view = await loadConsole();
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }
    res.writeHead(200, { "Content-Type": MIME[".js"], "Cache-Control": "no-store" });
    return res.end(view.js);
  }

  // --- mocked admin API ----------------------------------------------------
  // Any admin key unlocks: the real auth middleware is the API's job, not the
  // preview's, and requiring a secret here would only get in the way.
  if (route.startsWith("/api/admin/")) {
    const emptied = (rows) => (url.searchParams.get("devices") === "0" || url.searchParams.get("txns") === "0" ? [] : rows);

    if (req.method === "GET" && route === "/api/admin/overview") {
      return sendJson(res, 200, {
        success: true,
        overview: { total_cash_in: "184250.00", total_withdrawals: "42305.25", remaining_balance: "141944.75" },
      });
    }

    if (req.method === "GET" && route === "/api/admin/devices") {
      return sendJson(res, 200, { success: true, devices: emptied(devices) });
    }

    if (req.method === "GET" && route === "/api/admin/transactions") {
      // Same clamp the real controller applies, so the limit behaves identically.
      const requested = Number(url.searchParams.get("limit") ?? 50);
      const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), 200) : 50;
      return sendJson(res, 200, { success: true, transactions: emptied(transactions).slice(0, limit) });
    }

    if (req.method === "PATCH" && route.startsWith("/api/admin/devices/")) {
      const id = decodeURIComponent(route.slice("/api/admin/devices/".length));
      const body = await readBody(req);
      const device = devices.find((d) => d.device_id === id);
      if (!device) return sendJson(res, 404, { success: false, error: "Device not found" });
      if (typeof body.activeStatus !== "boolean") {
        return sendJson(res, 400, { success: false, error: "activeStatus must be boolean" });
      }
      device.active_status = body.activeStatus;
      console.log("[preview] device", id, "→", body.activeStatus ? "active" : "blocked");
      return sendJson(res, 200, { success: true, device });
    }

    if (req.method === "POST" && route === "/api/admin/withdrawals") {
      const body = await readBody(req);
      const target = typeof body.targetDeviceId === "string" && body.targetDeviceId !== "ANY" ? body.targetDeviceId : null;
      // ?reject=1 forces the failure path so the error toast can be reviewed.
      if (url.searchParams.get("reject") === "1") {
        return sendJson(res, target ? 409 : 400, {
          success: false,
          error: target ? "Target device is blocked" : "Invalid manual withdrawal request",
        });
      }
      const device = target ? devices.find((d) => d.device_id === target) : null;
      if (target && !device) return sendJson(res, 404, { success: false, error: "Target device is not registered" });
      if (device && !device.active_status) return sendJson(res, 409, { success: false, error: "Target device is blocked" });
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
      return sendJson(res, 202, { success: true, withdrawal: transactions[0] });
    }

    return sendJson(res, 404, { success: false, error: "Not found" });
  }

  if (route === "/__livereload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("retry: 2000\n\n");
    clients.add(res);
    const heartbeat = setInterval(() => { try { res.write(": ping\n\n"); } catch {} }, 15000);
    req.on("close", () => { clearInterval(heartbeat); clients.delete(res); });
    return;
  }

  if (route === "/__status") {
    return sendJson(res, 200, {
      page: view ? "ready" : "loading",
      build: fs.existsSync(BUILD) ? "present" : "missing",
      devices: devices.length,
      transactions: transactions.length,
      url: `http://localhost:${port}/admin`,
    });
  }

  if (route === "/__reset") {
    reset();
    return sendJson(res, 200, { ok: true, devices: devices.length, transactions: transactions.length });
  }

  if (route === "/__shutdown") {
    sendJson(res, 200, { ok: true });
    return shutdown();
  }

  sendJson(res, 404, { error: "not found" });
});

// ---------------------------------------------------------------------------
// Watcher: the page is generated from source, so a change only takes effect
// after `npm run build`. The reload nudges the browser; the rebuild is manual.
// ---------------------------------------------------------------------------
let reloadTimer = null;
try {
  fs.watch(CONTROLLER_DIR, (event, name) => {
    if (!name || name.toString() !== WATCHED) return;
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      view = null;
      broadcastReload(name.toString());
    }, 80);
  });
} catch (err) {
  console.log("[preview] cannot watch", CONTROLLER_DIR, ":", err.message);
}

const MAX_PORT = 3020;

function listen(candidate) {
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE" && candidate < MAX_PORT) {
      console.log(`[preview] port ${candidate} busy → trying ${candidate + 1}`);
      listen(candidate + 1);
    } else {
      console.error("[preview] failed to listen:", err.message);
      process.exit(1);
    }
  });
  server.listen(candidate, "127.0.0.1", async () => {
    port = candidate;
    try {
      view = await loadConsole();
    } catch (err) {
      console.log("[preview]", err.message);
    }
    const url = `http://localhost:${port}/admin`;
    console.log("─".repeat(66));
    console.log(`  Admin dashboard   →  ${url}`);
    console.log(`  fleet             →  ${devices.length} devices, ${transactions.length} payouts · any key unlocks`);
    console.log(`  empty states      →  ${url}?devices=0     ${url}?txns=0`);
    console.log(`  dispatch error    →  ${url}?reject=1  then submit a payout`);
    console.log(`  reset / stop      →  ${url.replace("/admin", "/__reset")}  ·  ${url.replace("/admin", "/__shutdown")}`);
    console.log(`  live-reload       →  edit ${WATCHED}, re-run \`npm run build\``);
    console.log("─".repeat(66));
    openBrowser(url);
  });
}

function openBrowser(url) {
  if (process.env.PREVIEW_NO_OPEN) return;
  try {
    if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    } else {
      const opener = process.platform === "darwin" ? "open" : "xdg-open";
      spawn(opener, [url], { detached: true, stdio: "ignore" }).unref();
    }
  } catch { /* browser is a nicety, not a requirement */ }
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("[preview] shutting down.");
  for (const res of clients) { try { res.end(); } catch {} }
  clients.clear();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 800).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
listen(port);

