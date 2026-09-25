import type { Bug } from '@/db/schema';

/**
 * Trending score = Wilson lower bound of the up/down ratio, decayed by
 * age with a half-life of HALF_LIFE_DAYS. A two-day-old bug with a
 * solid ratio should still outrank a fresh bug with a single upvote,
 * but week-old entries fade out of the top list.
 */
export const HALF_LIFE_DAYS = 2;

export interface ScoredBug extends Bug {
  score: number;
}

/**
 * Lower bound of the Wilson score confidence interval (95%) for a
 * Bernoulli parameter. Standard ranking trick: rewards ratio AND
 * volume, so 40/2 beats 3/0.
 */
export function wilsonLowerBound(up: number, down: number): number {
  const n = up + down;
  if (n === 0) return 0;
  const z = 1.96;
  const phat = up / n;
  return (
    (phat + (z * z) / (2 * n) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)) /
    (1 + (z * z) / n)
  );
}

/**
 * Age-decayed score: the Wilson bound halves every HALF_LIFE_DAYS.
 */
export function decayedScore(up: number, down: number, createdAt: Date, now = Date.now()): number {
  const ageHours = Math.max(0, (now - createdAt.getTime()) / 3_600_000);
  return wilsonLowerBound(up, down) * Math.pow(0.5, ageHours / (HALF_LIFE_DAYS * 24));
}

/**
 * Rank bugs for the trending list: highest score first; ties broken
 * newest-first so fresh entries get the benefit of the doubt.
 */
export function rankBugs<T extends { score: number; createdAt: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
