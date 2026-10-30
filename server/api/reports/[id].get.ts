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
  const { data: report, error } = await repos.reports.getById(reportId);

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

  // Check if user has access (creator or house owner)
  const isCreator = report.created_by === user.id;
  const isOwner = await repos.reports.isHouseOwner(reportId, user.id);

  if (!isCreator && !isOwner) {
    throw createError({
      statusCode: 403,
      message: 'Access denied',
    });
  }

  return { data: report };
});
