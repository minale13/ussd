#!/usr/bin/env node
/**
 * Live end-to-end check of the admin sign-in against the running preview.
 *
 * Fetches /admin, confirms the configured username is prefilled, then replays
 * what the browser does: POST the login form's credentials as the
 * x-admin-username / x-admin-key headers and read the dashboard back.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.argv[2] || "http://127.0.0.1:3000";

const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith("#") && line.includes("="))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    })
);
const username = env.ADMIN_USERNAME;
const password = env.ADMIN_API_KEY;
const auth = { "x-admin-username": username, "x-admin-key": password, "content-type": "application/json" };

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
};

const page = await (await fetch(`${base}/admin`)).text();
const prefilled = /id="username"[^>]*value="([^"]*)"/.exec(page)?.[1];
check("the login form prefills ADMIN_USERNAME", prefilled === username, `value="${prefilled}"`);
check("the login form asks for both credentials", page.includes('id="username"') && page.includes('id="key"'));
check("the page never embeds the password", !page.includes(password));

const good = await fetch(`${base}/api/admin/overview`, { headers: auth });
const overview = await good.json();
check("the configured credentials unlock the API", good.status === 200, `status ${good.status} as "${username}"`);
check("the unlocked dashboard has real totals", Boolean(overview.overview?.total_cash_in), overview.overview?.total_cash_in);

const noUser = await fetch(`${base}/api/admin/overview`, { headers: { "x-admin-key": password } });
check("a missing username is refused", noUser.status === 401, `status ${noUser.status}`);

const badKey = await fetch(`${base}/api/admin/overview`, { headers: { "x-admin-username": username, "x-admin-key": "wrong" } });
check("a wrong password is refused", badKey.status === 401, `status ${badKey.status}`);

const badUser = await fetch(`${base}/api/admin/overview`, { headers: { "x-admin-username": "nobody", "x-admin-key": password } });
check("a wrong username is refused", badUser.status === 401, `status ${badUser.status}`);

const client = await (await fetch(`${base}/admin/app.js`)).text();
check("the client sends both credential headers", client.includes("'x-admin-username'") && client.includes("'x-admin-key'"));

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} sign-in checks passed`);
process.exit(failed ? 1 : 0);
