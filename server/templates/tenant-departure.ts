import { wrapEmailTemplate, replaceTemplateVars } from './base';

/**
 * Tenant Departure Notification Email Template
 * Sent to remaining tenants when someone leaves the house
 */
export const getTenantDepartureTemplate = (data: {
  tenantName: string;
  departingTenantName: string;
  houseName: string;
  ratingLink: string;
  baseUrl: string;
}): string => {
  const content = `
    <div class="email-body">
      <h2 class="email-title">Roommate Update 👋</h2>
      <p class="email-text">
        Hi <strong>{{tenantName}}</strong>,
      </p>
      <p class="email-text">
        We wanted to let you know that <strong>{{departingTenantName}}</strong> has left 
        <strong>{{houseName}}</strong>.
      </p>
      <div class="info-box">
        <p class="info-box-title">🏠 {{houseName}}</p>
        <p class="info-box-text">
          Your house member list has been updated. Make sure all shared expenses 
          with {{departingTenantName}} have been settled.
        </p>
      </div>
      <p class="email-text" style="margin-top: 25px;">
        How was your experience living with {{departingTenantName}}? 
        Your feedback helps build a better community:
      </p>
      <div style="text-align: center;">
        <a href="{{ratingLink}}" class="email-button">
          Rate {{departingTenantName}}
        </a>
      </div>
      <div class="email-divider"></div>
      <div style="text-align: center;">
        <a href="{{baseUrl}}/house" class="email-link" style="font-size: 16px;">
          View Updated House Members →
        </a>
      </div>
    </div>
  `;

  const template = wrapEmailTemplate(content, 'Roommate Left - House M8');
  return replaceTemplateVars(template, data);
};
