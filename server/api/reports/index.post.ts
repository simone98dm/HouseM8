import { z } from 'zod';
import consola from 'consola';
import {
  verifyAuthCompat,
  ensureHouseMember,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { sendNewReportNotification } from '~~/server/emails';

const createReportSchema = z.object({
  house_id: z.string().uuid('Invalid house ID'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000),
});

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const { house_id, description } = await readValidatedBody(
    event,
    createReportSchema.parse,
  );

  // Verify user has access to this house
  await ensureHouseMember(house_id, user.id);

  // Check if user is the owner (owners cannot create reports)
  const repos = getRepositories();
  const { data: house } = await repos.houses.getById(house_id);

  if (!house) {
    throw createError({
      statusCode: 404,
      message: 'House not found',
    });
  }

  if (house.owner_id === user.id) {
    throw createError({
      statusCode: 403,
      message: 'House owners cannot create reports for their own house',
    });
  }

  // Create the report
  const { data: report, error } = await repos.reports.create({
    house_id,
    created_by: user.id,
    description: description.trim(),
  });

  if (error) {
    throw createError({
      statusCode: 500,
      message: error,
    });
  }

  if (!report) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create report',
    });
  }

  // Get owner info for email notification
  const { data: owner } = await repos.users.getById(house.owner_id);
  const { data: reporter } = await repos.users.getById(user.id);

  if (owner && reporter) {
    // Send email notification to owner (fire and forget)
    sendNewReportNotification({
      email: owner.email,
      ownerName: owner.first_name,
      reporterName: `${reporter.first_name} ${reporter.last_name}`,
      houseName: house.name,
      reportSummary:
        description.length > 150
          ? description.substring(0, 150) + '...'
          : description,
      reportId: report.id,
    }).catch((error) => {
      // Log email sending failure for monitoring/diagnostics
      consola.error(
        'Failed to send new report notification email',
        {
          houseId: house.id,
          reportId: report.id,
          ownerId: owner.id,
          reporterId: reporter.id,
        },
        error,
      );
    });
  }

  return { data: report };
});
