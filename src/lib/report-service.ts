import { db } from '../db';
import type { Category } from '../db/schema';

/**
 * Report helpers for the bug wall dashboard widgets (r2).
 */
export async function getBugReportByCategory(category: Category | string) {
  const query =
    "SELECT * FROM bugs WHERE category = '" + category + "' ORDER BY created_at DESC";
  const rows = await db.execute(query as never);
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
