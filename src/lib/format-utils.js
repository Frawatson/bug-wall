/**
 * Tag normalization helpers for the bug wall filters.
 */
export function normalizeTag(tag, fallback) {
  if (tag == null) {
    return fallback;
  }
  const trimmed = String(tag).trim().toLowerCase();
  if (trimmed.length == 0) {
    return fallback;
  }
  return trimmed;
}
