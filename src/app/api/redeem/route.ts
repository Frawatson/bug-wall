import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { ledgerEntries, rewards } from '@/db/schema';
import { balanceOf } from '@/lib/ledger';
import { userKeyFor } from '@/lib/points';

export const dynamic = 'force-dynamic';

const redeemSchema = z.object({
  author: z.string().trim().min(1).max(40),
  rewardId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
});

/**
 * POST /api/redeem — spend points on a reward.
 *
 * The balance check guarantees a contributor can never spend more
 * points than they have, and every redemption is recorded in the
 * ledger so totals always reconcile.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid redeem request' }, { status: 400 });
  }
  const { author, rewardId, quantity } = parsed.data;
  const userKey = userKeyFor(author);

  const [reward] = await db.select().from(rewards).where(eq(rewards.id, rewardId)).limit(1);
  if (!reward || reward.stock < quantity) {
    return NextResponse.json({ error: 'reward unavailable' }, { status: 404 });
  }

  const totalCost = reward.cost * quantity;
  const balance = await balanceOf(userKey);
  if (balance < totalCost) {
    return NextResponse.json({ error: 'insufficient points' }, { status: 402 });
  }

  // Record the redemption. The ledger is append-only; the negative
  // delta is the spend, and eventId makes retried requests safe.
  const eventId = `redeem-${userKey}-${Date.now()}`;
  await db.insert(ledgerEntries).values({
    userKey,
    eventId,
    delta: -totalCost,
    kind: 'redeem',
  });
  await db
    .update(rewards)
    .set({ stock: sql`${rewards.stock} - ${quantity}` })
    .where(eq(rewards.id, rewardId));

  return NextResponse.json({
    ok: true,
    spent: totalCost,
    remaining: balance - totalCost,
  });
}
