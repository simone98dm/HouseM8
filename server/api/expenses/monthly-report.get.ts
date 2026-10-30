import { z } from 'zod';
import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { requirePlan } from '~~/server/utils/plan-enforcement';
import { generateMonthlyReportPdf } from '~~/server/utils/pdf-report';

const querySchema = z.object({
  house_id: z.string().uuid(),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  await requirePlan(user.id, 'pro');

  const query = querySchema.safeParse(getQuery(event));
  if (!query.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid query parameters',
    });
  }

  const { house_id, year, month } = query.data;
  const repos = getRepositories();

  // Verify user is member of the house
  const isMember = await repos.houses.isMember(house_id, user.id);
  if (!isMember) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Not a member of this house',
    });
  }

  // Get house details for PDF
  const houseResult = await repos.houses.getById(house_id, false);
  if (!houseResult.data) {
    throw createError({ statusCode: 404, statusMessage: 'House not found' });
  }

  // Fetch expenses for the month
  const from = new Date(year, month - 1, 1).toISOString();
  const to = new Date(year, month, 0, 23, 59, 59).toISOString();

  const expensesResult = await repos.expenses.getByHouse(
    house_id,
    { page: 1, limit: 500 },
    { from, to },
  );

  const expenses = expensesResult.data ?? [];
  const totalAmount = expenses.reduce((sum, e) => sum + e.total_amount, 0);

  // Get or create report record
  await repos.monthlyReports.upsert({
    house_id,
    year,
    month,
    total_amount: totalAmount,
    expense_count: expenses.length,
  });

  // Generate PDF
  const pdfBytes = await generateMonthlyReportPdf({
    houseName: houseResult.data.name,
    year,
    month,
    expenses,
    totalAmount,
    currency: expenses[0]?.currency ?? 'EUR',
  });

  // Return as PDF download
  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="house-m8-report-${year}-${String(month).padStart(2, '0')}.pdf"`,
    'Content-Length': String(pdfBytes.length),
  });

  return pdfBytes;
});
