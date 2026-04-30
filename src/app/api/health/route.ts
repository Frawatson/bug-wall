import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await db.execute(sql`select 1 as ok`);
    const ok = result.length > 0;
    return NextResponse.json(
      {
        status: ok ? 'ok' : 'degraded',
        db: ok ? 'connected' : 'no rows',
        ts: new Date().toISOString(),
      },
      { status: ok ? 200 : 503 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        db: 'unreachable',
        message: err instanceof Error ? err.message : 'unknown',
        ts: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
