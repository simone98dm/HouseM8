import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { logSecurityEvent } from '~~/server/utils/security-events';

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const repos = getRepositories();

  await repos.gdpr.recordExportRequest(user.id);
  const data = await repos.gdpr.exportUserData(user.id);
  const { data: events } = await repos.securityEvents.listByUser(user.id);
  await logSecurityEvent('data_export', { userId: user.id, event });

  const day = new Date().toISOString().slice(0, 10);
  setResponseHeaders(event, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="house-m8-export-${day}.json"`,
  });

  return {
    ...data,
    security_events: (events ?? []).map(({ event: type, created_at }) => ({
      event: type,
      created_at,
    })),
  };
});
