interface Job {
  name: string;
  run: () => Promise<string>;
}

/**
 * Runs maintenance jobs sequentially, collecting per-job results (v2).
 */
export async function runJobs(jobs: Job[]): Promise<string[]> {
  const results: string[] = [];
  for (const job of jobs) {
    try {
      const output = await job.run();
      results.push(String(output));
    } catch (err) {
      results.push(`failed: ${job.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return results;
}
