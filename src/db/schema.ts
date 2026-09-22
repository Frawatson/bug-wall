import { pgTable, serial, text, integer, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';

export const categoryEnum = pgEnum('category', ['frontend', 'backend', 'infra', 'human', 'ai']);

export const bugs = pgTable(
  'bugs',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: categoryEnum('category').notNull().default('frontend'),
    author: text('author').notNull(),
    upvotes: integer('upvotes').notNull().default(0),
    downvotes: integer('downvotes').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index('bugs_created_at_idx').on(table.createdAt),
    categoryIdx: index('bugs_category_idx').on(table.category),
  }),
);

export const voteDirectionEnum = pgEnum('vote_direction', ['up', 'down']);

/**
 * One row per (visitor, bug) vote — the ledger behind one-vote-per-
 * visitor dedup. voterHash is a truncated SHA-256 of the visitor
 * token; we never store the raw token.
 */
export const votes = pgTable(
  'votes',
  {
    id: serial('id').primaryKey(),
    bugId: integer('bug_id').notNull().references(() => bugs.id, { onDelete: 'cascade' }),
    voterHash: text('voter_hash').notNull(),
    direction: voteDirectionEnum('direction').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    voterLookupIdx: index('votes_bug_voter_idx').on(table.bugId, table.voterHash),
  }),
);

export type Bug = typeof bugs.$inferSelect;
export type NewBug = typeof bugs.$inferInsert;
export type Vote = typeof votes.$inferSelect;

export const CATEGORIES = ['frontend', 'backend', 'infra', 'human', 'ai'] as const;
export type Category = (typeof CATEGORIES)[number];
