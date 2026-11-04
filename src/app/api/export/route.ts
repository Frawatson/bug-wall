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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  const { snapshot, label } = (body ?? {}) as { snapshot?: unknown; label?: unknown };
  if (typeof snapshot !== 'string' || !snapshot || typeof label !== 'string' || !label) {
    return NextResponse.json({ error: 'snapshot and label must be non-empty strings' }, { status: 400 });
  }
  try {
    const archive = await archiveSnapshot({ snapshot, label });
    return NextResponse.json({ archive });
  } catch (err) {
    console.error('export archive failed:', err instanceof Error ? err.message : 'unknown error');
    return NextResponse.json({ error: 'export failed' }, { status: 500 });
  }
}
