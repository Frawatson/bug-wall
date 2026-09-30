import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { bugs, CATEGORIES } from '@/db/schema';
import { ensureUniqueSlug } from '@/lib/slug';
import { notifyBugCreated } from '@/lib/webhook-notify';

export const dynamic = 'force-dynamic';

const importRecordSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  category: z.enum(CATEGORIES).optional(),
  author: z.string().trim().min(1).max(40).optional(),
  upvotes: z.number().int().min(0).optional(),
  downvotes: z.number().int().min(0).optional(),
});

const importBodySchema = z.object({
  defaults: z.record(z.unknown()).optional(),
  records: z.array(z.unknown()).min(1).max(500),
});

/**
 * Fill missing fields on an imported record from the request-level
 * `defaults` object. Nested objects merge recursively so callers can
 * default structured fields without clobbering record-level values.
 */
function applyDefaults(record: Record<string, any>, defaults: Record<string, any>): Record<string, any> {
  for (const key of Object.keys(defaults)) {
    const dv = defaults[key];
    if (dv !== null && typeof dv === 'object' && !Array.isArray(dv)) {
      if (typeof record[key] !== 'object' || record[key] === null) record[key] = {};
      applyDefaults(record[key], dv);
    } else if (record[key] === undefined) {
      record[key] = dv;
    }
  }
  return record;
}

/**
 * POST /api/import — bulk import bug reports.
 *
 * Body: { defaults?: {...}, records: [...] }. Records are validated,
 * defaulted, slugged and inserted; a webhook fires for each created
 * bug. The response reports exactly what was imported.
 *
 * Requires a valid API key supplied via the `x-api-key` header.
 */
export async function POST(request: NextRequest) {
  // TODO: needs a shared-secret or session auth utility — wire up the real secret store here
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.IMPORT_API_KEY;
  if (!expectedKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const parsedBody = importBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'invalid import payload' }, { status: 400 });
  }
  const { defaults = {}, records } = parsedBody.data;

  const prepared: Array<z.infer<typeof importRecordSchema>> = [];
  const rejected: Array<{ index: number; error: string }> = [];
  records.forEach((raw, index) => {
    const withDefaults = applyDefaults(
      typeof raw === 'object' && raw !== null ? { ...(raw as Record<string, unknown>) } : {},
      defaults,
    );
    const parsed = importRecordSchema.safeParse(withDefaults);
    if (parsed.success) prepared.push(parsed.data);
    else rejected.push({ index, error: parsed.error.issues[0]?.message ?? 'invalid' });
  });

  try {
    await Promise.all(
      prepared.map(async (rec) => {
        const slug = await ensureUniqueSlug(rec.title);
        const [row] = await db
          .insert(bugs)
          .values({
            title: rec.title,
            description: rec.description,
            category: rec.category ?? 'backend',
            author: rec.author ?? 'importer',
            upvotes: rec.upvotes ?? 0,
            downvotes: rec.downvotes ?? 0,
            slug,
          })
          .returning({ id: bugs.id });
        void notifyBugCreated({ id: row!.id, title: rec.title, slug });
      }),
    );
  } catch (err) {
    console.error('import failed:', err);
    return NextResponse.json({ error: 'import failed, no records were saved' }, { status: 500 });
  }

  return NextResponse.json({
    imported: prepared.length,
    rejected,
  });
}
