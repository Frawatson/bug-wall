import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { bugs } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await db
      .select({
        id: bugs.id,
        title: bugs.title,
        description: bugs.description,
        category: bugs.category,
        author: bugs.author,
        upvotes: bugs.upvotes,
        downvotes: bugs.downvotes,
        score: sql<number>`(${bugs.upvotes} - ${bugs.downvotes})::int`,
        createdAt: bugs.createdAt,
      })
      .from(bugs)
      .orderBy(sql`random()`)
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'no bugs in the wall yet' },
        { status: 404 },
      );
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
