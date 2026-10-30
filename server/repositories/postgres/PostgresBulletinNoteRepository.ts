import type { Pool } from 'pg';
import type {
  IBulletinNoteRepository,
  BulletinNote,
  BulletinNoteCreateData,
  BulletinNoteUpdateData,
} from '../interfaces/IBulletinNoteRepository';
import type {
  RepositoryResponse,
  PaginatedResponse,
} from '../interfaces/IBaseRepository';
import { repoQuery } from './utils';

export class PostgresBulletinNoteRepository implements IBulletinNoteRepository {
  constructor(private readonly pool: Pool) {}

  async getById(noteId: string): Promise<RepositoryResponse<BulletinNote>> {
    return repoQuery(async () => {
      const result = await this.pool.query<BulletinNote>(
        `SELECT bn.*,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as user
         FROM bulletin_notes bn
         LEFT JOIN users u ON bn.user_id = u.id
         WHERE bn.id = $1`,
        [noteId],
      );

      if (result.rows.length === 0) throw new Error('Bulletin note not found');
      return result.rows[0]!;
    });
  }

  async getByHouse(
    houseId: string,
    options?: {
      activeOnly?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<PaginatedResponse<BulletinNote>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const activeOnly = options?.activeOnly ?? false;

    const result = await repoQuery<PaginatedResponse<BulletinNote>>(
      async () => {
        let whereClause = 'bn.house_id = $1';
        const params: unknown[] = [houseId];

        if (activeOnly) {
          whereClause +=
            ' AND (bn.dismiss_date IS NULL OR bn.dismiss_date > CURRENT_DATE)';
        }

        const countResult = await this.pool.query<{ count: string }>(
          `SELECT COUNT(*) as count FROM bulletin_notes bn WHERE ${whereClause}`,
          params,
        );
        const total = Number.parseInt(countResult.rows[0]?.count || '0');

        params.push(limit, offset);
        const paramCount = params.length - 1;

        const notesResult = await this.pool.query<BulletinNote>(
          `SELECT bn.*,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as user
         FROM bulletin_notes bn
         LEFT JOIN users u ON bn.user_id = u.id
         WHERE ${whereClause}
         ORDER BY bn.created_at DESC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
          params,
        );

        return { data: notesResult.rows, error: null, total, limit, offset };
      },
    );

    if (result.error || !result.data) {
      return { data: [], error: result.error, total: 0, limit, offset };
    }
    return result.data;
  }

  async getActiveForUser(
    houseId: string,
  ): Promise<RepositoryResponse<BulletinNote[]>> {
    return repoQuery(async () => {
      const result = await this.pool.query<BulletinNote>(
        `SELECT bn.*,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as user
         FROM bulletin_notes bn
         LEFT JOIN users u ON bn.user_id = u.id
         WHERE bn.house_id = $1
           AND (bn.dismiss_date IS NULL OR bn.dismiss_date > CURRENT_DATE)
         ORDER BY bn.created_at DESC`,
        [houseId],
      );
      return result.rows;
    });
  }

  async create(
    data: BulletinNoteCreateData,
  ): Promise<RepositoryResponse<BulletinNote>> {
    return repoQuery(async () => {
      const result = await this.pool.query<BulletinNote>(
        `INSERT INTO bulletin_notes (house_id, user_id, message, dismiss_date, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [data.house_id, data.user_id, data.message, data.dismiss_date || null],
      );

      const createdNote = result.rows[0];
      if (!createdNote) throw new Error('Failed to create bulletin note');

      const fresh = await this.getById(createdNote.id);
      if (fresh.error) throw new Error(fresh.error);
      return fresh.data!;
    });
  }

  async update(
    noteId: string,
    data: BulletinNoteUpdateData,
  ): Promise<RepositoryResponse<BulletinNote>> {
    return repoQuery(async () => {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      if (data.message !== undefined) {
        updates.push(`message = $${paramCount++}`);
        values.push(data.message);
      }
      if (data.dismiss_date !== undefined) {
        updates.push(`dismiss_date = $${paramCount++}`);
        values.push(data.dismiss_date);
      }

      if (updates.length === 0) {
        const existing = await this.getById(noteId);
        if (existing.error) throw new Error(existing.error);
        return existing.data!;
      }

      values.push(noteId);

      const result = await this.pool.query<BulletinNote>(
        `UPDATE bulletin_notes
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values,
      );

      if (result.rows.length === 0) throw new Error('Bulletin note not found');

      const fresh = await this.getById(noteId);
      if (fresh.error) throw new Error(fresh.error);
      return fresh.data!;
    });
  }

  async delete(noteId: string): Promise<RepositoryResponse<void>> {
    return repoQuery(async () => {
      await this.pool.query('DELETE FROM bulletin_notes WHERE id = $1', [
        noteId,
      ]);
    });
  }

  async dismiss(
    noteId: string,
    dismissDate: string,
  ): Promise<RepositoryResponse<void>> {
    return repoQuery(async () => {
      await this.pool.query(
        'UPDATE bulletin_notes SET dismiss_date = $1 WHERE id = $2',
        [dismissDate, noteId],
      );
    });
  }

  async cleanup(houseId?: string): Promise<RepositoryResponse<void>> {
    return repoQuery(async () => {
      if (houseId) {
        await this.pool.query(
          `DELETE FROM bulletin_notes
           WHERE house_id = $1
             AND dismiss_date IS NOT NULL
             AND dismiss_date < CURRENT_DATE`,
          [houseId],
        );
      } else {
        await this.pool.query(
          `DELETE FROM bulletin_notes
           WHERE dismiss_date IS NOT NULL
             AND dismiss_date < CURRENT_DATE`,
        );
      }
    });
  }

  async isCreator(noteId: string, userId: string): Promise<boolean> {
    const result = await repoQuery(async () => {
      const r = await this.pool.query<{ exists: boolean }>(
        `SELECT EXISTS(
          SELECT 1 FROM bulletin_notes n
          JOIN house_members hm
            ON hm.house_id = n.house_id AND hm.user_id = n.user_id AND hm.left_at IS NULL
          WHERE n.id = $1 AND n.user_id = $2
        )`,
        [noteId, userId],
      );
      return r.rows[0]?.exists ?? false;
    });
    return result.data ?? false;
  }
}
