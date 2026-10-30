import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const reportId = getRouterParam(event, 'id');

  if (!reportId) {
    throw createError({
      statusCode: 400,
      message: 'Report ID is required',
    });
  }

  const repos = getRepositories();

  // Only house owner can mark as read
  const isOwner = await repos.reports.isHouseOwner(reportId, user.id);

  if (!isOwner) {
    throw createError({
      statusCode: 403,
      message: 'Only house owner can mark reports as read',
    });
  }

  const { data: report, error } = await repos.reports.markAsRead(reportId);

  if (error) {
    throw createError({
      statusCode: 500,
      message: error,
    });
  }

  if (!report) {
    throw createError({
      statusCode: 404,
      message: 'Report not found',
    });
  }

  return { data: report };
});
