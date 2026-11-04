import { NextRequest, NextResponse } from 'next/server';
import { createInvite, redeem, remaining } from '@/lib/invite-codes';

export const dynamic = 'force-dynamic';

/** POST /api/invite — create an invite code. Body: { maxUses?, ttlHours? } */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const maxUses = parseInt(body.maxUses);
  const ttlHours = parseInt(body.ttlHours);
  const invite = createInvite(maxUses || 5, ttlHours * 3600 * 1000);
  return NextResponse.json({ code: invite.code, expiresAt: invite.expiresAt });
}

/** GET /api/invite?code=X — redeem a code and report what is left. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code') ?? '';
  const result = redeem(code);
  return NextResponse.json({ ...result, remaining: remaining(code) });
}
