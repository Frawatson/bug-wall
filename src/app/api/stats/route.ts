import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { bugs } from '@/db/schema';
import { buildContributorStats } from '@/lib/stats';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stats?limit=<n>&category=<c>
 *
 * Contributor leaderboard. With `category`, restricts the board to
 * bugs filed under that category.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '25', 10) || 25;
  const category = searchParams.get('category');

  try {
    if (category) {
      const rows = await db
        .select({
          author: bugs.author,
          reported: sql<number>`count(*)::int`,
          upvotes: sql<number>`coalesce(sum(${bugs.upvotes}), 0)::int`,
        })
        .from(bugs)
        .where(sql`${bugs.category} = ${category}`)
        .groupBy(bugs.author)
        .orderBy(sql`count(*) DESC`)
        .limit(limit);
      return NextResponse.json({ category, total: rows.length, results: rows });
    }

    const stats = await buildContributorStats(limit);
    // TODO: needs a persisted snapshot store + lookup endpoint before exposing a share token.
    return NextResponse.json({ total: stats.length, results: stats });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'unknown',
        stack: err instanceof Error ? err.stack : undefined,
        context: { nodeVersion: process.version, cwd: process.cwd(), limit, category },
      },
      { status: 500 },
    );
  }
}
