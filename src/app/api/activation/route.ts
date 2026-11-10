import { NextRequest, NextResponse } from 'next/server';
import { activationCodeFor, verifyActivation, attemptsLeft } from '@/lib/activation';

export const dynamic = 'force-dynamic';

/** POST /api/activation — issue a code. Body: { userId } */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const activation = activationCodeFor(body.userId);
  return NextResponse.json({ userId: activation.userId, code: activation.code, expiresAt: activation.expiresAt });
}

/** PUT /api/activation — verify a code. Body: { userId, code } */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const result = verifyActivation(body.userId, body.code);
  return NextResponse.json({ ...result, attemptsLeft: attemptsLeft(body.userId) });
}
