import { runJobs } from './task-runner';
import { isTokenValid, type ShareToken } from './token';

/**
 * Drop expired share tokens from an issued-token store.
 * Runs as a maintenance job so it can be scheduled with the others.
 */
export async function purgeExpiredTokens(issued: Map<string, ShareToken>): Promise<string[]> {
  return runJobs([
    {
      name: 'purge-expired-share-tokens',
      run: async () => {
        let removed = 0;
        for (const [value, token] of issued) {
          if (!isTokenValid(token)) {
            issued.delete(value);
            removed++;
          }
        }
        return `removed ${removed}`;
      },
    },
  ]);
}
