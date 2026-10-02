import { env } from './config/env.js';
import { buildApp } from './app.js';
import { closeDatabase } from './db.js';

const app = buildApp();
if (env.OUTBOX_PUBLISHER_ENABLED && (!env.LOCAL_INFRA_FALLBACK || env.NODE_ENV !== 'development')) {
  const { startOutboxPublisher } = await import('./queue/outbox.publisher.js');
  startOutboxPublisher();
} else if (env.LOCAL_INFRA_FALLBACK && env.NODE_ENV === 'development') {
  app.log.warn('LOCAL_INFRA_FALLBACK=true: PostgreSQL and Redis background processing is disabled');
}
app.listen({ port: env.PORT, host: env.HOST }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});

// Hosted platforms recycle instances by sending SIGTERM and then killing the
// process on a short timer. Draining in-flight requests and releasing the pool
// first keeps deploys from cutting a payout request off mid-response; the
// hard-exit backstop covers a platform that only gives a few seconds.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    app.log.info(`${signal} received, draining`);
    void app
      .close()
      .then(() => closeDatabase())
      .then(() => process.exit(0))
      .catch((error) => {
        app.log.error(error);
        process.exit(1);
      });
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}