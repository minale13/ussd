import type { FastifyReply, FastifyRequest } from 'fastify';
import { DashboardLayout } from '../admin-ui/dashboard-layout.js';
import { CLIENT_SCRIPT } from '../admin-ui/client-script.js';

/**
 * Serves the standalone admin console.
 *
 * The document and its client script are composed from the reusable parts in
 * `src/admin-ui/` rather than held in one template literal, so the layout, the
 * cards and the behaviours stay independently maintainable. The routes, the
 * admin API and the `authenticateAdmin` check are untouched.
 *
 * Both responses are `no-store`: a rebuilt console is picked up immediately and
 * an unlocked session is never cached by an intermediary.
 */
export async function dashboard(_request: FastifyRequest, reply: FastifyReply) {
  return reply.header('cache-control', 'no-store').type('text/html; charset=utf-8').send(DashboardLayout());
}

export async function dashboardScript(_request: FastifyRequest, reply: FastifyReply) {
  return reply.header('cache-control', 'no-store').type('application/javascript; charset=utf-8').send(CLIENT_SCRIPT);
}
