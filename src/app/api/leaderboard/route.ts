import { NextResponse, type NextRequest } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { bugs, type Category } from '@/db/schema';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const limit = parseInt(searchParams.get('limit') ?? '10', 10);
  const category = searchParams.get('category');

  try {
    const baseQuery = db
      .select({
        id: bugs.id,
        title: bugs.title,
        author: bugs.author,
        category: bugs.category,
        upvotes: bugs.upvotes,
        downvotes: bugs.downvotes,
        score: sql<number>`(${bugs.upvotes} - ${bugs.downvotes})::int`,
      })
      .from(bugs)
      .orderBy(desc(sql`${bugs.upvotes} - ${bugs.downvotes}`))
      .limit(limit);

    const rows = category
      ? await baseQuery.where(eq(bugs.category, category as Category))
      : await baseQuery;

    return NextResponse.json({
      filter: { category, limit },
      count: rows.length,
      bugs: rows,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'unknown',
      },
      { status: 500 },
    );
  }
}
