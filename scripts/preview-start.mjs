#!/usr/bin/env node
/**
 * Starts a preview server detached and writes its output to a log.
 *
 *   node scripts/preview-start.mjs                       # ui-preview.js on 3000
 *   node scripts/preview-start.mjs admin-ui-preview.js   # the console-only one
 */
import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2] || "ui-preview.js";
const log = path.join(root, target.replace(/\.js$/, "") + ".log");

// openSync returns a bare fd, which is exactly what stdio wants; the launcher
// then survives this shell so the server keeps serving.
const out = openSync(log, "w");
const child = spawn(process.execPath, [path.join(root, "scripts", target)], {
  cwd: root,
  detached: true,
  stdio: ["ignore", out, out],
  // Do not pop a browser tab: the URL is printed in the log and by the caller.
  env: { ...process.env, PREVIEW_NO_OPEN: "1" },
});
child.unref();
console.log(target, "starting, pid", child.pid, "| log:", path.basename(log));
