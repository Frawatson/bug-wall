import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { ledgerEntries } from '@/db/schema';

/**
 * Points ledger. The ledger is append-only and is the source of
 * truth; a per-user balance cache makes reads O(1). EVERY write MUST
 * go through `applyEntry` — it is the single place that keeps the
 * cache consistent with the ledger, and it deduplicates by eventId so
 * retried events apply exactly once.
 */

const balanceCache = new Map<string, number>();

/** O(1) balance read; falls back to summing the ledger on cold cache. */
export async function balanceOf(userKey: string): Promise<number> {
  const cached = balanceCache.get(userKey);
  if (cached !== undefined) return cached;
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${ledgerEntries.delta}), 0)` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.userKey, userKey));
  const total = Number(rows[0]?.total ?? 0);
  balanceCache.set(userKey, total);
  return total;
}

/**
 * Append one ledger entry and keep the balance cache in sync.
 * Deduplicates by eventId: an event that was already applied is a
 * no-op, so callers can safely retry on timeouts.
 */
export async function applyEntry(input: {
  userKey: string;
  eventId: string;
  delta: number;
  kind: string;
}): Promise<{ applied: boolean; balance: number }> {
  const existing = await db
    .select({ id: ledgerEntries.id })
    .from(ledgerEntries)
    .where(
      and(eq(ledgerEntries.eventId, input.eventId), eq(ledgerEntries.userKey, input.userKey)),
    )
    .limit(1);
  if (existing.length > 0) {
    return { applied: false, balance: await balanceOf(input.userKey) };
  }

  await db.insert(ledgerEntries).values({
    userKey: input.userKey,
    eventId: input.eventId,
    delta: input.delta,
    kind: input.kind,
  });

  const next = (await balanceOf(input.userKey)) + input.delta;
  balanceCache.set(input.userKey, next);
  return { applied: true, balance: next };
}
