import { sendEmail, getBaseUrl } from '~~/server/utils/email';
import type {
  RegistrationEmailPayload,
  NewTenantNotificationPayload,
  HomeAcceptanceConfirmationPayload,
  PasswordResetEmailPayload,
  AccountDeletionEmailPayload,
  AccountDeletionRequestedEmailPayload,
  LeavingHomeConfirmationPayload,
  TenantDepartureNotificationPayload,
  NewReportNotificationPayload,
  MemberInviteEmailPayload,
} from '~~/server/utils/email';

import { getRegistrationEmailTemplate } from '~~/server/templates/registration';
import { getNewTenantNotificationTemplate } from '~~/server/templates/new-tenant';
import { getHomeAcceptanceTemplate } from '~~/server/templates/home-acceptance';
import { getPasswordResetTemplate } from '~~/server/templates/password-reset';
import { getAccountDeletionTemplate } from '~~/server/templates/account-deletion';
import { getLeavingHomeTemplate } from '~~/server/templates/leaving-home';
import { getTenantDepartureTemplate } from '~~/server/templates/tenant-departure';
import { getNewReportNotificationTemplate } from '~~/server/templates/new-report';
import { getAccountDeletionRequestedTemplate } from '~~/server/templates/account-deletion-requested';
import { getMemberInviteTemplate } from '~~/server/templates/member-invite';
import {
  getSubscriptionConfirmationSubject,
  getSubscriptionConfirmationTemplate,
  getSubscriptionWithdrawalSubject,
  getSubscriptionWithdrawalTemplate,
} from '~~/server/templates/subscription';
import type {
  SubscriptionConfirmationTemplateProps,
  SubscriptionWithdrawalTemplateProps,
} from '~~/server/templates/subscription';

export const sendRegistrationEmail = async (
  payload: RegistrationEmailPayload,
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const baseUrl = getBaseUrl();
    const html = getRegistrationEmailTemplate({
      userName: payload.userName,
      confirmationLink: payload.confirmationLink,
      baseUrl,
    });

    return await sendEmail({
      to: payload.email,
      subject: 'Welcome to House M8 - Confirm Your Account',
      html,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const sendNewTenantNotification = async (
  payload: NewTenantNotificationPayload,
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const baseUrl = getBaseUrl();
    const html = getNewTenantNotificationTemplate({
      tenantName: payload.tenantName,
      newTenantName: payload.newTenantName,
      houseName: payload.houseName,
      baseUrl,
    });

    return await sendEmail({
      to: payload.email,
      subject: `New Roommate in ${payload.houseName}`,
      html,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const sendHomeAcceptanceConfirmation = async (
  payload: HomeAcceptanceConfirmationPayload,
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const baseUrl = getBaseUrl();
    const html = getHomeAcceptanceTemplate({
      userName: payload.userName,
      houseName: payload.houseName,
      houseAddress: payload.houseAddress,
      baseUrl,
    });

    return await sendEmail({
      to: payload.email,
      subject: `Welcome to ${payload.houseName}!`,
      html,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const sendPasswordResetEmail = async (
  payload: PasswordResetEmailPayload,
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const baseUrl = getBaseUrl();
    const html = getPasswordResetTemplate({
      userName: payload.userName,
      resetLink: payload.resetLink,
      baseUrl,
    });

    return await sendEmail({
      to: payload.email,
      subject: 'Reset Your Password - House M8',
      html,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const sendAccountDeletionEmail = async (
  payload: AccountDeletionEmailPayload,
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const baseUrl = getBaseUrl();
    const html = getAccountDeletionTemplate({
      userName: payload.userName,
      baseUrl,
    });

    return await sendEmail({
      to: payload.email,
      subject: 'Your Account Has Been Deleted - House M8',
      html,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const sendLeavingHomeConfirmation = async (
  payload: LeavingHomeConfirmationPayload,
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const baseUrl = getBaseUrl();
    const html = getLeavingHomeTemplate({
      userName: payload.userName,
      houseName: payload.houseName,
      ratingLink: payload.ratingLink,
      baseUrl,
    });

    return await sendEmail({
      to: payload.email,
      subject: `You've Left ${payload.houseName}`,
      html,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const sendTenantDepartureNotification = async (
  payload: TenantDepartureNotificationPayload,
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const baseUrl = getBaseUrl();
    const html = getTenantDepartureTemplate({
      tenantName: payload.tenantName,
      departingTenantName: payload.departingTenantName,
      houseName: payload.houseName,
      ratingLink: payload.ratingLink,
      baseUrl,
    });

    return await sendEmail({
      to: payload.email,
      subject: `${payload.departingTenantName} Left ${payload.houseName}`,
      html,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const sendNewReportNotification = async (
  payload: NewReportNotificationPayload,
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const baseUrl = getBaseUrl();
    const html = getNewReportNotificationTemplate({
      ownerName: payload.ownerName,
      reporterName: payload.reporterName,
      houseName: payload.houseName,
      reportSummary: payload.reportSummary,
      reportLink: `${baseUrl}/reports?id=${payload.reportId}`,
      baseUrl,
    });

    return await sendEmail({
      to: payload.email,
      subject: `New Issue Report in ${payload.houseName} - House M8`,
      html,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const sendAccountDeletionRequestedEmail = async (
  payload: AccountDeletionRequestedEmailPayload,
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const baseUrl = getBaseUrl();
    const html = getAccountDeletionRequestedTemplate({
      userName: payload.userName,
      cancelLink: payload.cancelLink,
      scheduledFor: payload.scheduledFor,
      baseUrl,
    });
    return await sendEmail({
      to: payload.email,
      subject: 'Your House M8 account is scheduled for deletion',
      html,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const sendMemberInviteEmail = async (
  payload: MemberInviteEmailPayload,
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const baseUrl = getBaseUrl();
    const html = getMemberInviteTemplate({
      inviterName: payload.inviterName,
      houseName: payload.houseName,
      inviteLink: payload.inviteLink,
      code: payload.code,
      codeExpiresAt: payload.codeExpiresAt,
      baseUrl,
    });

    return await sendEmail({
      to: payload.email,
      subject: `You've been invited to join ${payload.houseName} - House M8`,
      html,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

type SendResult = { success: boolean; id?: string; error?: string };

export const sendSubscriptionConfirmationEmail = async (
  email: string,
  props: Omit<SubscriptionConfirmationTemplateProps, 'baseUrl'>,
): Promise<SendResult> =>
  sendEmail({
    to: email,
    subject: getSubscriptionConfirmationSubject(props.locale),
    html: getSubscriptionConfirmationTemplate({
      ...props,
      baseUrl: getBaseUrl(),
    }),
  });

export const sendSubscriptionWithdrawalEmail = async (
  email: string,
  props: Omit<SubscriptionWithdrawalTemplateProps, 'baseUrl'>,
): Promise<SendResult> =>
  sendEmail({
    to: email,
    subject: getSubscriptionWithdrawalSubject(props.locale),
    html: getSubscriptionWithdrawalTemplate({
      ...props,
      baseUrl: getBaseUrl(),
    }),
  });

export const sendBulkEmails = async (
  emails: Array<{ to: string; subject: string; html: string }>,
): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}> => {
  const results = await Promise.allSettled(
    emails.map((email) => sendEmail(email)),
  );

  const sent = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success,
  ).length;
  const failed = results.length - sent;
  const errors = results
    .filter((r) => r.status === 'fulfilled' && !r.value.success)
    .map((r) =>
      r.status === 'fulfilled'
        ? r.value.error || 'Unknown error'
        : 'Unknown error',
    );

  return {
    success: failed === 0,
    sent,
    failed,
    errors,
  };
};
