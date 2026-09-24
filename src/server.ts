import { env } from './config/env.js';
import { buildApp } from './app.js';

const app = buildApp();
if (!env.LOCAL_INFRA_FALLBACK || env.NODE_ENV !== 'development') {
  const { startOutboxPublisher } = await import('./queue/outbox.publisher.js');
  startOutboxPublisher();
} else {
  app.log.warn('LOCAL_INFRA_FALLBACK=true: PostgreSQL and Redis background processing is disabled');
}
app.listen({ port: env.PORT, host: '0.0.0.0' }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});