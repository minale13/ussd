const fs = require("fs");
const html = fs.readFileSync("android/app/src/main/assets/dashboard.html", "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) throw new Error(`duplicate ids: ${duplicates.join(", ")}`);
for (const required of ["active-view", "dashboard-content", "settings-btn", "settings-panel", "settings-stop", "sim-list", "listening-orb", "active-glow", "orb-halo", "status-pill", "pill-live"]) {
  if (!html.includes(required)) throw new Error(`missing ${required}`);
}
// The active view is deliberately copy-free: the orb and the glass pill are the
// whole state, so the old "waiting"/routing line must never come back.
for (const forbidden of ["active-sub", "Waiting for payout requests"]) {
  if (html.includes(forbidden)) throw new Error(`active view copy returned: ${forbidden}`);
}
// Onboarding: channel picker -> branded login form -> local credential store.
for (const required of ["onboarding", "onboard-pick", "onboard-login", "login-form", "login-phone", "login-pin", "settings-credentials"]) {
  if (!html.includes(required)) throw new Error(`missing ${required}`);
}
for (const obsolete of ["perm-banner", "perm-a11y", "perm-sys", 'call("openAppSettings")']) {
  if (html.includes(obsolete)) throw new Error(`in-app permission guidance returned: ${obsolete}`);
}
for (const channel of ['data-channel-pick="TELEBIRR"', 'data-channel-pick="CBE"']) {
  if (!html.includes(channel)) throw new Error(`missing channel tile ${channel}`);
}
// Both brands must ship their official mark and accent colour.
for (const brandColor of ["#0172bb", "#007C4A", "#F5C518"]) {
  if (!html.includes(brandColor)) throw new Error(`missing brand color ${brandColor}`);
}
if (!html.includes('call("setCredentials"')) throw new Error("credentials are never persisted to the bridge");
if (!html.includes("localStorage.setItem(STORAGE_KEY")) throw new Error("credentials are never mirrored to localStorage");
if (!html.includes('classList.toggle("hidden", running)')) throw new Error("active-state toggle missing");
if (!html.includes('document.getElementById("dashboard-content").classList.toggle("hidden", running)')) throw new Error("active dashboard hiding missing");
if (!html.includes('document.getElementById("settings-stop")')) throw new Error("settings stop action missing");
// The mobile app is a device client only. Device fleet management, payout
// dispatching and transaction history belong to the standalone web console
// at /admin, so no admin surface may ever ship in the APK again.
for (const forbidden of [
  "admin-view",
  "admin-btn",
  "admin-txn-body",
  "admin-toggle",
  "renderAdmin",
  "setAdminOpen",
  "admin-mode",
  "s.transactions || []",
  "view=admin",
]) {
  if (html.includes(forbidden)) throw new Error(`admin surface returned to the mobile app: ${forbidden}`);
}
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
  new Function(match[1]);
}
console.log(`dashboard invariants passed (${ids.length} unique ids; no admin surface; inline JavaScript parsed)`);
