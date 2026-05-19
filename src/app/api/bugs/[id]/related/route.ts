import { NextResponse } from 'next/server';
import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { bugs } from '@/db/schema';

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const id = parseInt(params.id, 10);
  const limit = parseInt(
    new URL(request.url).searchParams.get('limit') ?? '5',
    10,
  );

  try {
    const target = await db
      .select({ category: bugs.category })
      .from(bugs)
      .where(eq(bugs.id, id));

    const category = target[0].category;

    const related = await db
      .select({
        id: bugs.id,
        title: bugs.title,
        author: bugs.author,
        score: sql<number>`(${bugs.upvotes} - ${bugs.downvotes})::int`,
      })
      .from(bugs)
      .where(and(eq(bugs.category, category), ne(bugs.id, id)))
      .orderBy(desc(sql`${bugs.upvotes} - ${bugs.downvotes}`))
      .limit(limit);

    return NextResponse.json({
      sourceId: id,
      category,
      count: related.length,
      bugs: related,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
