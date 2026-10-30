import { z } from 'zod';
import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

const redeemSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only digits'),
});

/**
 * POST /api/invitation/redeem
 * Redeem a 6-digit single-use invite code to join a house.
 *
 * Security controls:
 * - Requires authenticated session (magic-link confirmed)
 * - Rate-limited at the middleware layer (/api/invitation/redeem)
 * - Per-user limit: 5 failed redemptions per hour → 429 (persisted in rate_limits)
 * - Per-code lockout: 5 failed attempts → 15-min lock
 * - Code is single-use and expires after 24h
 * - house_id is resolved from the code row; never trusted from the client
 */
export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);

  const { code } = await readValidatedBody(event, redeemSchema.parse);

  const repos = getRepositories();

  if (await repos.houses.isRedeemBlocked(user.id)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many failed attempts. Try again later.',
    });
  }

  // Look up code — 404 if unknown. There is no code row to track, so the
  // failure is counted against the user instead.
  const invitationResult = await repos.houses.getInvitationByCode(code);
  if (invitationResult.error || !invitationResult.data) {
    await repos.houses.registerFailedRedeemAttempt(user.id);
    throw createError({
      statusCode: 404,
      statusMessage: 'Invalid invite code',
    });
  }

  const invitation = invitationResult.data;

  // Locked? (already hit attempt limit)
  if (
    invitation.code_locked_until &&
    new Date(invitation.code_locked_until) > new Date()
  ) {
    await repos.houses.registerFailedRedeemAttempt(user.id);
    throw createError({
      statusCode: 423,
      statusMessage: 'This code is temporarily locked. Try again later.',
    });
  }

  // Already used?
  if (invitation.code_used_at) {
    await repos.houses.registerFailedCodeAttempt(code);
    await repos.houses.registerFailedRedeemAttempt(user.id);
    throw createError({
      statusCode: 410,
      statusMessage: 'This invite code has already been used.',
    });
  }

  // Expired?
  if (
    !invitation.code_expires_at ||
    new Date(invitation.code_expires_at) < new Date()
  ) {
    await repos.houses.registerFailedCodeAttempt(code);
    await repos.houses.registerFailedRedeemAttempt(user.id);
    throw createError({
      statusCode: 410,
      statusMessage: 'This invite code has expired.',
    });
  }

  // User already a member of this house?
  const isMember = await repos.houses.isMember(invitation.house_id, user.id);
  if (isMember) {
    throw createError({
      statusCode: 409,
      statusMessage: 'You are already a member of this house.',
    });
  }

  // User already belongs to another house?
  const currentHouseResult = await repos.houses.getCurrentForUser(user.id);
  if (currentHouseResult.data) {
    throw createError({
      statusCode: 409,
      statusMessage:
        'You must leave your current house before joining another.',
    });
  }

  // Redeem (atomic transaction — row-locked inside)
  const redeemResult = await repos.houses.redeemInviteCode(code, user.id);
  if (redeemResult.error) {
    const msg = redeemResult.error;
    if (msg === 'HOUSE_FULL') {
      throw createError({
        statusCode: 409,
        statusMessage: 'This house is full.',
      });
    }
    if (msg === 'duplicate key') {
      throw createError({
        statusCode: 409,
        statusMessage: 'You are already a member of a house.',
      });
    }
    if (
      msg === 'CODE_NOT_FOUND' ||
      msg === 'CODE_LOCKED' ||
      msg === 'CODE_USED' ||
      msg === 'CODE_EXPIRED'
    ) {
      await repos.houses.registerFailedRedeemAttempt(user.id);
    }
    if (msg === 'CODE_LOCKED') {
      throw createError({
        statusCode: 423,
        statusMessage: 'This code is temporarily locked. Try again later.',
      });
    }
    if (msg === 'CODE_USED') {
      throw createError({
        statusCode: 410,
        statusMessage: 'This invite code has already been used.',
      });
    }
    if (msg === 'CODE_EXPIRED') {
      throw createError({
        statusCode: 410,
        statusMessage: 'This invite code has expired.',
      });
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to redeem invite code',
    });
  }

  return {
    data: {
      house_id: invitation.house_id,
    },
  };
});
