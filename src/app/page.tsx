import { desc, eq, sql } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/db';
import { bugs, CATEGORIES, type Category } from '@/db/schema';
import { BugForm } from '@/components/BugForm';
import { BugList } from '@/components/BugList';
import { CategoryFilter } from '@/components/CategoryFilter';
import { SortToggle } from '@/components/SortToggle';

export const dynamic = 'force-dynamic';

type Sort = 'top' | 'new';

function parseSort(value: string | undefined): Sort {
  return value === 'new' ? 'new' : 'top';
}

function parseCategory(value: string | undefined): Category | null {
  if (value && (CATEGORIES as readonly string[]).includes(value)) return value as Category;
  return null;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { sort?: string; category?: string };
}) {
  const sort = parseSort(searchParams.sort);
  const category = parseCategory(searchParams.category);

  const orderClause =
    sort === 'new'
      ? desc(bugs.createdAt)
      : desc(sql`${bugs.upvotes} - ${bugs.downvotes}`);

  const rows = category
    ? await db.select().from(bugs).where(eq(bugs.category, category)).orderBy(orderClause).limit(100)
    : await db.select().from(bugs).orderBy(orderClause).limit(100);

  const totals = await db
    .select({
      count: sql<number>`count(*)::int`,
      upvotes: sql<number>`coalesce(sum(${bugs.upvotes}), 0)::int`,
      downvotes: sql<number>`coalesce(sum(${bugs.downvotes}), 0)::int`,
    })
    .from(bugs);

  const stats = totals[0] ?? { count: 0, upvotes: 0, downvotes: 0 };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10 text-center">
        <h1 className="bg-gradient-to-r from-pink-400 via-violet-400 to-blue-400 bg-clip-text text-5xl font-bold text-transparent sm:text-6xl">
          Bug Wall
        </h1>
        <p className="mt-3 text-zinc-400">
          A wall of the worst, weirdest, and most embarrassing bugs ever shipped.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-zinc-500">
          <span>{stats.count} bugs</span>
          <span>·</span>
          <span>{stats.upvotes} upvotes</span>
          <span>·</span>
          <span>{stats.downvotes} downvotes</span>
          <span>·</span>
          <Link href="/api/health" className="underline-offset-2 hover:underline">
            health
          </Link>
        </div>
      </header>

      <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 backdrop-blur">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Confess a bug
        </h2>
        <BugForm />
      </section>

      <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <CategoryFilter active={category} sort={sort} />
        <SortToggle sort={sort} category={category} />
      </section>

      <BugList bugs={rows} />

      <footer className="mt-16 text-center text-xs text-zinc-600">
        Built for testing{' '}
        <a href="https://grapple-pr.com" className="text-zinc-400 hover:text-zinc-200">
          grapple-pr
        </a>
        . Self-host the DB with Docker. Deploy the app on Vercel.
      </footer>
    </main>
  );
}
