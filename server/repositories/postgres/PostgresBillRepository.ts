import type { Pool } from 'pg';
import type {
  IBillRepository,
  Bill,
  BillDocument,
  BillCreateData,
  BillUpdateData,
} from '../interfaces/IBillRepository';
import type {
  RepositoryResponse,
  PaginatedResponse,
} from '../interfaces/IBaseRepository';
import { repoQuery } from './utils';

function normalizeBill(bill: Bill): Bill {
  return {
    ...bill,
    monthly_cost:
      typeof bill.monthly_cost === 'string'
        ? Number.parseFloat(bill.monthly_cost)
        : bill.monthly_cost,
    payment_period:
      typeof bill.payment_period === 'string'
        ? Number.parseInt(bill.payment_period)
        : bill.payment_period,
  };
}

export class PostgresBillRepository implements IBillRepository {
  constructor(private readonly pool: Pool) {}

  async getById(billId: string): Promise<RepositoryResponse<Bill>> {
    return repoQuery(async () => {
      const billResult = await this.pool.query<Bill>(
        `SELECT b.*,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as creator
         FROM bills b
         LEFT JOIN users u ON b.created_by = u.id
         WHERE b.id = $1`,
        [billId],
      );

      if (billResult.rows.length === 0) throw new Error('Bill not found');
      const bill = normalizeBill(billResult.rows[0]!);

      const docsResult = await this.pool.query<BillDocument>(
        'SELECT * FROM bill_documents WHERE bill_id = $1 ORDER BY uploaded_at DESC',
        [billId],
      );
      bill.documents = docsResult.rows;

      return bill;
    });
  }

  async getByHouse(
    houseId: string,
    options?: {
      activeOnly?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<PaginatedResponse<Bill>> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const activeOnly = options?.activeOnly ?? false;

    const result = await repoQuery<PaginatedResponse<Bill>>(async () => {
      let whereClause = 'b.house_id = $1';
      const params: unknown[] = [houseId];

      if (activeOnly) {
        whereClause += ' AND b.active = true';
      }

      const countResult = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM bills b WHERE ${whereClause}`,
        params,
      );
      const total = Number.parseInt(countResult.rows[0]?.count || '0');

      params.push(limit, offset);
      const paramCount = params.length - 1;

      const billsResult = await this.pool.query<Bill>(
        `SELECT b.*,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as creator
         FROM bills b
         LEFT JOIN users u ON b.created_by = u.id
         WHERE ${whereClause}
         ORDER BY b.next_due_date ASC, b.created_at DESC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        params,
      );

      const bills = billsResult.rows;

      if (bills.length > 0) {
        const billIds = bills.map((b) => b.id);
        const docsResult = await this.pool.query<
          BillDocument & { bill_id: string }
        >(
          `SELECT * FROM bill_documents
           WHERE bill_id = ANY($1)
           ORDER BY uploaded_at DESC`,
          [billIds],
        );

        const docsByBill = new Map<string, BillDocument[]>();
        docsResult.rows.forEach((doc) => {
          const billDocs = docsByBill.get(doc.bill_id) || [];
          billDocs.push(doc);
          docsByBill.set(doc.bill_id, billDocs);
        });

        bills.forEach((bill) => {
          bill.documents = docsByBill.get(bill.id) || [];
        });
      }

      return {
        data: bills.map(normalizeBill),
        error: null,
        total,
        limit,
        offset,
      };
    });

    if (result.error || !result.data) {
      return { data: [], error: result.error, total: 0, limit, offset };
    }
    return result.data;
  }

  async create(data: BillCreateData): Promise<RepositoryResponse<Bill>> {
    return repoQuery(async () => {
      const result = await this.pool.query<Bill>(
        `INSERT INTO bills (
          house_id, description, monthly_cost, payment_period,
          next_due_date, created_by, active, categories, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [
          data.house_id,
          data.description,
          data.monthly_cost,
          data.payment_period || 1,
          data.next_due_date,
          data.created_by,
          data.active ?? true,
          data.categories ?? [],
        ],
      );

      const createdBill = result.rows[0];
      if (!createdBill) throw new Error('Failed to create bill');
      return normalizeBill(createdBill);
    });
  }

  async update(
    billId: string,
    data: BillUpdateData,
  ): Promise<RepositoryResponse<Bill>> {
    return repoQuery(async () => {
      const updates: string[] = ['updated_at = NOW()'];
      const values: unknown[] = [];
      let paramCount = 1;

      if (data.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(data.description);
      }
      if (data.monthly_cost !== undefined) {
        updates.push(`monthly_cost = $${paramCount++}`);
        values.push(data.monthly_cost);
      }
      if (data.payment_period !== undefined) {
        updates.push(`payment_period = $${paramCount++}`);
        values.push(data.payment_period);
      }
      if (data.next_due_date !== undefined) {
        updates.push(`next_due_date = $${paramCount++}`);
        values.push(data.next_due_date);
      }
      if (data.active !== undefined) {
        updates.push(`active = $${paramCount++}`);
        values.push(data.active);
      }
      if (data.categories !== undefined) {
        updates.push(`categories = $${paramCount++}`);
        values.push(data.categories);
      }

      if (updates.length === 1) {
        const existing = await this.getById(billId);
        if (existing.error) throw new Error(existing.error);
        return existing.data!;
      }

      values.push(billId);

      const result = await this.pool.query<Bill>(
        `UPDATE bills
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values,
      );

      if (result.rows.length === 0) throw new Error('Bill not found');

      const updated = await this.getById(billId);
      if (updated.error) throw new Error(updated.error);
      return updated.data!;
    });
  }

  async delete(billId: string): Promise<RepositoryResponse<void>> {
    return repoQuery(async () => {
      await this.pool.query('DELETE FROM bills WHERE id = $1', [billId]);
    });
  }

  async getDocuments(
    billId: string,
  ): Promise<RepositoryResponse<BillDocument[]>> {
    return repoQuery(async () => {
      const result = await this.pool.query<BillDocument>(
        'SELECT * FROM bill_documents WHERE bill_id = $1 ORDER BY uploaded_at DESC',
        [billId],
      );
      return result.rows;
    });
  }

  async addDocument(
    billId: string,
    filename: string,
    url: string,
    uploadedBy: string,
  ): Promise<RepositoryResponse<BillDocument>> {
    return repoQuery(async () => {
      const result = await this.pool.query<BillDocument>(
        `INSERT INTO bill_documents (bill_id, filename, url, uploaded_by, uploaded_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [billId, filename, url, uploadedBy],
      );

      const document = result.rows[0];
      if (!document) throw new Error('Failed to add document');
      return document;
    });
  }

  async deleteDocument(documentId: string): Promise<RepositoryResponse<void>> {
    return repoQuery(async () => {
      await this.pool.query('DELETE FROM bill_documents WHERE id = $1', [
        documentId,
      ]);
    });
  }

  async getUpcoming(
    houseId: string,
    daysAhead: number,
  ): Promise<RepositoryResponse<Bill[]>> {
    return repoQuery(async () => {
      const result = await this.pool.query<Bill>(
        `SELECT b.*,
          json_build_object(
            'id', u.id,
            'email', u.email,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'avatar_url', u.avatar_url
          ) as creator
         FROM bills b
         LEFT JOIN users u ON b.created_by = u.id
         WHERE b.house_id = $1
           AND b.active = true
           AND b.next_due_date <= CURRENT_DATE + INTERVAL '1 day' * $2
         ORDER BY b.next_due_date ASC`,
        [houseId, daysAhead],
      );

      const bills = result.rows;

      if (bills.length > 0) {
        const billIds = bills.map((b) => b.id);
        const docsResult = await this.pool.query<
          BillDocument & { bill_id: string }
        >(
          `SELECT * FROM bill_documents
           WHERE bill_id = ANY($1)
           ORDER BY uploaded_at DESC`,
          [billIds],
        );

        const docsByBill = new Map<string, BillDocument[]>();
        docsResult.rows.forEach((doc) => {
          const billDocs = docsByBill.get(doc.bill_id) || [];
          billDocs.push(doc);
          docsByBill.set(doc.bill_id, billDocs);
        });

        bills.forEach((bill) => {
          bill.documents = docsByBill.get(bill.id) || [];
        });
      }

      return bills;
    });
  }

  async isCreator(billId: string, userId: string): Promise<boolean> {
    const result = await repoQuery(async () => {
      const r = await this.pool.query<{ exists: boolean }>(
        `SELECT EXISTS(
          SELECT 1 FROM bills b
          JOIN house_members hm
            ON hm.house_id = b.house_id AND hm.user_id = b.created_by AND hm.left_at IS NULL
          WHERE b.id = $1 AND b.created_by = $2
        )`,
        [billId, userId],
      );
      return r.rows[0]?.exists ?? false;
    });
    return result.data ?? false;
  }

  async advanceDueDate(billId: string): Promise<RepositoryResponse<Bill>> {
    return repoQuery(async () => {
      const result = await this.pool.query<Bill>(
        `UPDATE bills
         SET next_due_date = (next_due_date + (payment_period || ' months')::INTERVAL)::DATE,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [billId],
      );
      if (!result.rows[0]) throw new Error('Bill not found');
      return normalizeBill(result.rows[0]);
    });
  }

  async getActiveBills(): Promise<RepositoryResponse<Bill[]>> {
    return repoQuery(async () => {
      const result = await this.pool.query<Bill>(
        'SELECT b.* FROM bills b WHERE b.active = true',
      );
      return result.rows.map(normalizeBill);
    });
  }

  async checkReminderSent(
    billId: string,
    duePeriod: string,
    daysBefore: number,
  ): Promise<boolean> {
    const result = await repoQuery(async () => {
      const r = await this.pool.query(
        'SELECT 1 FROM bill_reminders WHERE bill_id = $1 AND due_period = $2 AND days_before = $3',
        [billId, duePeriod, daysBefore],
      );
      return (r.rowCount ?? 0) > 0;
    });
    return result.data ?? false;
  }

  async markReminderSent(
    billId: string,
    duePeriod: string,
    daysBefore: number,
  ): Promise<void> {
    await this.pool.query(
      'INSERT INTO bill_reminders (bill_id, due_period, days_before) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [billId, duePeriod, daysBefore],
    );
  }
}
