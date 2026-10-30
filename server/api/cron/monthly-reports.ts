/** Method-agnostic on purpose: Vercel Cron calls GET. Scheduled in vercel.json. */
import { getRepositories } from '~~/server/repositories/factory';
import { generateMonthlyReportPdf } from '~~/server/utils/pdf-report';
import { logger } from '~~/server/utils/logger';
import { isCronRequest } from '~~/server/utils/cron-auth';

export default defineEventHandler(async (event) => {
  if (!isCronRequest(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const now = new Date();
  const reportDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = reportDate.getFullYear();
  const month = reportDate.getMonth() + 1;

  const from = new Date(year, month - 1, 1).toISOString();
  const to = new Date(year, month, 0, 23, 59, 59).toISOString();

  const repos = getRepositories();

  const houseIdsResult = await repos.expenses.getHouseIdsWithExpensesBetween(
    from,
    to,
  );
  const houseIds = houseIdsResult.data ?? [];

  let generated = 0;
  let failed = 0;

  for (const houseId of houseIds) {
    try {
      const houseResult = await repos.houses.getById(houseId, false);
      if (!houseResult.data) continue;

      const expensesResult = await repos.expenses.getByHouse(
        houseId,
        { page: 1, limit: 500 },
        { from, to },
      );

      const expenses = expensesResult.data ?? [];
      const totalAmount = expenses.reduce((sum, e) => sum + e.total_amount, 0);

      await generateMonthlyReportPdf({
        houseName: houseResult.data.name,
        year,
        month,
        expenses,
        totalAmount,
        currency: expenses[0]?.currency ?? 'EUR',
      });

      await repos.monthlyReports.upsert({
        house_id: houseId,
        year,
        month,
        total_amount: totalAmount,
        expense_count: expenses.length,
      });

      generated++;
    } catch (err) {
      logger.error(`[cron/monthly-reports] Failed for house ${houseId}:`, err);
      failed++;
    }
  }

  logger.info(
    `[cron/monthly-reports] Period ${year}-${month}: ${generated} generated, ${failed} failed`,
  );

  return { ok: true, period: `${year}-${month}`, generated, failed };
});
