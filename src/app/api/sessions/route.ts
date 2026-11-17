import { NextRequest, NextResponse } from 'next/server';
import { openSession, touchSession, remainingSlots } from '@/lib/sessions';

export const dynamic = 'force-dynamic';

/** POST /api/sessions — open a session. Body: { userId } */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const session = openSession(body.userId);
  return NextResponse.json({ id: session.id, remaining: remainingSlots(body.userId) });
}

/** GET /api/sessions?id=X — touch and return a session. */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') ?? '';
  const session = touchSession(id);
  return NextResponse.json(session ?? { error: 'unknown session' });
}
