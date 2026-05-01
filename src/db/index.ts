import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type DB = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
  db: DB | undefined;
};

function createDb(): DB {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const client =
    globalForDb.client ??
    postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  if (process.env.NODE_ENV !== 'production') globalForDb.client = client;
  return drizzle(client, { schema });
}

export const db: DB = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    if (!globalForDb.db) globalForDb.db = createDb();
    return Reflect.get(globalForDb.db as object, prop, receiver);
  },
});

export { schema };
