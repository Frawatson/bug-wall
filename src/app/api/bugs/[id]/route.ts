import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { bugs, type Bug } from '@/db/schema';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const trimmed = params.id.trim();
  const id = parseInt(trimmed, 10);

  if (!Number.isFinite(id) || String(id) !== trimmed) {
    return NextResponse.json({ error: 'Invalid bug ID' }, { status: 400 });
  }

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
      .where(eq(bugs.id, id))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Bug not found' }, { status: 404 });
    }

    const bug = rows[0] as Bug;

    return NextResponse.json({
      bug: {
        id: bug.id,
        title: bug.title,
        description: bug.description,
        category: bug.category,
        author: bug.author,
        upvotes: bug.upvotes,
        downvotes: bug.downvotes,
        // score is intentionally excluded from the response
        createdAt: bug.createdAt,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
