import consola from 'consola';
import { getRepositories } from '~~/server/repositories/factory';
import { sendMemberInviteEmail } from '~~/server/emails';
import { hitRateLimit } from '~~/server/utils/rate-limit-store';
import { hashToken } from '~~/server/utils/tokens';

const INVITE_MAIL_WINDOW_SECONDS = 60 * 60;
const MAX_INVITE_MAILS_PER_RECIPIENT = 3;

/** False once an address has received its hourly share of invite emails. */
async function canMailInvitee(email: string): Promise<boolean> {
  try {
    const count = await hitRateLimit(
      `invite-mail:${hashToken(email.toLowerCase())}`,
      INVITE_MAIL_WINDOW_SECONDS,
    );
    return count <= MAX_INVITE_MAILS_PER_RECIPIENT;
  } catch (error) {
    consola.error('[house-invite] rate limit store unavailable', error);
    return true;
  }
}

export interface CreatedHouseInvite {
  token: string;
  expires_at: string;
  code: string | null;
  code_expires_at: string | null;
}

/**
 * Create an invitation (token + 6-digit code) for a house and, when an invitee
 * email is supplied, email the link and code to it. Shared by the admin
 * "generate invitation" and "invite by email" endpoints so both behave the same.
 * The email is only sent to the supplied address; whether it belongs to a
 * registered user is never looked up.
 */
export async function createHouseInvite(params: {
  houseId: string;
  inviter: { id: string; email: string };
  inviteeEmail: string | null;
}): Promise<CreatedHouseInvite> {
  const { houseId, inviter, inviteeEmail } = params;
  const repos = getRepositories();

  const result = await repos.houses.createInvitation(
    houseId,
    inviteeEmail ?? '',
    inviter.id,
  );

  if (result.error || !result.data) {
    throw createError({
      statusCode: 500,
      message: result.error || 'Failed to generate invitation',
    });
  }

  const invitation = result.data;
  const codeResult = await repos.houses.attachInviteCode(invitation.id);
  const code = codeResult.data?.code ?? null;
  const codeExpiresAt = codeResult.data?.code_expires_at ?? null;

  if (codeResult.error) {
    consola.warn('[house-invite] attachInviteCode failed:', codeResult.error);
  }

  // The invitation exists either way; only the email is withheld, so the app
  // cannot be used to flood a stranger's inbox.
  if (
    inviteeEmail &&
    code &&
    codeExpiresAt &&
    (await canMailInvitee(inviteeEmail))
  ) {
    const config = useRuntimeConfig();
    const baseUrl = config.public.baseUrl || 'http://localhost:3000';

    const { data: inviterUser } = await repos.users.getById(inviter.id);
    const inviterName = inviterUser?.first_name
      ? `${inviterUser.first_name} ${inviterUser.last_name || ''}`.trim()
      : inviter.email;

    const { data: house } = await repos.houses.getById(houseId);

    sendMemberInviteEmail({
      email: inviteeEmail,
      inviterName,
      houseName: house?.name ?? 'the house',
      inviteLink: `${baseUrl}/house/join/${invitation.token}`,
      code,
      codeExpiresAt: new Date(codeExpiresAt).toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    }).catch((err) => {
      consola.warn('[house-invite] sendMemberInviteEmail failed:', err);
    });
  }

  return {
    token: invitation.token,
    expires_at: invitation.expires_at,
    code,
    code_expires_at: codeExpiresAt,
  };
}
