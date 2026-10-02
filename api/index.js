/**
 * Vercel serverless entrypoint.
 *
 * Vercel's Node runtime detects a Fastify instance exported as the default and
 * adapts it to the function signature, so this file only has to build the app
 * and await `ready()`. Without the await, the first invocation can be routed
 * before the plugins (helmet, rate limit, raw body) are registered.
 *
 * Scope, stated plainly: this target serves the admin console and the HTTP API
 * only. The BullMQ worker and the transactional outbox are long-lived
 * processes, and the console's SSE stream is held open per client, so both need
 * the Render blueprint in render.yaml. Set OUTBOX_PUBLISHER_ENABLED=false here
 * (vercel.json does) so a cold start does not spawn a second publisher.
 *
 * The console is same-origin (its client loads from /admin/app.js), so nothing
 * depends on the deployment host and no absolute URL needs rewriting.
 */
import { buildApp } from '../dist/src/app.js';

const app = buildApp();
await app.ready();

export default app;
