import type { Pool, PoolClient } from 'pg';
import type {
  IHouseRepository,
  House,
  HouseMember,
  HouseInvitation,
  InvitationPreview,
  HouseCreateData,
  HouseUpdateData,
} from '../interfaces/IHouseRepository';
import type {
  RepositoryResponse,
  PaginatedResponse,
  PaginationParams,
} from '../interfaces/IBaseRepository';
import { randomUUID, randomInt } from 'node:crypto';
import consola from 'consola';
import { repoQuery } from './utils';

const REDEEM_FAIL_LIMIT = 5;
const PG_UNIQUE_VIOLATION = '23505';

const isUniqueViolation = (err: unknown): boolean =>
  (err as { code?: unknown } | null)?.code === PG_UNIQUE_VIOLATION;

/**
 * Lock the house row, then throw HOUSE_FULL if active members already reach
 * max_members. Must run inside the caller's transaction so concurrent joins
 * serialize on the house row.
 */
async function assertHouseHasCapacity(
  client: PoolClient,
  houseId: string,
): Promise<void> {
  const r = await client.query<{ max_members: number; current: string }>(
    `SELECT h.max_members,
            (SELECT COUNT(*) FROM house_members
              WHERE house_id = h.id AND left_at IS NULL) AS current
       FROM houses h WHERE h.id = $1 FOR UPDATE`,
    [houseId],
  );
  const row = r.rows[0];
  if (!row) throw new Error('House not found');
  if (Number.parseInt(row.current, 10) >= row.max_members) {
    throw new Error('HOUSE_FULL');
  }
}

export class PostgresHouseRepository implements IHouseRepository {
  constructor(private readonly pool: Pool) {}

  async getById(
    houseId: string,
    includeMembers = false,
  ): Promise<RepositoryResponse<House>> {
    return repoQuery(async () => {
      const houseResult = await this.pool.query<House>(
        'SELECT * FROM houses WHERE id = $1',
        [houseId],
      );

      if (houseResult.rows.length === 0) throw new Error('House not found');
      const house = houseResult.rows[0]!;

      if (includeMembers) {
        const membersResult = await this.pool.query<HouseMember>(
          `SELECT hm.*,
            json_build_object(
              'id', u.id,
              'email', u.email,
              'first_name', u.first_name,
              'last_name', u.last_name,
              'avatar_url', u.avatar_url
            ) as user
           FROM house_members hm
           LEFT JOIN users u ON hm.user_id = u.id
           WHERE hm.house_id = $1 AND hm.left_at IS NULL AND u.deleted_at IS NULL
           ORDER BY hm.joined_at`,
          [houseId],
        );
        house.members = membersResult.rows;
      }

      return house;
    });
  }

  async getAll(
    pagination: PaginationParams,
    includeMembers = false,
  ): Promise<PaginatedResponse<House>> {
    const offset = (pagination.page - 1) * pagination.limit;

    const result = await repoQuery<PaginatedResponse<House>>(async () => {
      const countResult = await this.pool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM houses',
      );
      const total = Number.parseInt(countResult.rows[0]?.count || '0');

      const housesResult = await this.pool.query<House>(
        `SELECT * FROM houses
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [pagination.limit, offset],
      );

      const houses = housesResult.rows;

      if (includeMembers && houses.length > 0) {
        const houseIds = houses.map((h) => h.id);
        const membersResult = await this.pool.query<
          HouseMember & { house_id: string }
        >(
          `SELECT hm.*,
            json_build_object(
              'id', u.id,
              'email', u.email,
              'first_name', u.first_name,
              'last_name', u.last_name,
              'avatar_url', u.avatar_url
            ) as user
           FROM house_members hm
           LEFT JOIN users u ON hm.user_id = u.id
           WHERE hm.house_id = ANY($1) AND hm.left_at IS NULL AND u.deleted_at IS NULL`,
          [houseIds],
        );

        const membersByHouse = new Map<string, HouseMember[]>();
        membersResult.rows.forEach((member) => {
          const houseMembers = membersByHouse.get(member.house_id) || [];
          houseMembers.push(member);
          membersByHouse.set(member.house_id, houseMembers);
        });

        houses.forEach((house) => {
          house.members = membersByHouse.get(house.id) || [];
        });
      }

      return {
        data: houses,
        error: null,
        total,
        limit: pagination.limit,
        offset,
      };
    });

    if (result.error || !result.data) {
      return {
        data: [],
        error: result.error,
        total: 0,
        limit: pagination.limit,
        offset,
      };
    }
    return result.data;
  }

  async getCurrentForUser(userId: string): Promise<RepositoryResponse<House>> {
    const result = await repoQuery(async () => {
      const r = await this.pool.query<House>(
        `SELECT h.* FROM houses h
         INNER JOIN house_members hm ON h.id = hm.house_id
         WHERE hm.user_id = $1 AND hm.left_at IS NULL
         ORDER BY hm.joined_at DESC
         LIMIT 1`,
        [userId],
      );
      // null is valid here — user may have no active house
      return r.rows[0] ?? null;
    });
    return result as RepositoryResponse<House>;
  }

  async create(data: HouseCreateData): Promise<RepositoryResponse<House>> {
    return repoQuery(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        const houseResult = await client.query<House>(
          `INSERT INTO houses (name, address, currency, max_members, owner_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            data.name,
            data.address || null,
            data.currency || 'EUR',
            data.max_members || 10,
            data.owner_id,
          ],
        );

        const house = houseResult.rows[0];
        if (!house) throw new Error('Failed to create house');

        await client.query(
          `INSERT INTO house_members (house_id, user_id, role, joined_at)
           VALUES ($1, $2, 'owner', NOW())`,
          [house.id, data.owner_id],
        );

        await client.query('COMMIT');
        return house;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    });
  }

  async update(
    houseId: string,
    data: HouseUpdateData,
  ): Promise<RepositoryResponse<House>> {
    return repoQuery(async () => {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramCount = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(data.name);
      }
      if (data.address !== undefined) {
        updates.push(`address = $${paramCount++}`);
        values.push(data.address);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(data.description);
      }
      if (data.currency !== undefined) {
        updates.push(`currency = $${paramCount++}`);
        values.push(data.currency);
      }
      if (data.max_members !== undefined) {
        updates.push(`max_members = $${paramCount++}`);
        values.push(data.max_members);
      }

      if (updates.length === 0) {
        const existing = await this.getById(houseId);
        if (existing.error) throw new Error(existing.error);
        return existing.data!;
      }

      values.push(houseId);

      const result = await this.pool.query<House>(
        `UPDATE houses
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values,
      );

      if (result.rows.length === 0) throw new Error('House not found');
      return result.rows[0]!;
    });
  }

  async delete(houseId: string): Promise<RepositoryResponse<void>> {
    return repoQuery(async () => {
      await this.pool.query('DELETE FROM houses WHERE id = $1', [houseId]);
    });
  }

  async addMember(
    houseId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member' = 'member',
  ): Promise<RepositoryResponse<HouseMember>> {
    return repoQuery(async () => {
      const result = await this.pool.query<HouseMember>(
        `INSERT INTO house_members (house_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [houseId, userId, role],
      );

      const member = result.rows[0];
      if (!member) throw new Error('Failed to add member');
      return member;
    });
  }

  async removeMember(
    houseId: string,
    userId: string,
  ): Promise<RepositoryResponse<void>> {
    return repoQuery(async () => {
      await this.pool.query(
        `UPDATE house_members
         SET left_at = NOW()
         WHERE house_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [houseId, userId],
      );
    });
  }

  async archiveHouse(houseId: string): Promise<RepositoryResponse<void>> {
    return repoQuery(async () => {
      const result = await this.pool.query(
        `UPDATE houses SET status = 'archived', updated_at = NOW() WHERE id = $1`,
        [houseId],
      );
      if ((result.rowCount ?? 0) === 0) throw new Error('House not found');
    });
  }

  async updateMemberRole(
    houseId: string,
    userId: string,
    role: 'admin' | 'member',
  ): Promise<RepositoryResponse<HouseMember>> {
    return repoQuery(async () => {
      const result = await this.pool.query<HouseMember>(
        `UPDATE house_members
         SET role = $3
         WHERE house_id = $1 AND user_id = $2 AND left_at IS NULL
           AND role <> 'owner'
         RETURNING *`,
        [houseId, userId, role],
      );
      if (!result.rows[0]) throw new Error('Member not found');
      return result.rows[0];
    });
  }

  /**
   * Hand the single owner role from `fromUserId` to `toUserId`. The previous
   * owner becomes a plain member. Demote runs first so the partial unique
   * index (one active owner per house) never sees two owners; the row locks
   * taken by the UPDATEs serialize concurrent transfers. houses.owner_id is
   * kept in step with the role, which stays canonical.
   */
  async transferOwnership(
    houseId: string,
    fromUserId: string,
    toUserId: string,
  ): Promise<RepositoryResponse<void>> {
    return repoQuery(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        const demoted = await client.query(
          `UPDATE house_members SET role = 'member'
           WHERE house_id = $1 AND user_id = $2 AND role = 'owner' AND left_at IS NULL`,
          [houseId, fromUserId],
        );
        if ((demoted.rowCount ?? 0) === 0) throw new Error('NOT_OWNER');

        const promoted = await client.query(
          `UPDATE house_members SET role = 'owner'
           WHERE house_id = $1 AND user_id = $2 AND left_at IS NULL`,
          [houseId, toUserId],
        );
        if ((promoted.rowCount ?? 0) === 0) throw new Error('MEMBER_NOT_FOUND');

        await client.query(
          `UPDATE houses SET owner_id = $2, updated_at = NOW() WHERE id = $1`,
          [houseId, toUserId],
        );

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    });
  }

  async getMembers(
    houseId: string,
  ): Promise<RepositoryResponse<HouseMember[]>> {
    return repoQuery(async () => {
      const result = await this.pool.query<HouseMember>(
        `SELECT hm.*,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as user
         FROM house_members hm
         LEFT JOIN users u ON hm.user_id = u.id
         WHERE hm.house_id = $1 AND hm.left_at IS NULL AND u.deleted_at IS NULL
         ORDER BY hm.joined_at`,
        [houseId],
      );
      return result.rows;
    });
  }

  async isMember(houseId: string, userId: string): Promise<boolean> {
    const result = await repoQuery(async () => {
      const r = await this.pool.query<{ exists: boolean }>(
        `SELECT EXISTS(
          SELECT 1 FROM house_members
          WHERE house_id = $1 AND user_id = $2 AND left_at IS NULL
        )`,
        [houseId, userId],
      );
      return r.rows[0]?.exists ?? false;
    });
    return result.data ?? false;
  }

  async isOwner(houseId: string, userId: string): Promise<boolean> {
    const result = await repoQuery(async () => {
      const r = await this.pool.query<{ exists: boolean }>(
        `SELECT EXISTS(
          SELECT 1 FROM house_members
          WHERE house_id = $1 AND user_id = $2 AND role = 'owner' AND left_at IS NULL
        )`,
        [houseId, userId],
      );
      return r.rows[0]?.exists ?? false;
    });
    return result.data ?? false;
  }

  async getMemberRole(
    houseId: string,
    userId: string,
  ): Promise<RepositoryResponse<string>> {
    return repoQuery(async () => {
      const result = await this.pool.query<{ role: string }>(
        `SELECT role FROM house_members
         WHERE house_id = $1 AND user_id = $2 AND left_at IS NULL`,
        [houseId, userId],
      );

      if (result.rows.length === 0)
        throw new Error('Not a member of this house');
      const role = result.rows[0]?.role;
      if (!role) throw new Error('Invalid member data');
      return role;
    });
  }

  async createInvitation(
    houseId: string,
    email: string,
    invitedBy: string,
  ): Promise<RepositoryResponse<HouseInvitation>> {
    return repoQuery(async () => {
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48); // 48-hour expiry per product spec

      const result = await this.pool.query<HouseInvitation>(
        `INSERT INTO house_invitations (house_id, invited_email, invited_by, token, expires_at, used)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING *`,
        [houseId, email, invitedBy, token, expiresAt.toISOString()],
      );

      const invitation = result.rows[0];
      if (!invitation) throw new Error('Failed to create invitation');
      return invitation;
    });
  }

  async getInvitationByToken(
    token: string,
  ): Promise<RepositoryResponse<HouseInvitation>> {
    return repoQuery(async () => {
      const result = await this.pool.query<HouseInvitation>(
        'SELECT * FROM house_invitations WHERE token = $1',
        [token],
      );

      if (result.rows.length === 0) throw new Error('Invitation not found');
      return result.rows[0]!;
    });
  }

  async getInvitationPreview(
    token: string,
  ): Promise<RepositoryResponse<InvitationPreview>> {
    return repoQuery(async () => {
      // Only a live token (unused, unexpired) resolves; only the house name
      // and a member COUNT leave the database.
      const result = await this.pool.query<InvitationPreview>(
        `SELECT h.name AS house_name,
           (SELECT COUNT(*)::int
              FROM house_members hm
              JOIN users u ON u.id = hm.user_id
             WHERE hm.house_id = h.id AND hm.left_at IS NULL
               AND u.deleted_at IS NULL) AS member_count
         FROM house_invitations i
         JOIN houses h ON h.id = i.house_id
         WHERE i.token = $1 AND i.used = false AND i.code_used_at IS NULL
           AND i.expires_at > NOW()`,
        [token],
      );
      if (result.rows.length === 0) throw new Error('Invitation not found');
      return result.rows[0]!;
    });
  }

  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<RepositoryResponse<HouseInvitation>> {
    return repoQuery(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        const inviteResult = await client.query<HouseInvitation>(
          'SELECT * FROM house_invitations WHERE token = $1 AND used = false AND code_used_at IS NULL FOR UPDATE',
          [token],
        );

        if (inviteResult.rows.length === 0)
          throw new Error('Invalid or already used invitation');
        const invitation = inviteResult.rows[0]!;

        await assertHouseHasCapacity(client, invitation.house_id);

        await client.query(
          `INSERT INTO house_members (house_id, user_id, role, joined_at)
           VALUES ($1, $2, 'member', NOW())`,
          [invitation.house_id, userId],
        );

        const updateResult = await client.query<HouseInvitation>(
          `UPDATE house_invitations
           SET used = true, used_by = $1, used_at = NOW(),
               code_used_at = COALESCE(code_used_at, NOW())
           WHERE id = $2
           RETURNING *`,
          [userId, invitation.id],
        );

        await client.query('COMMIT');

        const updatedInvitation = updateResult.rows[0];
        if (!updatedInvitation) throw new Error('Failed to update invitation');
        return updatedInvitation;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    });
  }

  async attachInviteCode(
    invitationId: string,
  ): Promise<RepositoryResponse<{ code: string; code_expires_at: string }>> {
    return repoQuery(async () => {
      const codeExpiresAt = new Date();
      codeExpiresAt.setHours(codeExpiresAt.getHours() + 24); // 24h independent of token expiry

      let attempts = 0;
      const maxAttempts = 10;

      // Retry on unique-index collision (extremely rare with 10^6 space)
      while (attempts < maxAttempts) {
        const candidate = String(randomInt(0, 1_000_000)).padStart(6, '0');
        let result: { rows: Array<{ code: string; code_expires_at: string }> };
        try {
          result = await this.pool.query<{
            code: string;
            code_expires_at: string;
          }>(
            `UPDATE house_invitations
           SET code = $2,
               code_expires_at = $3,
               code_used_at = NULL,
               code_attempts = 0,
               code_locked_until = NULL
           WHERE id = $1
           RETURNING code, code_expires_at`,
            [invitationId, candidate, codeExpiresAt.toISOString()],
          );
        } catch (err) {
          // Candidate collided with the unique code index: try another one.
          if (isUniqueViolation(err)) {
            attempts++;
            continue;
          }
          throw err;
        }
        if (result.rows[0]) {
          return result.rows[0];
        }
        attempts++;
      }
      throw new Error('Failed to generate unique invite code');
    });
  }

  async getActiveInviteCode(
    houseId: string,
  ): Promise<
    RepositoryResponse<{ code: string; code_expires_at: string } | null>
  > {
    return repoQuery(async () => {
      const result = await this.pool.query<{
        code: string;
        code_expires_at: string;
      }>(
        `SELECT code, code_expires_at
         FROM house_invitations
         WHERE house_id = $1
           AND invited_email = ''
           AND code IS NOT NULL
           AND code_used_at IS NULL
           AND code_expires_at > NOW()
           AND (code_locked_until IS NULL OR code_locked_until < NOW())
         ORDER BY created_at DESC
         LIMIT 1`,
        [houseId],
      );
      return result.rows[0] ?? null;
    });
  }

  async getInvitationByCode(
    code: string,
  ): Promise<RepositoryResponse<HouseInvitation>> {
    return repoQuery(async () => {
      const result = await this.pool.query<HouseInvitation>(
        'SELECT * FROM house_invitations WHERE code = $1',
        [code],
      );
      if (result.rows.length === 0) throw new Error('Invitation not found');
      return result.rows[0]!;
    });
  }

  async redeemInviteCode(
    code: string,
    userId: string,
  ): Promise<RepositoryResponse<HouseInvitation>> {
    return repoQuery(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        const inviteResult = await client.query<HouseInvitation>(
          `SELECT * FROM house_invitations WHERE code = $1 FOR UPDATE`,
          [code],
        );

        if (inviteResult.rows.length === 0) throw new Error('CODE_NOT_FOUND');

        const invitation = inviteResult.rows[0]!;

        if (
          invitation.code_locked_until &&
          new Date(invitation.code_locked_until) > new Date()
        ) {
          throw new Error('CODE_LOCKED');
        }
        // The link and the code are the same invitation: using either spends both.
        if (invitation.code_used_at || invitation.used)
          throw new Error('CODE_USED');
        if (
          !invitation.code_expires_at ||
          new Date(invitation.code_expires_at) < new Date()
        ) {
          throw new Error('CODE_EXPIRED');
        }

        await assertHouseHasCapacity(client, invitation.house_id);

        await client.query(
          `INSERT INTO house_members (house_id, user_id, role, joined_at)
           VALUES ($1, $2, 'member', NOW())`,
          [invitation.house_id, userId],
        );

        const updateResult = await client.query<HouseInvitation>(
          `UPDATE house_invitations
           SET code_used_at = NOW(), used = true, used_at = NOW(), used_by = $2
           WHERE id = $1
           RETURNING *`,
          [invitation.id, userId],
        );

        await client.query('COMMIT');

        const updated = updateResult.rows[0];
        if (!updated) throw new Error('Failed to mark code as used');
        return updated;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    });
  }

  async registerFailedCodeAttempt(code: string): Promise<void> {
    await this.pool
      .query(
        `UPDATE house_invitations
         SET code_attempts = code_attempts + 1,
             code_locked_until = CASE
               WHEN code_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
               ELSE code_locked_until
             END
         WHERE code = $1`,
        [code],
      )
      .catch(() => {
        // Silent fail — anti-enumeration: callers don't need to know if code exists
      });
  }

  async registerFailedRedeemAttempt(userId: string): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO rate_limits (key, count, window_start)
         VALUES ($1, 1, NOW())
         ON CONFLICT (key) DO UPDATE SET
           count = CASE WHEN rate_limits.window_start < NOW() - INTERVAL '1 hour' THEN 1 ELSE rate_limits.count + 1 END,
           window_start = CASE WHEN rate_limits.window_start < NOW() - INTERVAL '1 hour' THEN NOW() ELSE rate_limits.window_start END
         RETURNING count`,
        [`redeem-fail:${userId}`],
      );
    } catch (error) {
      consola.error('registerFailedRedeemAttempt failed', error);
    }
  }

  async isRedeemBlocked(userId: string): Promise<boolean> {
    const r = await this.pool.query<{ count: number }>(
      `SELECT count FROM rate_limits
       WHERE key = $1 AND window_start >= NOW() - INTERVAL '1 hour'`,
      [`redeem-fail:${userId}`],
    );
    return (r.rows[0]?.count ?? 0) >= REDEEM_FAIL_LIMIT;
  }

  async isAtCapacity(houseId: string): Promise<boolean> {
    const result = await repoQuery(async () => {
      const r = await this.pool.query<{
        current_members: string;
        max_members: number;
      }>(
        `SELECT h.max_members,
          (SELECT COUNT(*) FROM house_members WHERE house_id = h.id AND left_at IS NULL) as current_members
         FROM houses h
         WHERE h.id = $1`,
        [houseId],
      );

      if (!r.rows.length) return true;
      const stats = r.rows[0]!;
      return Number.parseInt(stats.current_members) >= stats.max_members;
    });
    return result.data ?? true; // on error, treat as at capacity for safety
  }

  async countOwnedHouses(userId: string): Promise<RepositoryResponse<number>> {
    return repoQuery(async () => {
      const result = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*)::integer AS count
           FROM house_members
          WHERE user_id = $1 AND role = 'owner' AND left_at IS NULL`,
        [userId],
      );
      return Number(result.rows[0]?.count ?? 0);
    });
  }

  async getHousesForUser(userId: string): Promise<RepositoryResponse<House[]>> {
    return repoQuery(async () => {
      const result = await this.pool.query<House>(
        `SELECT h.* FROM houses h
         INNER JOIN house_members hm ON h.id = hm.house_id
         WHERE hm.user_id = $1 AND hm.left_at IS NULL
         ORDER BY hm.joined_at ASC`,
        [userId],
      );
      return result.rows;
    });
  }
}
