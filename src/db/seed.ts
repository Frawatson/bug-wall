import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { bugs } from './schema';

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const seedData = [
  {
    title: 'Production deploy on a Friday at 5 PM',
    description: 'Tried to "just push a small CSS fix" before the weekend. Took down auth for 4 hours.',
    category: 'human' as const,
    author: 'anonymous-pm',
    upvotes: 142,
    downvotes: 3,
  },
  {
    title: 'AI suggested deleting node_modules to "clean up types"',
    description: 'It then suggested running rm -rf / as a follow-up. We do not use that AI anymore.',
    category: 'ai' as const,
    author: 'skeptical-dev',
    upvotes: 230,
    downvotes: 8,
  },
  {
    title: 'Off-by-one in pagination shows the same row twice',
    description: 'Cursor was inclusive on both ends. Users started complaining about "duplicates".',
    category: 'backend' as const,
    author: 'index-zero',
    upvotes: 88,
    downvotes: 1,
  },
  {
    title: 'CSS specificity war between two designers',
    description: 'One had !important. The other had two !importants in a comment. Nobody won.',
    category: 'frontend' as const,
    author: 'cascade-victim',
    upvotes: 76,
    downvotes: 4,
  },
  {
    title: 'Kubernetes pod restart loop because of a missing trailing newline',
    description: 'YAML parser hated us. The error message did not. We learned about EOF the hard way.',
    category: 'infra' as const,
    author: 'yaml-survivor',
    upvotes: 119,
    downvotes: 2,
  },
  {
    title: 'Date picker timezone bug shifted every meeting by 8 hours',
    description: 'Stored UTC, displayed UTC, but the form sent local. The CEO missed three standups.',
    category: 'frontend' as const,
    author: 'utc-or-bust',
    upvotes: 64,
    downvotes: 0,
  },
  {
    title: 'PR titled "small refactor" touched 412 files',
    description: 'Reviewer just hit approve. We are still finding regressions a month later.',
    category: 'human' as const,
    author: 'lgtm-regret',
    upvotes: 198,
    downvotes: 5,
  },
];

async function main() {
  const sql = postgres(url!, { max: 1 });
  const db = drizzle(sql);
  console.log('Seeding bugs…');
  await db.insert(bugs).values(seedData);
  console.log(`Seeded ${seedData.length} bugs.`);
  await sql.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
