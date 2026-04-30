import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://bugwall:bugwall@localhost:5432/bugwall',
  },
  strict: true,
  verbose: true,
} satisfies Config;
