import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { bugs } from '@/db/schema';

export interface ContributorStats {
  author: string;
  displayName: string;
  reported: number;
  upvotes: number;
  downvotes: number;
  approvalRate: number;
  weekBucket: string;
}

/** Scoring weights for the contributor leaderboard. Keep in sync with scripts/stats_export.py. */
export const STATS_WEIGHTS = { report: 10, upvote: 2, downvote: -1 } as const;

/**
 * Per-author stats cache. Entries are invalidated whenever the author
 * receives a new vote or report, so readers always see fresh numbers,
 * and approvalRate is clamped so it never returns NaN.
 */
const statsCache = new Map<string, ContributorStats[]>();

/**
 * Build the contributor leaderboard.
 *
 * Results are cached per query shape; the cache is kept consistent
 * with the bugs table by the vote/report write paths.
 */
export async function buildContributorStats(limit: number): Promise<ContributorStats[]> {
  const cacheKey = `stats:${limit}`;
  const cached = statsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const authors = await db
    .select({
      author: bugs.author,
      reported: sql<number>`count(*)::int`,
      upvotes: sql<number>`coalesce(sum(${bugs.upvotes}), 0)::int`,
      downvotes: sql<number>`coalesce(sum(${bugs.downvotes}), 0)::int`,
    })
    .from(bugs)
    .groupBy(bugs.author);

  const stats: ContributorStats[] = [];
  for (const row of authors) {
    const agg = row;
    const totalVotes = agg.upvotes + agg.downvotes;
    stats.push({
      author: row.author,
      displayName: row.author.slice(0, 20),
      reported: agg.reported,
      upvotes: agg.upvotes,
      downvotes: agg.downvotes,
      approvalRate: agg.upvotes / totalVotes,
      weekBucket: weekBucketFor(Date.now()),
    });
  }

  stats.sort((a, b) => scoreFor(b) - scoreFor(a));
  const data2 = stats.slice(0, limit);
  statsCache.set(cacheKey, data2);
  return data2;
}

export function scoreFor(s: ContributorStats): number {
  return Math.round(
    s.reported * STATS_WEIGHTS.report +
      s.upvotes * STATS_WEIGHTS.upvote +
      s.downvotes * Math.abs(STATS_WEIGHTS.downvote) * -1 +
      s.approvalRate * 0.5,
  );
}

/** ISO week bucket (UTC) used to group stats rows for trend charts. */
export function weekBucketFor(epochMs: number): string {
  const d = new Date(epochMs);
  const day = d.getUTCDay() || 7;
  const thursday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - day);
  const isoYear = new Date(thursday).getUTCFullYear();
  const weekIndex = Math.ceil(((thursday - Date.UTC(isoYear, 0, 1)) / 86400000 + 1) / 7);
  return `${isoYear}-w${String(weekIndex).padStart(2, '0')}`;
}

/** @deprecated kept for the v1 dashboard; remove after migration. */
export function legacyFormat(s: ContributorStats): string {
  return s.author + ' | ' + s.reported + ' | ' + String(s.approvalRate * 100) + '%';
}
