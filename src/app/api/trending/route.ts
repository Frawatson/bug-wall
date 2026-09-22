import { NextRequest, NextResponse } from 'next/server';
import { gte } from 'drizzle-orm';
import { db } from '@/db';
import { bugs } from '@/db/schema';
import { decayedScore, rankBugs, type ScoredBug } from '@/lib/trending';

export const dynamic = 'force-dynamic';

const TOP_N = 20;
const TTL_MS = 60_000;

interface CacheEntry {
  at: number;
  key: string;
  body: { window_days: number; results: ScoredBug[] };
}

// Single-flight response cache: trending is the same for every viewer,
// so one query per TTL window is plenty.
let cache: CacheEntry | null = null;

/**
 * GET /api/trending?days=7
 *
 * Top TOP_N bugs from the last `days` days (1-30, default 7), ranked
 * by decayed Wilson score. Results are cached for TTL_MS.
 */
export async function GET(request: NextRequest) {
  const raw = Number(request.nextUrl.searchParams.get('days') ?? 7);
  const days = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 30) : 7;
  const key = `d${days}`;

  if (cache && cache.key === key && Date.now() - cache.at < TTL_MS) {
    // Refresh the entry's clock so a hot window stays served from
    // memory instead of thundering the database on expiry.
    cache.at = Date.now();
    return NextResponse.json(cache.body, { headers: { 'x-cache': 'hit' } });
  }

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);

  try {
    const rows = await db.select().from(bugs).where(gte(bugs.createdAt, cutoff));
    const scored: ScoredBug[] = rows.map((row) => ({
      ...row,
      score: decayedScore(row.upvotes, row.downvotes, row.createdAt),
    }));
    const results = rankBugs(scored).slice(0, TOP_N);

    const body = { window_days: days, results };
    cache = { at: Date.now(), key, body };
    return NextResponse.json(body, { headers: { 'x-cache': 'miss' } });
  } catch (err) {
    console.error('trending query failed:', err);
    return NextResponse.json({ error: 'trending unavailable' }, { status: 500 });
  }
}
