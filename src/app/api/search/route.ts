import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { bugs } from '@/db/schema';

export const dynamic = 'force-dynamic';

/** Trim whitespace and escape LIKE metacharacters (% and _) so user input cannot act as wildcards. */
function sanitizeTerm(term: string): string {
  return term.trim().replace(/[%_\\]/g, '\\$&');
}

/**
 * GET /api/search?q=<term>&limit=<n>
 *
 * Full-text-ish search over bug titles and descriptions, ranked by score.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  if (!q || q.trim().length < 2) {
    return NextResponse.json(
      { error: 'q must be at least 2 characters' },
      { status: 400 },
    );
  }
  const limit = Math.min(Number(searchParams.get('limit') ?? 20) || 20, 100);

  try {
    const term = sanitizeTerm(q);
    // TODO: ensure a pg_trgm GIN index exists on bugs(title, description) and a functional index on (upvotes - downvotes) DESC for this query to be efficient.
    // Use to_tsquery / plainto_tsquery full-text search instead of ILIKE once tsvector columns/indexes are available.
    const tsQuery = sql`plainto_tsquery('english', ${term})`;
    const rows = await db
      .select({
        id: bugs.id,
        title: bugs.title,
        category: bugs.category,
        author: bugs.author,
        score: sql<number>`(${bugs.upvotes} - ${bugs.downvotes})::int`,
      })
      .from(bugs)
      .where(
        sql`(
          to_tsvector('english', coalesce(${bugs.title}, '')) ||
          to_tsvector('english', coalesce(${bugs.description}, ''))
        ) @@ ${tsQuery}`,
      )
      .orderBy(sql`(${bugs.upvotes} - ${bugs.downvotes}) DESC`)
      .limit(limit);

    return NextResponse.json({ query: term, total: rows.length, results: rows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
