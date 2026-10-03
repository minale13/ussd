import type { FastifyReply, FastifyRequest } from 'fastify';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Serves the Android App Agent UI at the bare host.
 *
 * The view is the very same document the APK ships in its WebView assets
 * (`android/app/src/main/assets/`), so the browser and the handset show one
 * interface instead of two that drift apart.
 *
 * Two deliberate consequences, both accepted by the operator:
 *
 * 1. It is public. There is no server-side check on this route, so anyone who
 *    can reach the host can load the page. Nothing is served from here that is
 *    not already in the public APK, but the page must never be the only thing
 *    standing in front of a privileged endpoint.
 * 2. Its CSP is relaxed. The document carries an inline <script>, which the
 *    console-wide Helmet policy forbids, so this route replaces that policy with
 *    one that allows inline script. The stricter policy still applies to every
 *    other route, /admin included.
 */

const ASSET_DIR = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'assets');

/**
 * Keeps Helmet's console-wide policy from blocking the page's inline script,
 * without weakening it anywhere else. The origin stays locked to 'self' so no
 * third-party code can be pulled in.
 */
const AGENT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'"
].join('; ');

async function sendAsset(reply: FastifyReply, file: string, type: string): Promise<void> {
  try {
    const body = await readFile(path.join(ASSET_DIR, file), 'utf8');
    return reply
      .header('cache-control', 'no-store')
      .header('content-security-policy', AGENT_CSP)
      .type(type)
      .send(body);
  } catch {
    // A missing asset must degrade into an explanation, never an opaque 500:
    // this is the route a visitor lands on first.
    return reply
      .header('cache-control', 'no-store')
      .type('text/html; charset=utf-8')
      .send(
        '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width,initial-scale=1"><title>USSD Gateway</title></head>' +
          '<body style="font:16px/1.6 system-ui,sans-serif;padding:2rem">' +
          '<h1>App Agent UI unavailable</h1>' +
          '<p>The agent interface asset was not bundled with this deployment.</p>' +
          '<p><a href="/admin">Open the admin console</a></p></body></html>'
      );
  }
}

export async function appAgentUi(_request: FastifyRequest, reply: FastifyReply) {
  return sendAsset(reply, 'dashboard.html', 'text/html; charset=utf-8');
}

export async function appAgentStyles(_request: FastifyRequest, reply: FastifyReply) {
  return sendAsset(reply, 'tailwind.css', 'text/css; charset=utf-8');
}