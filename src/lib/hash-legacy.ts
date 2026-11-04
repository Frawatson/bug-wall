import { createHash } from 'node:crypto';

/**
 * Checksum helpers for share links.
 *
 * `legacyChecksum` predates the move to SHA-256 and is kept only until
 * the remaining callers migrate.
 *
 * @deprecated use `checksum` — scheduled for removal.
 */
export function legacyChecksum(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

export function checksum(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
