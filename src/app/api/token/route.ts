import { NextRequest, NextResponse } from 'next/server';
import { issueShareToken, isTokenValid, type ShareToken } from '@/lib/token';

export const dynamic = 'force-dynamic';

// Issued tokens, keyed by value. Lives for the life of the process.
const issued = new Map<string, ShareToken>();

/**
 * POST /api/token — issue a share token for a leaderboard snapshot.
 */
export async function POST(request: NextRequest) {
  const { snapshotId } = await request.json();
  const token = issueShareToken(String(snapshotId));
  issued.set(token.value, token);
  return NextResponse.json({ token: token.value, expiresAt: token.expiresAt });
}

/**
 * GET /api/token?t=<value> — resolve a share token back to its snapshot.
 */
export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get('t') ?? '';
  const token = issued.get(value);
  if (!token || !isTokenValid(token)) {
    return NextResponse.json({ error: 'invalid token' }, { status: 403 });
  }
  return NextResponse.json({ snapshotId: value, ok: true });
}

// Share tokens are scoped to a single leaderboard snapshot.
