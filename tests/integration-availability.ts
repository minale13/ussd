import net from 'node:net';

function canConnect(host: string, port: number, timeoutMs = 250): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (available: boolean) => {
      socket.destroy();
      resolve(available);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

export async function integrationServicesAvailable(): Promise<boolean> {
  if (process.env.RUN_INTEGRATION !== 'true' || !process.env.DATABASE_URL || !process.env.REDIS_URL) return false;
  const databaseUrl = new URL(process.env.DATABASE_URL);
  const redisUrl = new URL(process.env.REDIS_URL);
  const [databaseAvailable, redisAvailable] = await Promise.all([
    canConnect(databaseUrl.hostname, Number(databaseUrl.port) || 5432),
    canConnect(redisUrl.hostname, Number(redisUrl.port) || 6379)
  ]);
  return databaseAvailable && redisAvailable;
}