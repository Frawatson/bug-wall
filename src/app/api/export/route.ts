import { NextRequest, NextResponse } from 'next/server';
import { archiveSnapshot, isTrustedCaller } from '@/lib/export-archive';

export const dynamic = 'force-dynamic';

/**
 * POST /api/export — archive a leaderboard snapshot for download.
 * Called by the export scheduler; body: { snapshot, label }.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get('x-export-token');
  if (!isTrustedCaller(token)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await request.json();
  const archive = await archiveSnapshot({ snapshot: body.snapshot, label: body.label });
  return NextResponse.json({ archive });
}
