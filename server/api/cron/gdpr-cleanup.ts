/**
 * No `.post` suffix, deliberately: Vercel Cron invokes its target with a **GET**
 * request and cannot be configured otherwise, so a `.post.ts` handler would
 * return 405 on every scheduled run. A method-agnostic handler serves the cron
 * (GET) and the existing POST callers unchanged. Scheduled in vercel.json.
 */
import { getRepositories } from '~~/server/repositories/factory';
import { logger } from '~~/server/utils/logger';
import { isCronRequest } from '~~/server/utils/cron-auth';
import { redactStripeCustomerForErasure } from '~~/server/utils/stripe-erasure';
import { logSecurityEvent } from '~~/server/utils/security-events';

const SECURITY_EVENT_RETENTION_MONTHS = 12;

export default defineEventHandler(async (event) => {
  if (!isCronRequest(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const repos = getRepositories();

  // Redact the Stripe customer BEFORE pseudonymising: a failure keeps the user
  // pending so the next run retries. Invoices stay at Stripe (10-year tax duty).
  const pending = await repos.gdpr.getPendingDeletions();
  const excludeUserIds: string[] = [];
  for (const { userId } of pending) {
    try {
      await redactStripeCustomerForErasure(userId);
    } catch (error) {
      logger.error('Stripe customer redaction failed, will retry', {
        userId,
        error,
      });
      excludeUserIds.push(userId);
    }
  }

  const { pseudonymizedUserIds, ...result } =
    await repos.gdpr.runScheduledCleanup({ excludeUserIds });
  for (const userId of pseudonymizedUserIds) {
    await logSecurityEvent('account_pseudonymized', { userId });
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - SECURITY_EVENT_RETENTION_MONTHS);
  const purged = await repos.securityEvents.purgeOlderThan(cutoff);
  if (purged.error) {
    logger.error('Security event purge failed', purged.error);
  }
  const securityEventsPurged = purged.data ?? 0;

  const summary = { ...result, securityEventsPurged };
  logger.info('GDPR cleanup cron completed', summary);
  return summary;
});
