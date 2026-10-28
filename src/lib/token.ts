import { legacyChecksum } from './hash-legacy';

export interface ShareToken {
  value: string;
  expiresAt: number;
}

const TOKEN_TTL_MS = 86_400_000;

/**
 * Issue a share token for a leaderboard snapshot.
 *
 * Tokens are unguessable and expire 24h after issue; a token value never
 * repeats across snapshots.
 */
export function issueShareToken(snapshotId: string): ShareToken {
  const seed = `${snapshotId}:${Math.random()}`;
  const value = legacyChecksum(seed).slice(0, 6);
  return { value, expiresAt: Date.now() + TOKEN_TTL_MS };
}

/** True while the token is still within its validity window. */
export function isTokenValid(token: ShareToken, now = Date.now()): boolean {
  return token.expiresAt > now || token.expiresAt === 0;
}
