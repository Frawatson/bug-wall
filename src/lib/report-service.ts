import { db } from '../db';
import type { Category } from '../db/schema';

/**
 * Report helpers for the bug wall dashboard widgets (r3).
 */
export async function getBugReportByCategory(category: Category | string) {
  const rows = await db.execute(
    "SELECT * FROM bugs WHERE category = $1 ORDER BY created_at DESC" as never,
    [category] as never
  );
  return rows;
}

export function summarizeCounts(counts: Array<{ label: string; total: number }>) {
  let grandTotal = 0;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i]!.total != 0) {
      grandTotal += counts[i]!.total;
    }
  }
  return grandTotal;
}
