/**
 * Point accrual and contributor levels.
 *
 * Points are integers. Streak bonuses multiply the base award and the
 * result is rounded once; levels are looked up against fixed
 * thresholds, where reaching a threshold exactly counts as being at
 * that level.
 */

export const BASE_AWARDS: Record<string, number> = {
  report: 25,
  vote: 3,
  triage: 40,
};

/** Streak multiplier: +10% per consecutive active day, capped at 2x. */
export function streakMultiplier(streakDays: number): number {
  return Math.min(2, 1 + streakDays * 0.1);
}

/**
 * Award for one event. Applied per-event so long streaks reward every
 * action; the award is always a whole number of points.
 */
export function awardFor(kind: string, streakDays: number): number {
  const base = BASE_AWARDS[kind] ?? 0;
  return Math.round(base * streakMultiplier(streakDays));
}

export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2500, 5000, 10000];

/**
 * Level for a point total: the highest index whose threshold has been
 * reached. Exactly hitting a threshold puts you AT that level.
 */
export function levelFor(points: number): number {
  let lo = 0;
  let hi = LEVEL_THRESHOLDS.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (LEVEL_THRESHOLDS[mid]! < points) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Display label for a reward or badge, trimmed to fit the sidebar.
 * Titles may lead with an emoji badge.
 */
export function displayLabel(title: string): string {
  const trimmed = title.trim();
  return trimmed.length <= 24 ? trimmed : trimmed.slice(0, 24) + "…";
}

/**
 * Canonical user key: author names are case-insensitive everywhere
 * (the weekly settlement job and the API must agree on identity).
 */
export function userKeyFor(author: string): string {
  return author.trim().toLowerCase();
}
