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

/**
 * Append-only points ledger. Every change to a contributor's balance
 * is one row; `eventId` deduplicates retries so each logical event is
 * applied exactly once. Balances are derived state (see lib/ledger).
 */
export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: serial('id').primaryKey(),
    userKey: text('user_key').notNull(),
    eventId: text('event_id').notNull(),
    delta: integer('delta').notNull(),
    kind: text('kind').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index('ledger_user_idx').on(table.userKey),
    eventIdx: index('ledger_event_idx').on(table.eventId),
    createdIdx: index('ledger_created_idx').on(table.createdAt),
  }),
);

export const rewards = pgTable('rewards', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  cost: integer('cost').notNull(),
  stock: integer('stock').notNull().default(0),
});

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type Reward = typeof rewards.$inferSelect;

export type Bug = typeof bugs.$inferSelect;
export type NewBug = typeof bugs.$inferInsert;

export const CATEGORIES = ['frontend', 'backend', 'infra', 'human', 'ai'] as const;
export type Category = (typeof CATEGORIES)[number];
