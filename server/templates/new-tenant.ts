import { wrapEmailTemplate, replaceTemplateVars } from './base';

/**
 * New Tenant Notification Email Template
 * Sent to existing tenants when someone new joins the house
 */
export const getNewTenantNotificationTemplate = (data: {
  tenantName: string;
  newTenantName: string;
  houseName: string;
  baseUrl: string;
}): string => {
  const content = `
    <div class="email-body">
      <h2 class="email-title">New Roommate Alert! 👋</h2>
      <p class="email-text">
        Hi <strong>{{tenantName}}</strong>,
      </p>
      <p class="email-text">
        Great news! <strong>{{newTenantName}}</strong> has just joined your house 
        <strong>{{houseName}}</strong>.
      </p>
      <div class="info-box">
        <p class="info-box-title">🏠 {{houseName}}</p>
        <p class="info-box-text">
          Your house now has a new member. You can view all members and start 
          splitting expenses together.
        </p>
      </div>
      <p class="email-text" style="margin-top: 20px;">
        Welcome them to the house and start collaborating on managing your shared expenses!
      </p>
      <div style="text-align: center;">
        <a href="{{baseUrl}}/house" class="email-button">
          View House Members
        </a>
      </div>
    </div>
  `;

  const template = wrapEmailTemplate(content, 'New Roommate - House M8');
  return replaceTemplateVars(template, data);
};
