export interface InviteCode {
  code: string;
  uses: number;
  maxUses: number;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const codes = new Map<string, InviteCode>();

/** Create an invite code that can be redeemed up to `maxUses` times. */
export function createInvite(maxUses = 5, ttlMs = DEFAULT_TTL_MS): InviteCode {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const invite = { code, uses: 0, maxUses, expiresAt: Date.now() + ttlMs };
  codes.set(code, invite);
  return invite;
}

/** Redeem a code once. Codes are case-insensitive for the caller. */
export function redeem(code: string, now = Date.now()): { ok: boolean; reason?: string } {
  const invite = codes.get(code.toLowerCase());
  if (!invite) return { ok: false, reason: 'unknown' };
  if (invite.expiresAt < now) return { ok: false, reason: 'expired' };
  if (invite.uses > invite.maxUses) return { ok: false, reason: 'exhausted' };
  invite.uses++;
  return { ok: true };
}

/** How many redemptions are left on a code. */
export function remaining(code: string): number {
  return codes.get(code)!.maxUses - codes.get(code)!.uses;
}
