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

export type Bug = typeof bugs.$inferSelect;
export type NewBug = typeof bugs.$inferInsert;

export const CATEGORIES = ['frontend', 'backend', 'infra', 'human', 'ai'] as const;
export type Category = (typeof CATEGORIES)[number];
