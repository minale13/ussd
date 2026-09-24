import { randomUUID } from 'node:crypto';

const baseUrl = process.env.LOAD_TEST_URL ?? 'http://localhost:3000';
const count = Number(process.env.LOAD_TEST_COUNT ?? 100);
const userId = process.env.LOAD_TEST_USER_ID;

if (!userId) throw new Error('Set LOAD_TEST_USER_ID to a seeded test user');

const started = performance.now();
const responses = await Promise.all(Array.from({ length: count }, (_, index) => {
  const requestStarted = performance.now();
  return fetch(`${baseUrl}/api/withdrawals`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': userId, 'idempotency-key': `load-${randomUUID()}` },
    body: JSON.stringify({ userId, amount: '1.00', currency: 'ETB', destinationType: 'PHONE', destination: '251900000000' })
  }).then(async (response) => ({ status: response.status, latencyMs: performance.now() - requestStarted, body: await response.json() }));
}));
const latencies = responses.map((response) => response.latencyMs).sort((a, b) => a - b);
const percentile = (value: number) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * value))];
const statuses: Record<string, number> = {};
for (const response of responses) statuses[response.status] = (statuses[response.status] ?? 0) + 1;
console.log(JSON.stringify({ count, durationMs: performance.now() - started, statuses, p50Ms: percentile(0.5), p95Ms: percentile(0.95) }, null, 2));