/** Method-agnostic on purpose: Vercel Cron calls GET. Scheduled in vercel.json. */
import { getRepositories } from '~~/server/repositories/factory';
import { sendEmail } from '~~/server/utils/email';
import { logger } from '~~/server/utils/logger';
import { escapeHtml } from '~~/server/templates/base';
import { isCronRequest } from '~~/server/utils/cron-auth';

export default defineEventHandler(async (event) => {
  if (!isCronRequest(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const repos = getRepositories();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: bills, error } = await repos.bills.getActiveBills();
  if (error || !bills) {
    logger.error('Failed to fetch active bills for reminder cron', error);
    return { processed: 0 };
  }

  let sent = 0;

  for (const bill of bills) {
    const dueDate = new Date(bill.next_due_date);
    dueDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.round(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (![1, 3, 7].includes(daysUntilDue)) continue;

    const duePeriod = bill.next_due_date;
    const alreadySent = await repos.bills.checkReminderSent(
      bill.id,
      duePeriod,
      daysUntilDue,
    );
    if (alreadySent) continue;

    const { data: members } = await repos.houses.getMembers(bill.house_id);
    if (!members) continue;

    for (const member of members) {
      const email = member.user?.email;
      const firstName = member.user?.first_name ?? 'Member';
      if (!email) continue;

      await sendEmail({
        to: email,
        subject: `Reminder: ${bill.description} due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`,
        html: `<p>Hi ${escapeHtml(firstName)},</p><p>Bill <strong>${escapeHtml(bill.description)}</strong> is due <strong>${bill.next_due_date}</strong>.</p>`,
      });
    }

    await repos.bills.markReminderSent(bill.id, duePeriod, daysUntilDue);
    sent++;
  }

  logger.info(`Bills reminder cron: sent ${sent} reminders`);
  return { processed: sent };
});
