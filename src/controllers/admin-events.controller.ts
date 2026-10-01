import type { FastifyReply, FastifyRequest } from 'fastify';
import { subscribe } from '../events/bus.js';

/** How often to send a comment frame so proxies do not drop an idle connection. */
const HEARTBEAT_MS = 25_000;

/**
 * Server-Sent Events stream of gateway activity for the admin console.
 *
 * SSE rather than a WebSocket because the traffic is one-way (server to
 * browser), it needs no client library, it reconnects on its own, and it
 * survives the Helmet CSP the console runs under - a WebSocket to a third-party
 * realtime broker would not.
 *
 * The stream is behind `authenticateAdmin`: it exposes balances and transaction
 * references, so an unauthenticated subscriber would be an information leak.
 */
export async function eventStream(request: FastifyRequest, reply: FastifyReply) {
  reply.raw.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    // Nginx buffers proxied responses by default, which would defeat streaming.
    'x-accel-buffering': 'no'
  });

  const write = (event: string, data: unknown) => {
    if (reply.raw.writableEnded) return;
    reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Tell the browser the stream is live before any real traffic arrives.
  write('ready', { at: new Date().toISOString() });

  const unsubscribe = subscribe((event) => write(event.type, event));
  const heartbeat = setInterval(() => {
    if (!reply.raw.writableEnded) reply.raw.write(': keep-alive\n\n');
  }, HEARTBEAT_MS);

  const close = () => {
    clearInterval(heartbeat);
    unsubscribe();
    if (!reply.raw.writableEnded) reply.raw.end();
  };

  request.raw.on('close', close);
  request.raw.on('error', close);

  // Keep the handler pending: Fastify must not send its own response body.
  await new Promise<void>((resolve) => {
    request.raw.on('close', resolve);
    request.raw.on('error', resolve);
  });
}