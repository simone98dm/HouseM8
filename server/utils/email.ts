import consola from 'consola';
import { Resend } from 'resend';

/**
 * Email Utility - Centralized email client and types
 * Uses Resend for email delivery
 */

// ===========================
// Types & Interfaces
// ===========================

/**
 * Base email payload structure
 */
export interface BaseEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * User registration confirmation email payload
 */
export interface RegistrationEmailPayload {
  email: string;
  userName: string;
  confirmationLink: string;
}

/**
 * New tenant notification email payload (sent to existing tenants)
 */
export interface NewTenantNotificationPayload {
  email: string;
  tenantName: string; // Existing tenant receiving the email
  newTenantName: string; // Name of the new tenant
  houseName: string;
}

/**
 * Home acceptance confirmation email payload (sent to user who accepted)
 */
export interface HomeAcceptanceConfirmationPayload {
  email: string;
  userName: string;
  houseName: string;
  houseAddress?: string;
}

/**
 * Password reset email payload
 */
export interface PasswordResetEmailPayload {
  email: string;
  userName: string;
  resetLink: string;
}

/**
 * Account deletion confirmation email payload
 */
export interface AccountDeletionEmailPayload {
  email: string;
  userName: string;
}

export interface AccountDeletionRequestedEmailPayload {
  email: string;
  userName: string;
  cancelLink: string;
  scheduledFor: string;
}

/**
 * Leaving home confirmation email payload (sent to departing member)
 */
export interface LeavingHomeConfirmationPayload {
  email: string;
  userName: string;
  houseName: string;
  ratingLink: string;
}

/**
 * Tenant departure notification email payload (sent to remaining tenants)
 */
export interface TenantDepartureNotificationPayload {
  email: string;
  tenantName: string; // Remaining tenant receiving the email
  departingTenantName: string; // Name of the departing tenant
  houseName: string;
  ratingLink: string;
}

/**
 * New report notification email payload (sent to house owner)
 */
export interface NewReportNotificationPayload {
  email: string;
  ownerName: string;
  reporterName: string;
  houseName: string;
  reportSummary: string;
  reportId: string;
}

/**
 * Member invite email payload (sent to invited user; contains both link and 6-digit code)
 */
export interface MemberInviteEmailPayload {
  email: string;
  inviterName: string;
  houseName: string;
  inviteLink: string;
  code: string;
  codeExpiresAt: string;
}

// ===========================
// Resend Client
// ===========================

let resendClient: Resend | null = null;

/**
 * Get or create Resend client instance
 * Uses singleton pattern to reuse the same client
 */
export const getResendClient = (): Resend => {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'RESEND_API_KEY is not configured',
      });
    }

    resendClient = new Resend(apiKey);
  }

  return resendClient;
};

const ANON_EMAIL_SUFFIX = '@anon.local';

/**
 * Send email using Resend
 * @param payload Email payload with to, subject, html, and optional from
 * @returns Promise with email ID or error
 */
export const sendEmail = async (
  payload: BaseEmailPayload,
): Promise<{ success: boolean; id?: string; error?: string }> => {
  // Pseudonymised accounts (erasure) have no real mailbox: never send to them.
  const recipients = (
    Array.isArray(payload.to) ? payload.to : [payload.to]
  ).filter((address) => !address.toLowerCase().endsWith(ANON_EMAIL_SUFFIX));
  if (recipients.length === 0) {
    consola.debug('sendEmail skipped: only anonymised recipients');
    return { success: true };
  }

  try {
    const resend = getResendClient();

    const defaultFrom = 'House M8 <noreply@housem8.app>';
    const fromEmail = payload.from || process.env.EMAIL_FROM || defaultFrom;

    const result = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(payload.to) ? recipients : recipients[0]!,
      subject: payload.subject,
      html: payload.html,
    });

    if (result.error) {
      consola.error('Resend API error:', result.error);
      return {
        success: false,
        error: result.error.message || 'Failed to send email',
      };
    }

    return {
      success: true,
      id: result.data?.id,
    };
  } catch (error: unknown) {
    consola.error('Email sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get base URL for links in emails
 */
export const getBaseUrl = (): string => {
  return process.env.BASE_URL || 'http://localhost:3000';
};
