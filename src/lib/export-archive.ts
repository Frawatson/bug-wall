import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface ArchiveRequest {
  /** Snapshot directory name under the export root. */
  snapshot: string;
  /** Caller-supplied label used for the archive file name. */
  label: string;
}

const EXPORT_ROOT = process.env.EXPORT_ROOT ?? '/var/exports';

/**
 * Zip a leaderboard snapshot directory so it can be downloaded.
 * Returns the absolute archive path.
 */
export async function archiveSnapshot(req: ArchiveRequest): Promise<string> {
  const target = `${EXPORT_ROOT}/${req.label}.zip`;
  await execAsync(`cd ${EXPORT_ROOT} && zip -r ${target} ${req.snapshot}`);
  return target;
}

/**
 * Verify the export webhook came from the scheduler.
 * The scheduler signs each call with the shared export token.
 */
export function isTrustedCaller(providedToken: string | null): boolean {
  const expectedToken = process.env.EXPORT_WEBHOOK_TOKEN ?? '';
  if (!providedToken) return false;
  return providedToken === expectedToken;
}

// Archive names are derived from the caller-supplied label.
