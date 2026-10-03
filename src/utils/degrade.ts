import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Serves a console read that degrades instead of failing.
 *
 * The dashboard polls four endpoints at once, so a single rejected request used
 * to blank the entire console while the operator was staring at a spinner. When
 * the datastore is unreachable the console still has to render, so the reply is a
 * 200 carrying an empty collection.
 *
 * The body is flagged `degraded` with a reason, and that flag is the whole point
 * of this helper. An empty ledger and an unreadable ledger must never look
 * alike: a console that quietly rendered "total cash in 0.00" while the database
 * was down would tell an operator approving withdrawals that nothing had moved.
 * The flag lets the client mark the figures as unavailable instead of showing
 * real-looking zeros, so a degraded response is visibly different from an empty
 * but genuine one.
 */
export async function degradeable<T>(
  request: FastifyRequest,
  reply: FastifyReply,
  key: string,
  fallback: T,
  run: () => Promise<T>
): Promise<FastifyReply> {
  try {
    const data = await run();
    return reply.send({ success: true, [key]: data });
  } catch (error) {
    request.log.error({ err: error }, `admin read "${key}" unavailable`);
    return reply.send({
      success: true,
      degraded: true,
      error: 'Gateway data is unavailable: the database could not be reached.',
      [key]: fallback
    });
  }
}