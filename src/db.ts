import pg from 'pg';
import { env } from './config/env.js';

/**
 * Lazily created on first use rather than at import.
 *
 * On serverless the module graph is evaluated while handling a request, so a pool
 * built at import time would open connections even for `/health` and for every
 * cold start that never touches the database. Creating it on demand keeps a
 * health check or a console shell render from depending on a reachable database.
 */
let instance: pg.Pool | undefined;

function getPool(): pg.Pool {
  if (!instance) {
    instance = new pg.Pool({
      connectionString: env.DATABASE_URL,
      max: 20,
      // Without an idle timeout a serverless instance holds its connections open
      // between invocations, and the platform reclaims them underneath the pool
      // anyway, so the next query fails against a socket the provider already
      // dropped. Recycling sooner turns that into a clean reconnect.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000
    });
    // pg emits 'error' on the pool when an idle client is dropped by the server
    // or the network. An EventEmitter with no listener turns that into an
    // uncaught exception, which on a platform like Vercel surfaces as
    // FUNCTION_INVOCATION_FAILED for a request that never touched the database.
    instance.on('error', (error) => {
      console.error(JSON.stringify({ event: 'postgres_pool_error', message: error.message }));
    });
  }
  return instance;
}

/**
 * Stable proxy over the lazily created pool, so every existing `pool.query(...)`
 * and `pool.connect()` call site keeps working unchanged while the underlying
 * client is only built on first use.
 */
export const pool = new Proxy({} as pg.Pool, {
  get(_target, property, receiver) {
    const value = Reflect.get(getPool(), property, receiver);
    return typeof value === 'function' ? value.bind(getPool()) : value;
  }
});

export async function closeDatabase(): Promise<void> {
  if (!instance) return;
  const current = instance;
  instance = undefined;
  await current.end();
}