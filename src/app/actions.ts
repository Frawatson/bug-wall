'use server';

import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { bugs, CATEGORIES } from '@/db/schema';

const createBugSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120, 'Title is too long'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description is too long'),
  category: z.enum(CATEGORIES),
  author: z.string().trim().min(1, 'Author is required').max(40, 'Author name is too long'),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createBug(formData: FormData): Promise<ActionResult> {
  const parsed = createBugSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    category: formData.get('category'),
    author: formData.get('author'),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    await db.insert(bugs).values(parsed.data);
    revalidatePath('/');
    return { ok: true };
  } catch (err) {
    console.error('createBug failed:', err);
    return { ok: false, error: 'Could not save bug. Try again.' };
  }
}

const voteSchema = z.object({
  id: z.coerce.number().int().positive(),
  direction: z.enum(['up', 'down']),
});

export async function voteBug(input: { id: number; direction: 'up' | 'down' }): Promise<ActionResult> {
  const parsed = voteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid vote' };
  }

  const column = parsed.data.direction === 'up' ? bugs.upvotes : bugs.downvotes;

  try {
    const result = await db
      .update(bugs)
      .set({
        [parsed.data.direction === 'up' ? 'upvotes' : 'downvotes']: sql`${column} + 1`,
      })
      .where(eq(bugs.id, parsed.data.id))
      .returning({ id: bugs.id });

    if (result.length === 0) {
      return { ok: false, error: 'Bug not found' };
    }

    revalidatePath('/');
    return { ok: true };
  } catch (err) {
    console.error('voteBug failed:', err);
    return { ok: false, error: 'Vote failed. Try again.' };
  }
}

export async function deleteBug(id: number): Promise<ActionResult> {
  const parsed = z.coerce.number().int().positive().safeParse(id);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid id' };
  }
  try {
    await db.delete(bugs).where(eq(bugs.id, parsed.data));
    revalidatePath('/');
    return { ok: true };
  } catch (err) {
    console.error('deleteBug failed:', err);
    return { ok: false, error: 'Delete failed.' };
  }
}
