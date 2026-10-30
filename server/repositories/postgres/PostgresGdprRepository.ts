import type { Pool } from 'pg';
import type {
  CancelDeletionResult,
  IGdprRepository,
  UserExportData,
} from '../interfaces/IGdprRepository';
import consola from 'consola';

// gdpr_requests.id is a uuid column — querying it with a non-uuid string
// (e.g. '' or a garbage token) throws a Postgres parse error rather than
// returning zero rows. Guard the shape first so a bad token falls through
// to the userId lookup instead of blowing up the whole cancellation.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// True when someone other than the owner is still an active member.
const OTHER_ACTIVE_MEMBER_SQL = `EXISTS (
  SELECT 1 FROM house_members hm
   WHERE hm.house_id = h.id AND hm.user_id <> $1 AND hm.left_at IS NULL
)`;

export class PostgresGdprRepository implements IGdprRepository {
  constructor(private readonly pool: Pool) {}

  async getOwnedHousesBlockingDeletion(
    userId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const result = await this.pool.query(
      `SELECT h.id, h.name FROM houses h
        WHERE h.owner_id = $1
          AND COALESCE(h.status, 'active') <> 'archived'
          AND ${OTHER_ACTIVE_MEMBER_SQL}
        ORDER BY h.name`,
      [userId],
    );
    return result.rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
    }));
  }

  async softDeleteUser(
    userId: string,
    stripeCancelScheduled = false,
  ): Promise<{ scheduledFor: Date; cancelToken: string }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Serialise concurrent requests for the same user (C6).
      await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [
        userId,
      ]);

      const existing = await client.query(
        `SELECT id, scheduled_for FROM gdpr_requests
          WHERE user_id = $1 AND type = 'deletion' AND status = 'pending'
          ORDER BY requested_at DESC LIMIT 1`,
        [userId],
      );
      if (existing.rows.length > 0) {
        await client.query('COMMIT');
        return {
          scheduledFor: new Date(existing.rows[0].scheduled_for),
          cancelToken: existing.rows[0].id as string,
        };
      }

      const scheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await client.query(`UPDATE users SET deleted_at = NOW() WHERE id = $1`, [
        userId,
      ]);

      // Houses where the user is the only active member die with the account.
      const archived = await client.query(
        `UPDATE houses h SET status = 'archived'
          WHERE h.owner_id = $1
            AND COALESCE(h.status, 'active') <> 'archived'
            AND NOT ${OTHER_ACTIVE_MEMBER_SQL}
          RETURNING h.id`,
        [userId],
      );
      const archivedHouseIds = (archived.rows ?? []).map(
        (r: { id: string }) => r.id,
      );

      const result = await client.query(
        `INSERT INTO gdpr_requests
           (user_id, type, status, scheduled_for, archived_house_ids, stripe_cancel_scheduled)
         VALUES ($1, 'deletion', 'pending', $2, $3, $4)
         RETURNING id`,
        [
          userId,
          scheduledFor.toISOString(),
          archivedHouseIds,
          stripeCancelScheduled,
        ],
      );

      await client.query('COMMIT');

      return {
        scheduledFor,
        cancelToken: result.rows[0].id as string,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      consola.error('PostgresGdprRepository.softDeleteUser error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelDeletion(
    cancelToken: string,
    userId?: string,
  ): Promise<CancelDeletionResult | null> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      let targetUserId: string | undefined;
      let tracked: Record<string, unknown> | undefined;

      if (UUID_REGEX.test(cancelToken)) {
        const requestResult = await client.query(
          `SELECT user_id, scheduled_for, status, archived_house_ids, stripe_cancel_scheduled FROM gdpr_requests
           WHERE id = $1 AND type = 'deletion' AND status = 'pending'`,
          [cancelToken],
        );

        if (requestResult.rows.length > 0) {
          const row = requestResult.rows[0];
          const rowUserId = row.user_id as string;

          // Ownership: a token only cancels the deletion it was issued for.
          if (userId && rowUserId !== userId) {
            await client.query('ROLLBACK');
            return null;
          }

          const scheduledFor = row.scheduled_for;
          if (scheduledFor && new Date(scheduledFor) < new Date()) {
            await client.query('ROLLBACK');
            return null;
          }

          targetUserId = rowUserId;
          tracked = row;
        }
      }

      if (!targetUserId) {
        if (!userId) {
          await client.query('ROLLBACK');
          return null;
        }
        const byUser = await client.query(
          `SELECT id, archived_house_ids, stripe_cancel_scheduled FROM gdpr_requests
           WHERE user_id = $1 AND type = 'deletion' AND status = 'pending'
             AND (scheduled_for IS NULL OR scheduled_for >= NOW())`,
          [userId],
        );
        if (byUser.rows.length === 0) {
          await client.query('ROLLBACK');
          return null;
        }
        targetUserId = userId;
        tracked = byUser.rows[0];
      }

      await client.query(`UPDATE users SET deleted_at = NULL WHERE id = $1`, [
        targetUserId,
      ]);

      // Undo exactly what the request archived, and only if still archived.
      const trackedIds = (tracked?.archived_house_ids as string[] | null) ?? [];
      let restoredHouseIds: string[] = [];
      if (trackedIds.length > 0) {
        const restored = await client.query(
          `UPDATE houses SET status = 'active'
            WHERE id = ANY($1::uuid[]) AND owner_id = $2 AND status = 'archived'
            RETURNING id`,
          [trackedIds, targetUserId],
        );
        restoredHouseIds = (restored.rows ?? []).map(
          (r: { id: string }) => r.id,
        );
      }

      await client.query(
        `UPDATE gdpr_requests SET status = 'cancelled', completed_at = NOW()
         WHERE user_id = $1 AND type = 'deletion' AND status = 'pending'`,
        [targetUserId],
      );

      await client.query(
        `INSERT INTO gdpr_requests (user_id, type, status, completed_at)
         VALUES ($1, 'deletion_cancelled', 'completed', NOW())`,
        [targetUserId],
      );

      await client.query('COMMIT');
      return {
        restoredHouseIds,
        stripeCancelScheduled: tracked?.stripe_cancel_scheduled === true,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      consola.error('PostgresGdprRepository.cancelDeletion error:', error);
      return null;
    } finally {
      client.release();
    }
  }

  async pseudonymizeUser(userId: string): Promise<boolean> {
    try {
      await this.pool.query(`SELECT pseudonymize_user($1)`, [userId]);
      return true;
    } catch (error) {
      consola.error('PostgresGdprRepository.pseudonymizeUser error:', {
        userId,
        error,
      });
      return false;
    }
  }

  async getPendingDeletions(): Promise<
    Array<{ userId: string; deletedAt: Date }>
  > {
    try {
      const result = await this.pool.query(
        `SELECT id, deleted_at FROM users
         WHERE deleted_at IS NOT NULL
           AND deleted_at < NOW() - INTERVAL '30 days'`,
      );
      return result.rows.map((r) => ({
        userId: r.id as string,
        deletedAt: new Date(r.deleted_at),
      }));
    } catch (error) {
      consola.error('PostgresGdprRepository.getPendingDeletions error:', error);
      return [];
    }
  }

  async recordExportRequest(userId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO gdpr_requests (user_id, type, status, completed_at)
       VALUES ($1, 'export', 'completed', NOW())`,
      [userId],
    );
  }

  async exportUserData(
    userId: string,
  ): Promise<Omit<UserExportData, 'security_events'>> {
    const q = (sql: string) => this.pool.query(sql, [userId]);
    const [
      userRes,
      housesRes,
      expensesRes,
      billsRes,
      remindersRes,
      monthlyRes,
      requestsRes,
      notesRes,
      reportsRes,
      invitationsRes,
      subscriptionRes,
      sessionsRes,
      consentsRes,
      settlementsRes,
    ] = await Promise.all([
      // Explicit column list: never export password_hash or other secrets.
      q(
        `SELECT id, email, first_name, last_name, created_at, terms_accepted_at, consent_version,
                preferred_currency, avatar_url, bio, gender,
                occupation_type, study_field, job_title, languages, pets, telephone,
                instagram, twitter, tiktok, linkedin, profile_pictures
           FROM users WHERE id = $1`,
      ),
      q(
        `SELECT h.id, h.name, hm.role, hm.joined_at, hm.left_at
           FROM houses h JOIN house_members hm ON h.id = hm.house_id
           WHERE hm.user_id = $1 ORDER BY hm.joined_at DESC`,
      ),
      // Expenses the user created and/or owes a share of.
      q(
        `SELECT e.id, e.description, e.total_amount, e.currency, e.created_at,
                (e.created_by = $1) AS created_by_me,
                es.amount_due AS my_share, es.is_paid
           FROM expenses e
           LEFT JOIN expense_shares es ON es.expense_id = e.id AND es.user_id = $1
           WHERE e.created_by = $1 OR es.user_id = $1
           ORDER BY e.created_at DESC`,
      ),
      q(
        `SELECT b.id, b.description, b.monthly_cost, b.currency, b.created_at, b.active
           FROM bills b WHERE b.created_by = $1 ORDER BY b.created_at DESC`,
      ),
      q(
        `SELECT br.id, br.bill_id, br.due_period, br.days_before, br.sent_at
           FROM bill_reminders br JOIN bills b ON b.id = br.bill_id
           WHERE b.created_by = $1 ORDER BY br.sent_at DESC`,
      ),
      q(
        `SELECT mr.id, mr.house_id, mr.year, mr.month, mr.total_amount, mr.expense_count, mr.generated_at
           FROM monthly_reports mr
           WHERE EXISTS (
             SELECT 1 FROM house_members hm
              WHERE hm.house_id = mr.house_id AND hm.user_id = $1
                AND make_date(mr.year, mr.month, 1) < COALESCE(hm.left_at, NOW() + INTERVAL '1 day')::date
                AND (make_date(mr.year, mr.month, 1) + INTERVAL '1 month') > hm.joined_at::date
           )
           ORDER BY mr.year DESC, mr.month DESC`,
      ),
      q(
        `SELECT type, status, requested_at, completed_at FROM gdpr_requests
           WHERE user_id = $1 ORDER BY requested_at DESC`,
      ),
      q(
        `SELECT id, house_id, message, dismiss_date, created_at FROM bulletin_notes
           WHERE user_id = $1 ORDER BY created_at DESC`,
      ),
      q(
        `SELECT id, house_id, description, created_at, read_at, solved_at FROM reports
           WHERE created_by = $1 ORDER BY created_at DESC`,
      ),
      // Never the invitation token.
      q(
        `SELECT id, house_id, invited_email, expires_at, used, used_at, created_at
           FROM house_invitations WHERE invited_by = $1 ORDER BY created_at DESC`,
      ),
      // Never Stripe secrets; customer/subscription ids are the user's own references.
      q(
        `SELECT plan, billing_period, status, stripe_customer_id, stripe_subscription_id,
                trial_ends_at, trial_used_at, current_period_end, created_at, updated_at
           FROM subscriptions WHERE user_id = $1`,
      ),
      // Session metadata only: no jti, no token material.
      q(
        `SELECT created_at, expires_at FROM refresh_tokens
           WHERE user_id = $1 ORDER BY created_at DESC`,
      ),
      q(
        `SELECT purpose, version, granted_at, withdrawn_at FROM user_consents
           WHERE user_id = $1 ORDER BY granted_at DESC`,
      ),
      // Payments (plan settlements and per-share payments) the user sent,
      // received or recorded. Ids only for the other party. Erasure keeps these
      // rows (shared financial ledger, see the settlements migration); they point at the pseudonymised user.
      q(
        `SELECT id, house_id, from_user_id, to_user_id, amount, kind, share_id, created_by, created_at, undone_at
           FROM settlements
           WHERE from_user_id = $1 OR to_user_id = $1 OR created_by = $1
           ORDER BY created_at DESC`,
      ),
    ]);

    const user = userRes.rows[0];
    return {
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        created_at: user.created_at,
        terms_accepted_at: user.terms_accepted_at ?? null,
        consent_version: user.consent_version ?? null,
        preferred_currency: user.preferred_currency ?? null,
        avatar_url: user.avatar_url ?? null,
        bio: user.bio ?? null,
        gender: user.gender ?? null,
        occupation_type: user.occupation_type ?? null,
        study_field: user.study_field ?? null,
        job_title: user.job_title ?? null,
        languages: user.languages ?? null,
        pets: user.pets ?? null,
        telephone: user.telephone ?? null,
        instagram: user.instagram ?? null,
        twitter: user.twitter ?? null,
        tiktok: user.tiktok ?? null,
        linkedin: user.linkedin ?? null,
        profile_pictures: user.profile_pictures ?? null,
      },
      houses: housesRes.rows,
      expenses: expensesRes.rows.map((r) => ({
        id: r.id,
        description: r.description,
        total_amount: Number(r.total_amount),
        currency: r.currency,
        created_at: r.created_at,
        created_by_me: Boolean(r.created_by_me),
        // Creator-only rows (no share) read as 0 / not paid; see created_by_me.
        my_share: Number(r.my_share ?? 0),
        is_paid: r.is_paid ?? false,
      })),
      bills: billsRes.rows.map((r) => ({
        id: r.id,
        description: r.description,
        monthly_cost: Number(r.monthly_cost),
        currency: r.currency,
        created_at: r.created_at,
        active: r.active,
      })),
      bill_reminders: remindersRes.rows,
      monthly_reports: monthlyRes.rows.map((r) => ({
        ...r,
        total_amount: Number(r.total_amount),
      })),
      bulletin_notes: notesRes.rows,
      reports: reportsRes.rows,
      invitations_sent: invitationsRes.rows,
      subscription: subscriptionRes.rows[0] ?? null,
      sessions: sessionsRes.rows,
      consents: consentsRes.rows,
      settlements: settlementsRes.rows.map((r) => ({
        ...r,
        amount: Number(r.amount),
      })),
      gdpr_requests: requestsRes.rows,
    };
  }

  async runScheduledCleanup(
    options: { excludeUserIds?: string[] } = {},
  ): Promise<{
    pseudonymized: number;
    pseudonymizedUserIds: string[];
    tokensCleared: number;
    invitationsCleared: number;
    resetTokensCleared: number;
    gdprRequestsCleared: number;
  }> {
    const excluded = new Set(options.excludeUserIds ?? []);
    const pending = (await this.getPendingDeletions()).filter(
      ({ userId }) => !excluded.has(userId),
    );
    const pseudonymizedUserIds: string[] = [];
    for (const { userId } of pending) {
      const ok = await this.pseudonymizeUser(userId);
      if (ok) pseudonymizedUserIds.push(userId);
    }

    // Rate-limit counters are only meaningful inside their window.
    await this.pool.query(
      `DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '2 hours'`,
    );

    const [tokensRes, invitationsRes, resetRes, requestsRes] =
      await Promise.all([
        this.pool.query(
          `DELETE FROM email_verification_tokens WHERE expires_at < NOW() AND verified = FALSE`,
        ),
        this.pool.query(
          `DELETE FROM house_invitations WHERE expires_at < NOW() AND used = FALSE`,
        ),
        this.pool.query(
          `DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL`,
        ),
        this.pool.query(
          `DELETE FROM gdpr_requests
         WHERE status IN ('completed', 'cancelled')
           AND COALESCE(completed_at, requested_at) < NOW() - INTERVAL '12 months'`,
        ),
      ]);

    return {
      pseudonymized: pseudonymizedUserIds.length,
      pseudonymizedUserIds,
      tokensCleared: tokensRes.rowCount ?? 0,
      invitationsCleared: invitationsRes.rowCount ?? 0,
      resetTokensCleared: resetRes.rowCount ?? 0,
      gdprRequestsCleared: requestsRes.rowCount ?? 0,
    };
  }
}
