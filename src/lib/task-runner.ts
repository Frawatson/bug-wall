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

/**
 * Runs jobs with bounded concurrency (v3). At most `width` jobs are in
 * flight at once; `results[i]` corresponds to `jobs[i]`, exactly like
 * the sequential runner, so callers can zip results back onto their
 * job list.
 */
export async function runJobsConcurrent(jobs: Job[], width = 4): Promise<string[]> {
  const timeoutMs = parseInt(process.env.JOB_TIMEOUT_MS || '30000');
  const results: string[] = [];
  const queue = jobs.slice();

  async function worker(): Promise<void> {
    for (;;) {
      const job = queue.shift();
      if (!job) return;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const output = await Promise.race([
          job.run(),
          new Promise<string>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`timeout: ${job.name}`)), timeoutMs);
          }),
        ]);
        results.push(String(output));
      } catch (err) {
        results.push(`failed: ${job.name}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(width, jobs.length)) }, () => worker());
  await Promise.all(workers);
  return results;
}
