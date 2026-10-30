/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepositories } from '~~/server/repositories/factory';
import { sendEmail } from '~~/server/utils/email';
import { isCronRequest } from '~~/server/utils/cron-auth';
import { redactStripeCustomerForErasure } from '~~/server/utils/stripe-erasure';
import { logSecurityEvent } from '~~/server/utils/security-events';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
vi.stubGlobal('createError', (o: object) => Object.assign(new Error(), o));

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/email', () => ({ sendEmail: vi.fn() }));
vi.mock('~~/server/utils/cron-auth', () => ({ isCronRequest: vi.fn() }));
vi.mock('~~/server/utils/stripe-erasure', () => ({
  redactStripeCustomerForErasure: vi.fn(),
}));
vi.mock('~~/server/utils/security-events', () => ({
  logSecurityEvent: vi.fn(),
}));
vi.mock('~~/server/utils/pdf-report', () => ({
  generateMonthlyReportPdf: vi.fn(),
}));
vi.mock('~~/server/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

const ev = {} as never;

describe('cron handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['bills-reminder', 'monthly-reports', 'gdpr-cleanup'])(
    '%s is method-agnostic and rejects unauthenticated callers',
    async (name) => {
      vi.mocked(isCronRequest).mockReturnValue(false);
      const { default: h } = await import(`../../../api/cron/${name}`);
      await expect((h as Function)(ev)).rejects.toMatchObject({
        statusCode: 401,
      });
    },
  );

  it('bills-reminder escapes the description and first name in the HTML body', async () => {
    vi.mocked(isCronRequest).mockReturnValue(true);
    const due = new Date();
    due.setDate(due.getDate() + 3);
    const iso = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
    vi.mocked(getRepositories).mockReturnValue({
      bills: {
        getActiveBills: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'b1',
              house_id: 'h1',
              description: '<img src=x onerror=alert(1)>',
              next_due_date: iso,
            },
          ],
        }),
        checkReminderSent: vi.fn().mockResolvedValue(false),
        markReminderSent: vi.fn(),
      },
      houses: {
        getMembers: vi.fn().mockResolvedValue({
          data: [{ user: { email: 'a@b.c', first_name: '<b>Eve</b>' } }],
        }),
      },
    } as never);

    const { default: h } = await import('../../../api/cron/bills-reminder');
    await (h as Function)(ev);

    const html = vi.mocked(sendEmail).mock.calls[0]![0].html as string;
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>Eve');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&lt;b&gt;Eve');
  });

  it('gdpr-cleanup purges security events older than 12 months', async () => {
    vi.mocked(isCronRequest).mockReturnValue(true);
    const purgeOlderThan = vi.fn().mockResolvedValue({ data: 7, error: null });
    vi.mocked(getRepositories).mockReturnValue({
      gdpr: {
        getPendingDeletions: vi.fn().mockResolvedValue([]),
        runScheduledCleanup: vi
          .fn()
          .mockResolvedValue({ pseudonymized: 1, pseudonymizedUserIds: ['u'] }),
      },
      securityEvents: { purgeOlderThan },
    } as never);

    const { default: h } = await import('../../../api/cron/gdpr-cleanup');
    const out = await (h as Function)(ev);

    const cutoff = purgeOlderThan.mock.calls[0]![0] as Date;
    const expected = new Date();
    expected.setMonth(expected.getMonth() - 12);
    expect(Math.abs(cutoff.getTime() - expected.getTime())).toBeLessThan(5000);
    expect(out).toEqual({ pseudonymized: 1, securityEventsPurged: 7 });
  });

  it('gdpr-cleanup redacts Stripe first, retries failures, and logs account_pseudonymized', async () => {
    vi.mocked(isCronRequest).mockReturnValue(true);
    vi.mocked(redactStripeCustomerForErasure).mockImplementation(
      async (id: string) => {
        if (id === 'bad') throw new Error('stripe down');
      },
    );
    const runScheduledCleanup = vi
      .fn()
      .mockResolvedValue({ pseudonymized: 1, pseudonymizedUserIds: ['good'] });
    vi.mocked(getRepositories).mockReturnValue({
      gdpr: {
        getPendingDeletions: vi.fn().mockResolvedValue([
          { userId: 'good', deletedAt: new Date() },
          { userId: 'bad', deletedAt: new Date() },
        ]),
        runScheduledCleanup,
      },
      securityEvents: {
        purgeOlderThan: vi.fn().mockResolvedValue({ data: 0, error: null }),
      },
    } as never);

    const { default: h } = await import('../../../api/cron/gdpr-cleanup');
    await (h as Function)(ev);

    expect(redactStripeCustomerForErasure).toHaveBeenCalledWith('good');
    expect(runScheduledCleanup).toHaveBeenCalledWith({
      excludeUserIds: ['bad'],
    });
    expect(logSecurityEvent).toHaveBeenCalledWith('account_pseudonymized', {
      userId: 'good',
    });
  });
});
