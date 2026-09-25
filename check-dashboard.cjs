const fs = require("fs");
const html = fs.readFileSync("android/app/src/main/assets/dashboard.html", "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) throw new Error(`duplicate ids: ${duplicates.join(",")}`);
for (const required of ["active-view", "dashboard-content", "settings-btn", "settings-panel", "settings-stop", "sim-list", "listening-orb"]) {
  if (!html.includes(required)) throw new Error(`missing ${required}`);
}
if (!html.includes('classList.toggle("hidden", running)')) throw new Error("active-state toggle missing");
if (!html.includes('document.getElementById("dashboard-content").classList.toggle("hidden", running)')) throw new Error("active dashboard hiding missing");
if (!html.includes('document.getElementById("settings-stop")')) throw new Error("settings stop action missing");
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
  new Function(match[1]);
}
console.log(`dashboard invariants passed (${ids.length} unique ids; inline JavaScript parsed)`);
