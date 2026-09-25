const fs = require("fs");
const html = fs.readFileSync("android/app/src/main/assets/dashboard.html", "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) throw new Error(`duplicate ids: ${duplicates.join(", ")}`);
for (const required of ["active-view", "dashboard-content", "settings-btn", "settings-panel", "settings-stop", "sim-list", "listening-orb"]) {
  if (!html.includes(required)) throw new Error(`missing ${required}`);
}
// Onboarding: channel picker -> branded login form -> local credential store.
for (const required of ["onboarding", "onboard-pick", "onboard-login", "login-form", "login-phone", "login-pin", "settings-credentials"]) {
  if (!html.includes(required)) throw new Error(`missing ${required}`);
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
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
  new Function(match[1]);
}
console.log(`dashboard invariants passed (${ids.length} unique ids; inline JavaScript parsed)`);
