import { wrapEmailTemplate, replaceTemplateVars } from './base';

/**
 * Password Reset Email Template
 * Sent when user requests password reset
 */
export const getPasswordResetTemplate = (data: {
  userName: string;
  resetLink: string;
  baseUrl: string;
}): string => {
  const content = `
    <div class="email-body">
      <h2 class="email-title">Reset Your Password 🔐</h2>
      <p class="email-text">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p class="email-text">
        We received a request to reset your password for your House M8 account.
      </p>
      <p class="email-text">
        Click the button below to create a new password:
      </p>
      <div style="text-align: center;">
        <a href="{{resetLink}}" class="email-button">
          Reset Password
        </a>
      </div>
      <p class="email-text" style="margin-top: 30px;">
        If the button doesn't work, you can copy and paste this link into your browser:
      </p>
      <p class="email-text" style="word-break: break-all; color: #667eea;">
        {{resetLink}}
      </p>
      <div class="email-divider"></div>
      <div class="info-box" style="border-left-color: #ffc107; background-color: #fff8e1;">
        <p class="info-box-title">⚠️ Security Notice</p>
        <p class="info-box-text">
          This password reset link will expire in 1 hour. If you didn't request this 
          reset, please ignore this email and your password will remain unchanged.
        </p>
      </div>
      <p class="email-text" style="margin-top: 20px; font-size: 14px; color: #6c757d;">
        If you're having trouble accessing your account, please contact our support team.
      </p>
    </div>
  `;

  const template = wrapEmailTemplate(content, 'Reset Your Password - House M8');
  return replaceTemplateVars(template, data);
};
