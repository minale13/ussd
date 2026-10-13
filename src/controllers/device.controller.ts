import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { registerDevice } from '../services/device.service.js';

/**
 * The registration payload an Android handset sends.
 *
 * `deviceId` is the stable `Settings.Secure.ANDROID_ID` the app already uses as
 * its `x-device-id` on every poll, so a device that registers and a device that
 * polls always resolve to the same fleet row. Every other field is optional
 * because the app registers twice - once at process start (id and model only)
 * and again the moment phone-number onboarding completes - and the second call
 * must be able to fill in what the first could not.
 */
const registerSchema = z.object({
  deviceId: z.string().trim().min(4).max(128),
  phoneModel: z.string().trim().max(120).nullish(),
  phoneNumber: z
    .string()
    .trim()
    .max(32)
    .regex(/^[0-9+]*$/, 'Phone number must contain only digits and an optional leading +')
    .nullish(),
  // The legacy two-value channel. Kept narrow on purpose: it is only ever the
  // onboarding choice, and the multi-bank set lives in `enabled_banks` which a
  // registration never writes.
  channel: z.enum(['TELEBIRR', 'CBE']).nullish(),
  simSlot: z.number().int().min(0).max(3).nullish(),
  appVersion: z.string().trim().max(32).nullish()
});

/**
 * `POST /api/devices/register` - self-report on install and on onboarding.
 *
 * Before this existed a phone only appeared in the console as a side effect of
 * `GET /api/withdrawals/pending`, which cannot fire until the accessibility
 * service is on, onboarding has saved a login and both dangerous permissions
 * were granted. A freshly installed handset was invisible to the operator until
 * all of that had happened, and one that was never configured never appeared.
 *
 * The trust model is deliberately the same as the poll it mirrors - the gateway
 * `x-user-id` plus the device's own `x-device-id` - so this endpoint is no
 * weaker than the surface the app already exposes, and no new secret had to be
 * provisioned on the handset.
 */
export async function register(request: FastifyRequest, reply: FastifyReply) {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ success: false, error: 'Invalid device registration' });
  }

  // The authenticated header wins over the body: the middleware already
  // validated it, and a body that disagreed with it would let a caller register
  // a row under an id it was not authenticated as.
  const deviceId = (request.deviceId ?? parsed.data.deviceId).slice(0, 128);

  try {
    const device = await registerDevice({
      deviceId,
      phoneModel: parsed.data.phoneModel ?? null,
      phoneNumber: parsed.data.phoneNumber ?? null,
      channel: parsed.data.channel ?? null,
      simSlot: parsed.data.simSlot ?? null,
      appVersion: parsed.data.appVersion ?? null,
      // Taken from the socket rather than a header for the same reason the poll
      // does it: a handset cannot claim an address it is not actually using.
      lastIp: typeof request.ip === 'string' ? request.ip.slice(0, 64) : null
    });
    // Always 200 rather than 201 on first sight: the app treats any 2xx as
    // success and re-registers freely, and distinguishing "created" from
    // "refreshed" would only oblige the client to care about the difference.
    return reply.send({ success: true, device });
  } catch (error) {
    request.log.error({ err: error }, 'device registration failed');
    return reply.code(500).send({ success: false, error: 'Unable to register device' });
  }
}
