import { wrapEmailTemplate, replaceTemplateVars } from './base';

/**
 * Member Invite Email Template
 * Sent when a house owner generates an invite for a new member.
 * Contains both the URL token link and the 6-digit one-time code.
 */
export const getMemberInviteTemplate = (data: {
  inviterName: string;
  houseName: string;
  inviteLink: string;
  code: string;
  codeExpiresAt: string;
  baseUrl: string;
}): string => {
  const content = `
    <div class="email-body">
      <h2 class="email-title">You've been invited to join {{houseName}}!</h2>
      <p class="email-text">
        Hi there,
      </p>
      <p class="email-text">
        <strong>{{inviterName}}</strong> has invited you to join their house
        <strong>{{houseName}}</strong> on House M8.
      </p>

      <div class="email-divider"></div>

      <div class="info-box">
        <p class="info-box-title">Option 1 — Click the link</p>
        <p class="info-box-text">
          The easiest way to join: just click the button below.
        </p>
        <div style="text-align: center; margin-top: 16px;">
          <a href="{{inviteLink}}" class="email-button">
            Accept Invitation
          </a>
        </div>
        <p class="info-box-text" style="margin-top: 12px; word-break: break-all;">
          Or copy this link: <a href="{{inviteLink}}" class="email-link">{{inviteLink}}</a>
        </p>
      </div>

      <div class="email-divider"></div>

      <div class="info-box" style="border-left-color: #764ba2;">
        <p class="info-box-title">Option 2 — Enter the 6-digit code</p>
        <p class="info-box-text">
          If you already have a House M8 account, sign in and enter this code
          during the setup wizard or from your dashboard:
        </p>
        <div style="text-align: center; margin: 16px 0;">
          <span style="
            display: inline-block;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 8px;
            color: #1a1a1a;
            background: #f8f9fa;
            padding: 12px 24px;
            border-radius: 8px;
            border: 2px dashed #764ba2;
            font-family: monospace;
          ">{{code}}</span>
        </div>
        <p class="info-box-text" style="font-size: 12px; color: #999;">
          This code expires on {{codeExpiresAt}} and can only be used once.
        </p>
      </div>
    </div>
  `;

  const template = wrapEmailTemplate(
    content,
    `Invitation to join ${data.houseName} - House M8`,
  );
  return replaceTemplateVars(template, data);
};
