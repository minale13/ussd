/**
 * In-process publish/subscribe bus used to push gateway activity to the admin
 * console over Server-Sent Events.
 *
 * Deliberately not Redis pub/sub: the publisher (SMS ingest) and the
 * subscriber (an open console tab) are both this process, and adding a broker
 * round-trip would only add a failure mode. If the service is ever scaled
 * horizontally, this module is the single seam to swap - see publish() below.
 */

export type GatewayEvent =
  | { type: 'sms'; deviceId: string; bankBalance: string | null; parsed: Record<string, unknown> }
  | { type: 'device'; deviceId: string }
  | { type: 'withdrawal'; withdrawalId: string; status: string };

type Subscriber = (event: GatewayEvent) => void;

const subscribers = new Set<Subscriber>();

/** Registers a listener and returns the unsubscribe function. */
export function subscribe(listener: Subscriber): () => void {
  subscribers.add(listener);
  return () => { subscribers.delete(listener); };
}

/** Number of live console connections, surfaced on /health-style diagnostics. */
export function subscriberCount(): number {
  return subscribers.size;
}

/**
 * Fans an event out to every open console.
 *
 * A throwing subscriber must never fail the request that produced the event, so
 * each listener is isolated and its failure is swallowed deliberately.
 */
export function publish(event: GatewayEvent): void {
  for (const listener of subscribers) {
    try {
      listener(event);
    } catch {
      // A dead connection is removed by its own error handler.
    }
  }
}