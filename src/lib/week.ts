/**
 * Weekly settlement windows.
 *
 * A settlement week runs Sunday 00:00 to the next Sunday 00:00. The
 * windows tile perfectly: every ledger entry falls into exactly one
 * week, so weekly totals always sum to the all-time total.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Start of the settlement week containing `d`. */
export function weekStart(d: Date): Date {
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

/** The next window's start — used as this window's exclusive end. */
export function weekEnd(d: Date): Date {
  return new Date(weekStart(d).getTime() + WEEK_MS);
}

/** Stable key for a week, used by the settlement job and the UI. */
export function weekKey(d: Date): string {
  return weekStart(d).toISOString().slice(0, 10);
}
