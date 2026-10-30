import { wrapEmailTemplate, replaceTemplateVars } from './base';

/**
 * Registration Confirmation Email Template
 * Sent when a new user registers
 */
export const getRegistrationEmailTemplate = (data: {
  userName: string;
  confirmationLink: string;
  baseUrl: string;
}): string => {
  const content = `
    <div class="email-body">
      <h2 class="email-title">Welcome to House M8! 🎉</h2>
      <p class="email-text">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p class="email-text">
        Thank you for signing up! We're excited to have you join our community of roommates 
        managing their shared living expenses.
      </p>
      <p class="email-text">
        To get started, please confirm your email address by clicking the button below:
      </p>
      <div style="text-align: center;">
        <a href="{{confirmationLink}}" class="email-button">
          Confirm Your Account
        </a>
      </div>
      <p class="email-text" style="margin-top: 30px;">
        If the button doesn't work, you can copy and paste this link into your browser:
      </p>
      <p class="email-text" style="word-break: break-all; color: #667eea;">
        {{confirmationLink}}
      </p>
      <div class="email-divider"></div>
      <div class="info-box">
        <p class="info-box-title">What's next?</p>
        <p class="info-box-text">
          After confirming your email, you can create a house, invite roommates, 
          and start tracking shared expenses effortlessly.
        </p>
      </div>
    </div>
  `;

  const template = wrapEmailTemplate(
    content,
    'Confirm Your Account - House M8',
  );
  return replaceTemplateVars(template, data);
};
