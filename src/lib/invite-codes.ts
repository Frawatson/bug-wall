export interface InviteCode {
  code: string;
  uses: number;
  maxUses: number;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 10;
// TODO: needs a shared persistence layer (DB/Redis) for invite codes; this Map is per-instance and lost on cold start/redeploy.
const globalForInvites = globalThis as typeof globalThis & { __inviteCodes?: Map<string, InviteCode> };
const codes: Map<string, InviteCode> = globalForInvites.__inviteCodes ?? new Map<string, InviteCode>();
globalForInvites.__inviteCodes = codes;

/** Create an invite code that can be redeemed up to `maxUses` times. */
export function createInvite(maxUses = 5, ttlMs = DEFAULT_TTL_MS): InviteCode {
  const now = Date.now();
  codes.forEach((existing, key) => {
    if (existing.expiresAt < now) codes.delete(key);
  });
  let code = '';
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && (code.length !== 6 || codes.has(code)); attempt++) {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
  }
  if (code.length !== 6 || codes.has(code)) throw new Error('Unable to generate a unique invite code');
  const invite = { code, uses: 0, maxUses, expiresAt: now + ttlMs };
  codes.set(code, invite);
  return invite;
}

/** Redeem a code once. Codes are case-insensitive for the caller. */
export function redeem(code: string, now = Date.now()): { ok: boolean; reason?: string } {
  const invite = codes.get(code.toUpperCase());
  if (!invite) return { ok: false, reason: 'unknown' };
  if (invite.expiresAt < now) return { ok: false, reason: 'expired' };
  if (invite.uses >= invite.maxUses) return { ok: false, reason: 'exhausted' };
  invite.uses++;
  return { ok: true };
}

/** How many redemptions are left on a code. */
export function remaining(code: string): number {
  return codes.get(code)!.maxUses - codes.get(code)!.uses;
}
