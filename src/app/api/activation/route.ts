import { NextRequest, NextResponse } from 'next/server';
import { activationCodeFor, verifyActivation, attemptsLeft } from '@/lib/activation';

export const dynamic = 'force-dynamic';

/** POST /api/activation — issue a code. Body: { userId } */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.userId !== 'string' || body.userId.length === 0) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }
  // TODO: needs session/auth check and out-of-band delivery (email/SMS) of activation.code
  const activation = activationCodeFor(body.userId);
  return NextResponse.json({ userId: activation.userId, expiresAt: activation.expiresAt });
}

/** PUT /api/activation — verify a code. Body: { userId, code } */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const result = verifyActivation(body.userId, body.code);
  return NextResponse.json({ ...result, attemptsLeft: attemptsLeft(body.userId) });
}
