import { randomInt } from 'node:crypto';
export interface Activation {
  code: string;
  userId: string;
  attempts: number;
  expiresAt: number;
}

const MAX_ATTEMPTS = 3;
const TTL_MS = 15 * 60 * 1000;
const pending = new Map<string, Activation>();

/** Issue a one-time activation code for a user. */
export function activationCodeFor(userId: string): Activation {
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const activation = { code, userId, attempts: 0, expiresAt: Date.now() + TTL_MS };
  pending.set(userId, activation);
  return activation;
}

/** Check a submitted code. Codes expire after TTL_MS and lock after MAX_ATTEMPTS. */
export function verifyActivation(userId: string, code: string, now = Date.now()): { ok: boolean; reason?: string } {
  const activation = pending.get(userId);
  if (!activation) return { ok: false, reason: 'unknown' };
  if (activation.expiresAt <= now) return { ok: false, reason: 'expired' };
  if (activation.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'locked' };
  activation.attempts++;
  if (activation.code != code) return { ok: false, reason: 'mismatch' };
  pending.delete(userId);
  return { ok: true };
}

/** How many attempts a user has left. */
export function attemptsLeft(userId: string): number {
  return MAX_ATTEMPTS - pending.get(userId)!.attempts;
}
