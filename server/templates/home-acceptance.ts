import { wrapEmailTemplate, replaceTemplateVars } from './base';

/**
 * Home Acceptance Confirmation Email Template
 * Sent to user who accepted a house invitation
 */
export const getHomeAcceptanceTemplate = (data: {
  userName: string;
  houseName: string;
  houseAddress?: string;
  baseUrl: string;
}): string => {
  const addressSection = data.houseAddress
    ? `
      <div class="info-box">
        <p class="info-box-title">📍 House Address</p>
        <p class="info-box-text">{{houseAddress}}</p>
      </div>
    `
    : '';

  const content = `
    <div class="email-body">
      <h2 class="email-title">Welcome to {{houseName}}! 🎊</h2>
      <p class="email-text">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p class="email-text">
        Congratulations! You've successfully joined <strong>{{houseName}}</strong>.
      </p>
      ${addressSection}
      <p class="email-text">
        You can now:
      </p>
      <ul style="color: #555555; margin: 15px 0; padding-left: 20px;">
        <li style="margin: 8px 0;">Track and split expenses with your roommates</li>
        <li style="margin: 8px 0;">Manage bills and due dates</li>
        <li style="margin: 8px 0;">View your balance and payment history</li>
        <li style="margin: 8px 0;">Post notes on the house bulletin board</li>
      </ul>
      <div style="text-align: center;">
        <a href="{{baseUrl}}/house" class="email-button">
          Go to Your House
        </a>
      </div>
      <div class="email-divider"></div>
      <p class="email-text" style="text-align: center; color: #6c757d; font-size: 14px;">
        Start managing your shared living experience today!
      </p>
    </div>
  `;

  const template = wrapEmailTemplate(content, 'You Joined a House - House M8');
  return replaceTemplateVars(template, {
    ...data,
    houseAddress: data.houseAddress || '',
  });
};
