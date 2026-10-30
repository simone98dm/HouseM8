import { wrapEmailTemplate, replaceTemplateVars } from './base';

/**
 * Account Deletion Confirmation Email Template
 * Sent when user deletes their account
 */
export const getAccountDeletionTemplate = (data: {
  userName: string;
  baseUrl: string;
}): string => {
  const content = `
    <div class="email-body">
      <h2 class="email-title">Account Deleted</h2>
      <p class="email-text">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p class="email-text">
        This email confirms that your House M8 account has been successfully deleted.
      </p>
      <div class="info-box">
        <p class="info-box-title">What happens next?</p>
        <p class="info-box-text">
          • Your personal data has been removed from our system<br>
          • You've been removed from all houses you were a member of<br>
          • Your expense history has been anonymized<br>
          • You can no longer log in with your previous credentials
        </p>
      </div>
      <p class="email-text" style="margin-top: 20px;">
        We're sorry to see you go! If you change your mind, you're always welcome to 
        create a new account and rejoin the House M8 community.
      </p>
      <div style="text-align: center; margin-top: 30px;">
        <a href="{{baseUrl}}" class="email-button">
          Visit House M8
        </a>
      </div>
      <div class="email-divider"></div>
      <p class="email-text" style="font-size: 14px; color: #6c757d;">
        If you didn't request this deletion, please contact our support team immediately 
        at support@housem8.app
      </p>
    </div>
  `;

  const template = wrapEmailTemplate(content, 'Account Deleted - House M8');
  return replaceTemplateVars(template, data);
};
