#!/usr/bin/env node
/**
 * UI preview server for the standalone Web Admin Dashboard (the console the API
 * serves at /admin). It renders the REAL page and the REAL client script from
 * src/controllers/admin-dashboard.controller.ts, so what you inspect in the
 * browser is exactly what ships - only the admin API is mocked.
 *
 * The page loader, the in-memory fleet and the mocked API all live in
 * scripts/admin-console.preview.js, which scripts/ui-preview.js (the Android
 * preview, which also mounts the console on port 3000) uses as well. One copy
 * means the two previews cannot drift apart, and the configured
 * ADMIN_USERNAME / ADMIN_API_KEY are enforced identically by whichever one holds
 * the port: sign in with those values, not with an arbitrary key.
 *
 * Dev-only extras, mirroring scripts/ui-preview.js:
 *
 *  1. A mock admin API over an in-memory fleet, so every control works with no
 *     database:
 *       GET   /api/admin/overview        cash-in / withdrawals / balance
 *       GET   /api/admin/devices         the device fleet (mixed states)
 *       GET   /api/admin/transactions    the centralized payout ledger
 *       GET   /api/admin/withdrawals     the queue, with status/channel filters
 *       PATCH /api/admin/devices/:id     Block / Unblock really toggles the row
 *       POST  /api/admin/withdrawals     creates a real PENDING payout, which
 *                                         then appears in Transaction history
 *     ?devices=0 or ?txns=0 empties a table to review the empty state, and
 *     ?reject=1 makes a dispatch fail so the error toast (404 unknown / 409
 *     blocked) can be reviewed too.
 *  2. An SSE live-reload client watching the console's source.
 *
 * Endpoints: /admin  /admin/app.js  /__livereload (SSE)
 *            /__status (JSON)  /__reset (restore seed data)  /__shutdown
 */
import http from "node:http";
import fs from "node:fs";
import { spawn } from "node:child_process";
import * as fleet from "./admin-console.preview.js";
import {
  ADMIN_USERNAME,
  BUILD,
  CONSOLE_SECTIONS,
  CONTROLLER_DIR,
  MIME,
  WATCHED,
  getConsole,
  handleConsole,
  invalidateConsole,
  reset,
} from "./admin-console.preview.js";

const clients = new Set();
let shuttingDown = false;
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const route = url.pathname;

  // The app itself. "/" is an alias so the preview always lands on it, and every
  // screen serves the same shell - the client router reads the pathname and
  // shows the matching screen, exactly as the real server does. handleConsole
  // also answers /admin/app.js, /health and the mocked /api/admin/* routes.
  if (route === "/") url.pathname = "/admin";
  if (await handleConsole(req, res, url)) return;

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
    let page = "loading";
    try {
      await getConsole();
      page = "ready";
    } catch { /* the build field below carries the reason */ }
    return sendJson(res, 200, {
      page,
      build: fs.existsSync(BUILD) ? "present" : "missing",
      devices: fleet.devices.length,
      transactions: fleet.transactions.length,
      admin_username: ADMIN_USERNAME,
      url: `http://localhost:${port}/admin`,
    });
  }

  if (route === "/__reset") {
    reset();
    return sendJson(res, 200, { ok: true, devices: fleet.devices.length, transactions: fleet.transactions.length });
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
      invalidateConsole();
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
      await getConsole();
    } catch (err) {
      console.log("[preview]", err.message);
    }
    const url = `http://localhost:${port}/admin`;
    console.log("─".repeat(66));
    console.log(`  Mobile admin app  →  ${url}`);
    console.log(`  screens          →  ${["transactions", "devices", "more", "send", "notifications", "profile"].map((s) => `${url}/${s}`).join("\n                       ")}`);
    console.log(`  sign in          →  username "${ADMIN_USERNAME}" with the ADMIN_API_KEY from .env`);
    console.log(`  fleet            →  ${fleet.devices.length} devices, ${fleet.transactions.length} payouts, ${fleet.cashIns.length} SMS`);
    console.log(`  empty states     →  ${url}?devices=0     ${url}?txns=0`);
    console.log(`  dispatch error   →  ${url}?reject=1  then submit a payout`);
    console.log(`  reset / stop     →  ${url.replace("/admin", "/__reset")}  ·  ${url.replace("/admin", "/__shutdown")}`);
    console.log(`  live-reload      →  edit ${WATCHED}, re-run \`npm run build\``);
    console.log("─".repeat(66));
    openBrowser(url);
  });
}

function openBrowser(url) {
  if (process.env.PREVIEW_NO_OPEN) return;
  try {
    if (process.platform === "win32") {
      // `start` needs the (empty) window title first, or it treats the URL as one.
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

