import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { z } from 'zod';

const REPORT_STATUSES = ['not_read', 'read', 'solved'] as const;

const querySchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const { status, page, limit } = await getValidatedQuery(
    event,
    querySchema.parse,
  );

  const repos = getRepositories();

  // Get reports created by the current user
  const { data, error, total } = await repos.reports.getByUser(user.id, {
    status,
    limit,
    offset: (page - 1) * limit,
  });

  if (error) {
    throw createError({
      statusCode: 500,
      message: error,
    });
  }

  const totalPages = Math.ceil(total / limit);

  return {
    data: data || [],
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
    },
  };
});
