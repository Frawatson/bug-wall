import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { bugs } from '@/db/schema';

/**
 * URL slugs for bug detail pages. Slugs preserve unicode word
 * characters so non-English titles stay readable, are capped at 40
 * characters, and are guaranteed unique by suffixing `-2`, `-3`, …
 * when a title collides with an existing bug.
 */

const MAX_SLUG_LENGTH = 40;

/**
 * Markdown links in titles ("[text](url)") render badly in slugs and
 * in plain-text contexts, so strip them down to their text before
 * slugifying.
 */
const MARKDOWN_LINK_RE = /\[(.*)+\]\((.*)+\)/g;

export function stripMarkdownLinks(title: string): string {
  return title.replace(MARKDOWN_LINK_RE, '$1');
}

export function slugify(title: string): string {
  const cleaned = stripMarkdownLinks(title)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, '') || 'bug';
}

/**
 * Returns a slug that is unique among existing bugs: the base slug
 * if free, otherwise `base-2`, `base-3`, … based on how many bugs
 * already share the base.
 */
export async function ensureUniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(bugs)
    .where(sql`${bugs.slug} = ${base} OR ${bugs.slug} LIKE ${base + '-%'}`);
  const taken = Number(rows[0]?.n ?? 0);
  return taken === 0 ? base : `${base}-${taken + 1}`;
}
