#!/usr/bin/env node
/**
 * UI preview server for the Android dashboard (android/.../assets/dashboard.html).
 *
 * Serves the real dashboard on http://localhost:3000 with two dev-only extras
 * injected at serve time (the committed HTML file is never modified):
 *
 *  1. A mock `window.AndroidGateway` bridge so every control (start/stop,
 *     channel, SIM selection, permission buttons) works in the browser with a
 *     realistic in-memory state — no device needed. Query params override the
 *     initial state for design review:
 *       ?running=1  &a11y=0  &phone=0  &sim=0  &channel=CBE  &slot=1  &empty=1
 *  2. An SSE live-reload client; the server watches dashboard.html and
 *     tailwind.css and pushes `reload` on change.
 *
 * Styling: when the local Tailwind CLI works, the server runs it in --watch
 * mode (tailwind.input.css → assets/tailwind.css, production parity). If the
 * CLI is unavailable it falls back to the vendored Play-CDN JIT (tw-dl.js)
 * so styling is still instant with zero build.
 *
 * Endpoints: /  /tailwind.css  /tw-dl.js  /__livereload (SSE)
 *            /__status (JSON)  /__shutdown (stop this server)
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = path.join(ROOT, "android", "app", "src", "main", "assets");
const HTML_FILE = path.join(ASSETS, "dashboard.html");
const CSS_FILE = path.join(ASSETS, "tailwind.css");
const INPUT_CSS = path.join(ROOT, "tailwind.input.css");
const TAILWIND_CONFIG = path.join(ROOT, "tailwind.config.cjs");
const TW_CLI = path.join(ROOT, "node_modules", "tailwindcss", "lib", "cli.js");
const CDN_JS = path.join(ROOT, "tw-dl.js");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

// ---------------------------------------------------------------------------
// Dev-only bridge mock + live-reload client. Injected before </head>, which
// always precedes the page's own script that reads window.AndroidGateway.
// ---------------------------------------------------------------------------
const MOCK_BRIDGE = `<script>
/* UI preview harness — served only by scripts/ui-preview.js, never committed. */
(function () {
  "use strict";
  window.__PREVIEW__ = true;
  var q = new URLSearchParams(location.search);
  function flag(name, dflt) { return q.has(name) ? q.get(name) !== "0" : dflt; }
  function channelLabel(c) { return c === "CBE" ? "CBE Birr" : "Telebirr"; }

  var state = {
    running: flag("running", false),
    channel: q.get("channel") === "CBE" ? "CBE" : "TELEBIRR",
    simSlot: q.has("slot") ? Math.max(0, Math.min(3, parseInt(q.get("slot"), 10) || 0)) : 0,
    accessibility: flag("a11y", true),
    callPermission: flag("phone", true),
    simPermission: flag("sim", true),
    sims: [
      { slot: 0, label: "SIM 1", carrier: "Ethio Telecom", ready: true },
      { slot: 1, label: "SIM 2", carrier: "Safaricom", ready: true }
    ],
    logs: []
  };
  if (!flag("empty", false)) {
    var now = Date.now();
    state.logs = [
      { t: now - 120000, kind: "success", msg: "Gateway started · Telebirr · SIM 1" },
      { t: now - 60000, kind: "info", msg: "Payouts routed through SIM 1" },
      { t: now - 5000, kind: "info", msg: "Channel set to Telebirr" }
    ];
  }

  function addLog(kind, msg) {
    state.logs.push({ t: Date.now(), kind: kind, msg: msg });
    if (state.logs.length > 40) state.logs.shift();
  }
  // Kotlin's pushState() ends in evaluateJavascript("refresh()"); mirror that.
  function push() {
    setTimeout(function () {
      if (typeof window.refresh === "function") window.refresh();
    }, 0);
  }

  window.AndroidGateway = {
    getState: function () { return JSON.stringify(state); },
    setChannel: function (c) {
      if (c !== "TELEBIRR" && c !== "CBE") return;
      state.channel = c;
      addLog("info", "Channel set to " + channelLabel(c));
      push();
    },
    setSim: function (slot) {
      if (slot < 0 || slot > 3) return;
      state.simSlot = slot;
      addLog("info", "Payouts routed through SIM " + (slot + 1));
      push();
    },
    startGateway: function () {
      if (state.running) { push(); return; }
      state.running = true;
      addLog("success", "Gateway started · " + channelLabel(state.channel) + " · SIM " + (state.simSlot + 1));
      push();
    },
    stopGateway: function () {
      state.running = false;
      addLog("info", "Gateway stopped");
      push();
    },
    /* In the browser these "grant" the permission so the flow is walkable. */
    openAccessibilitySettings: function () {
      state.accessibility = true;
      addLog("info", "Accessibility permission granted (preview)");
      push();
    },
    openAppSettings: function () {
      state.callPermission = true;
      state.simPermission = true;
      addLog("info", "Phone & SIM permissions granted (preview)");
      push();
    }
  };
})();
</script>`;

const LIVE_RELOAD = `<script>
(function () {
  if (!window.EventSource) return;
  var es = new EventSource("/__livereload");
  es.onmessage = function (e) {
    if (e.data === "reload") location.reload();
  };
})();
</script>`;

// ---------------------------------------------------------------------------
// Tailwind build (production CSS) with CDN-JIT fallback.
// ---------------------------------------------------------------------------
let mode = "cdn"; // "built" | "cdn"
let twWatch = null;

function tailwindCliWorks() {
  if (!fs.existsSync(TW_CLI)) return false;
  try {
    const probe = spawnSync(process.execPath, [TW_CLI, "--help"], { timeout: 8000 });
    return probe.status === 0;
  } catch { return false; }
}

function buildCssOnce() {
  try {
    const res = spawnSync(
      process.execPath,
      [TW_CLI, "-c", TAILWIND_CONFIG, "-i", INPUT_CSS, "-o", CSS_FILE],
      { cwd: ROOT, timeout: 30000, encoding: "utf8" }
    );
    if (res.status !== 0 && res.stderr) console.log("[tailwind]", res.stderr.trim().slice(0, 800));
    return res.status === 0;
  } catch (err) {
    console.log("[tailwind] build error:", err.message);
    return false;
  }
}

function startCssWatcher() {
  twWatch = spawn(
    process.execPath,
    [TW_CLI, "-c", TAILWIND_CONFIG, "-i", INPUT_CSS, "-o", CSS_FILE, "--watch"],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] }
  );
  const line = (d) => {
    const text = d.toString().trim();
    if (text) console.log("[tailwind]", text);
  };
  twWatch.stdout.on("data", line);
  twWatch.stderr.on("data", line);
  twWatch.on("exit", (code) => console.log("[tailwind] watch exited with", code));
}

function initStyles() {
  if (!tailwindCliWorks()) {
    console.log("[preview] Tailwind CLI unavailable — CDN JIT fallback (tw-dl.js).");
    return;
  }
  let stale = true;
  try { stale = fs.statSync(CSS_FILE).mtimeMs < fs.statSync(HTML_FILE).mtimeMs; } catch { stale = true; }
  if (stale) {
    console.log("[preview] building assets/tailwind.css …");
    if (!buildCssOnce()) {
      console.log("[preview] initial Tailwind build FAILED — CDN JIT fallback.");
      return;
    }
  }
  mode = "built";
  startCssWatcher();
  console.log("[preview] Tailwind --watch active → assets/tailwind.css");
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
const clients = new Set();
let shuttingDown = false;

function broadcastReload(cause) {
  console.log("[preview] change →", cause, clients.size ? "(reloading)" : "(no client yet)");
  for (const res of clients) {
    try { res.write("data: reload\n\n"); } catch { /* client went away */ }
  }
}

function serveDashboard(res) {
  let html;
  try {
    html = fs.readFileSync(HTML_FILE, "utf8");
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("cannot read dashboard.html: " + err.message);
    return;
  }
  const cdnTag = mode === "cdn" ? '<script src="/tw-dl.js"></script>' : "";
  html = html.replace(/<\/head>/i, cdnTag + MOCK_BRIDGE + LIVE_RELOAD + "</head>");
  res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" });
  res.end(html);
}

function serveCss(res) {
  res.writeHead(200, { "Content-Type": MIME[".css"], "Cache-Control": "no-store" });
  if (fs.existsSync(CSS_FILE)) return res.end(fs.readFileSync(CSS_FILE));
  res.end("/* preview: tailwind.css not built yet — CDN JIT handles styling */\n");
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  switch (url.pathname) {
    case "/":
    case "/dashboard.html":
      return serveDashboard(res);
    case "/tailwind.css":
      return serveCss(res);
    case "/tw-dl.js":
      res.writeHead(200, { "Content-Type": MIME[".js"], "Cache-Control": "no-cache" });
      return res.end(fs.readFileSync(CDN_JS));
    case "/favicon.ico":
      res.writeHead(204);
      return res.end();
    case "/__livereload": {
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
    case "/__status":
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      return res.end(JSON.stringify({
        mode,
        css: fs.existsSync(CSS_FILE) ? "present" : "missing",
        url: "http://localhost:" + port,
      }));
    case "/__shutdown":
      res.writeHead(200, { "Content-Type": MIME[".json"] });
      res.end('{"ok":true}');
      return shutdown();
    default:
      res.writeHead(404, { "Content-Type": MIME[".json"] });
      return res.end('{"error":"not found"}');
  }
});

// ---------------------------------------------------------------------------
// Watcher: reload whenever the dashboard or the generated CSS changes.
// ---------------------------------------------------------------------------
let reloadTimer = null;
function watchDir(dir, interesting) {
  try {
    fs.watch(dir, (event, file) => {
      if (!file) return;
      const name = file.toString();
      if (!interesting.includes(name)) return;
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => broadcastReload(name), 80);
    });
  } catch (err) {
    console.log("[preview] cannot watch", dir, ":", err.message);
  }
}

// ---------------------------------------------------------------------------
// Port with fallback (the backend dev server also likes port 3000).
// ---------------------------------------------------------------------------
let port = Number(process.env.PORT) || 3000;
const MAX_PORT = 3010;

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
  server.listen(candidate, "127.0.0.1", () => {
    port = candidate;
    const url = `http://localhost:${port}`;
    console.log("─".repeat(56));
    console.log(`  UI preview   →  ${url}`);
    console.log(`  styling      →  ${mode === "built" ? "tailwind --watch" : "CDN JIT (no build)"}`);
    console.log("  live-reload  →  save dashboard.html to refresh");
    console.log(`  stop         →  ${url}/__shutdown`);
    console.log("─".repeat(56));
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
  if (twWatch) { try { twWatch.kill(); } catch {} }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 800).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ---------------------------------------------------------------------------
initStyles();
watchDir(ASSETS, ["dashboard.html", "tailwind.css"]);
watchDir(ROOT, ["tailwind.config.cjs", "tailwind.input.css", "tailwind.css"]);
listen(port);
