import { executeQuery } from './postgres';

/**
 * Atomically count a hit for `key` in a fixed window shared by all serverless
 * instances. Resets the window when it has expired. Returns the new count.
 */
export async function hitRateLimit(
  key: string,
  windowSeconds: number,
): Promise<number> {
  const result = await executeQuery<{ count: number }>(
    `INSERT INTO rate_limits (key, count, window_start) VALUES ($1, 1, NOW())
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < NOW() - make_interval(secs => $2) THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start < NOW() - make_interval(secs => $2) THEN NOW() ELSE rate_limits.window_start END
     RETURNING count`,
    [key, windowSeconds],
  );
  return Number(result.rows[0]?.count ?? 0);
}
