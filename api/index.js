/**
 * Vercel serverless entrypoint.
 *
 * Vercel's Node runtime calls the default export with `(req, res)`, and a Fastify
 * instance is itself a Node request listener, so the app can be handed over
 * directly once it is ready.
 *
 * Scope, stated plainly: this target serves the admin console and the HTTP API
 * only. The BullMQ worker and the transactional outbox are long-lived processes,
 * and the console's SSE stream is held open per client, so both need the Render
 * blueprint in render.yaml. Set OUTBOX_PUBLISHER_ENABLED=false here (vercel.json
 * does) so a cold start does not spawn a second publisher.
 *
 * The console is same-origin (its client loads from /admin/app.js), so nothing
 * depends on the deployment host and no absolute URL needs rewriting.
 *
 * Why the import is dynamic and guarded rather than a top-level `import` plus
 * `await app.ready()`: anything thrown while the module graph is being evaluated
 * happens before Vercel has a handler to call, and the platform reports that as
 * a bare 500 FUNCTION_INVOCATION_FAILED with no clue as to the cause. That was
 * the real failure here - config/env.ts validates the whole schema at import
 * time, so one absent environment variable took down every invocation, including
 * `/health`. Loading lazily means a startup problem becomes a 500 with a
 * readable JSON body naming the missing variables, and a failure that is only
 * about one request no longer implicates the whole function.
 *
 * Why `./lib/app.js` and not the main `dist/` build: `tsconfig.api.json` compiles
 * src/ into api/lib/, and everything under api/ ships with the function by
 * definition. Importing across into the gitignored dist/ left the file out of the
 * bundle entirely, and Vercel failed at runtime with
 * `Cannot find module '/var/task/dist/src/app.js'`.
 */

/** Memoised so the graph is evaluated once per warm instance, not once per request. */
let appPromise;

async function getApp() {
  appPromise ??= (async () => {
    const { buildApp } = await import('./lib/app.js');
    const app = buildApp();
    // Without the await, a request can be routed before helmet, the rate limiter
    // and the raw-body plugin are registered.
    await app.ready();
    return app;
  })().catch((error) => {
    // Clear the cache so a later invocation retries rather than replaying a
    // rejected promise for the lifetime of the instance.
    appPromise = undefined;
    throw error;
  });
  return appPromise;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    // `app.routing(req, res)`, not `app(req, res)`: a Fastify instance is an
    // object, not a request listener, so calling it directly throws
    // "app is not a function" and every request falls into the catch below.
    // `routing` is Fastify's supported entrypoint for using an instance as a
    // Node request listener, and it keeps the lazy startup above.
    return app.routing(req, res);
  } catch (error) {
    console.error('[api] startup failed:', error);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        error: 'Service failed to start. Check that the deployment environment variables are set.',
        detail: error?.message ?? String(error)
      })
    );
  }
}
