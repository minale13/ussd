import type { FastifyReply, FastifyRequest } from 'fastify';
import { env, envResolution } from '../config/env.js';

/**
 * Credential check for the console sign-in.
 *
 * The console authenticates by sending `x-admin-username` / `x-admin-key` on every
 * admin read, so this endpoint is not on the hot path - it exists so a sign-in
 * attempt can be answered by the credential check alone.
 *
 * That separation is the point. The old probe loaded `/api/admin/overview`, so a
 * database or Redis outage surfaced to the operator as a failed sign-in: the
 * password was correct but the query behind it 500'd, and the console had no way
 * to tell the two apart. Here a wrong password is a 401 and nothing else can be,
 * because this handler touches no datastore at all.
 *
 * There is deliberately no fallback secret. When `ADMIN_API_KEY` is unset the
 * deployment stays closed and says so; a hardcoded default would be readable in
 * the public repository and would turn any missing variable into an open console.
 */

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

/** First string value of a header, ignoring Node's string[] union. */
function headerValue(raw: string | string[] | undefined): string {
  return Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
}

/** Usernames are compared case-insensitively; passwords never are. */
function normaliseUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function password(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function adminLogin(request: FastifyRequest, reply: FastifyReply) {
  try {
    if (!envResolution.adminConfigured) {
      return reply.code(503).send({
        success: false,
        error: 'Admin console is not configured. Set ADMIN_API_KEY in the deployment environment.'
      });
    }

    const body = (request.body ?? {}) as LoginBody;
    const suppliedUser = headerValue(request.headers['x-admin-username']) || normaliseUsername(body.username);
    const suppliedKey = headerValue(request.headers['x-admin-key']) || password(body.password);

    const userMatches = normaliseUsername(suppliedUser) === normaliseUsername(env.ADMIN_USERNAME);
    const keyMatches = suppliedKey === env.ADMIN_API_KEY;

    if (!userMatches || !keyMatches) {
      return reply.code(401).send({ success: false, error: 'Invalid credentials' });
    }

    return reply.code(200).send({ success: true });
  } catch {
    // A sign-in must never surface as an unhandled 500. If the comparison itself
    // fails the deployment is broken, and saying so is more use than a stack.
    return reply.code(503).send({ success: false, error: 'Authentication is unavailable' });
  }
}