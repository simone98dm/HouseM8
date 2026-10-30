import { escapeHtml } from './base';

interface AccountDeletionRequestedTemplateProps {
  userName: string;
  cancelLink: string;
  scheduledFor: string;
  baseUrl: string;
}

export function getAccountDeletionRequestedTemplate(
  props: AccountDeletionRequestedTemplateProps,
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Account Deletion Scheduled - House M8</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
  <h1 style="color:#dc2626;">Account Deletion Scheduled</h1>
  <p>Hi ${escapeHtml(props.userName)},</p>
  <p>We received a request to delete your House M8 account. Your account and personal data will be anonymised on <strong>${escapeHtml(props.scheduledFor)}</strong>.</p>
  <p>If you did not request this or changed your mind, you can cancel within 30 days:</p>
  <p style="text-align:center;margin:32px 0;">
    <a href="${escapeHtml(props.cancelLink)}"
       style="background:#3b82f6;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;">
      Cancel Account Deletion
    </a>
  </p>
  <p style="color:#6b7280;font-size:14px;">This link expires on ${escapeHtml(props.scheduledFor)}. After that date your data will be anonymised and cannot be recovered.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="color:#9ca3af;font-size:12px;">House M8 · <a href="${escapeHtml(props.baseUrl)}/privacy" style="color:#9ca3af;">Privacy Policy</a></p>
</body>
</html>`;
}
