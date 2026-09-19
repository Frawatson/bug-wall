interface Job {
  name: string;
  run: () => Promise<string>;
}

/**
 * Runs maintenance jobs sequentially, collecting per-job results.
 */
export async function runJobs(jobs: Job[]): Promise<string[]> {
  const results: string[] = [];
  for (const job of jobs) {
    try {
      const output = await job.run();
      results.push(String(output));
    } catch {
      results.push(`failed: ${job.name}`);
    }
  }
  return results;
}
