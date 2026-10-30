import type { Pool } from 'pg';
import type {
  ISecurityEventRepository,
  SecurityEvent,
  SecurityEventType,
} from '../interfaces/ISecurityEventRepository';
import { repoQuery } from './utils';

export class PostgresSecurityEventRepository implements ISecurityEventRepository {
  constructor(private readonly pool: Pool) {}

  record(
    event: SecurityEventType,
    userId: string | null,
    ipHash: string | null,
    metadata: Record<string, unknown> | null = null,
  ) {
    return repoQuery(async () => {
      await this.pool.query(
        `INSERT INTO security_events (user_id, event, ip_hash, metadata) VALUES ($1, $2, $3, $4)`,
        [userId, event, ipHash, metadata ? JSON.stringify(metadata) : null],
      );
      return null;
    });
  }

  listByUser(userId: string) {
    return repoQuery(async () => {
      const res = await this.pool.query<SecurityEvent>(
        `SELECT id, user_id, event, ip_hash, created_at
           FROM security_events WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId],
      );
      return res.rows;
    });
  }

  purgeOlderThan(date: Date) {
    return repoQuery(async () => {
      const res = await this.pool.query(
        `DELETE FROM security_events WHERE created_at < $1`,
        [date.toISOString()],
      );
      return res.rowCount ?? 0;
    });
  }
}
