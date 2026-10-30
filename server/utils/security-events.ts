import type { H3Event } from 'h3';
import consola from 'consola';
import { getRepositories } from '../repositories/factory';
import type { SecurityEventType } from '../repositories/interfaces/ISecurityEventRepository';
import { getClientIp, hashIp } from './tokens';

export type { SecurityEventType };

interface LogOptions {
  userId?: string | null;
  event?: H3Event;
  /** Explicit IP; wins over the one derived from `event`. */
  ip?: string;
  /** Small context blob (e.g. the target of an admin action). Never exported. */
  metadata?: Record<string, unknown>;
}

/**
 * Append a row to the security audit trail. Stores an HMAC of the client IP,
 * never the address. Never throws: auditing must not break the request.
 */
export async function logSecurityEvent(
  type: SecurityEventType,
  { userId = null, event, ip, metadata }: LogOptions = {},
): Promise<void> {
  try {
    const clientIp = ip ?? (event ? getClientIp(event) : undefined);
    const ipHash = clientIp ? hashIp(clientIp) : null;
    const { error } = await getRepositories().securityEvents.record(
      type,
      userId,
      ipHash,
      metadata ?? null,
    );
    if (error) consola.error('Security event not recorded', { type, error });
  } catch (error) {
    consola.error('Security event not recorded', { type, error });
  }
}
