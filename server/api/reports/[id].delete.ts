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

  // Only creator can delete their report
  const isCreator = await repos.reports.isCreator(reportId, user.id);

  if (!isCreator) {
    throw createError({
      statusCode: 403,
      message: 'Only report creator can delete the report',
    });
  }

  const { data: success, error } = await repos.reports.delete(reportId);

  if (error) {
    throw createError({
      statusCode: 500,
      message: error,
    });
  }

  if (!success) {
    throw createError({
      statusCode: 404,
      message: 'Report not found',
    });
  }

  return { message: 'Report deleted successfully' };
});
