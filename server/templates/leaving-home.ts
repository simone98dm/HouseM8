import { wrapEmailTemplate, replaceTemplateVars } from './base';

/**
 * Leaving Home Confirmation Email Template
 * Sent to member who is leaving the house
 */
export const getLeavingHomeTemplate = (data: {
  userName: string;
  houseName: string;
  ratingLink: string;
  baseUrl: string;
}): string => {
  const content = `
    <div class="email-body">
      <h2 class="email-title">You've Left {{houseName}}</h2>
      <p class="email-text">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p class="email-text">
        This email confirms that you have left <strong>{{houseName}}</strong>.
      </p>
      <div class="info-box">
        <p class="info-box-title">📋 Important Information</p>
        <p class="info-box-text">
          • You no longer have access to this house's data<br>
          • Any pending expenses should be settled<br>
          • Your expense history has been preserved for records
        </p>
      </div>
      <p class="email-text" style="margin-top: 25px;">
        We'd love to hear about your experience living with your roommates. 
        Please take a moment to rate them:
      </p>
      <div style="text-align: center;">
        <a href="{{ratingLink}}" class="email-button">
          Rate Your Roommates
        </a>
      </div>
      <div class="email-divider"></div>
      <p class="email-text" style="text-align: center;">
        Thank you for using House M8! We hope it made managing your shared expenses easier.
      </p>
      <p class="email-text" style="text-align: center; margin-top: 15px;">
        You can always join another house or create a new one anytime.
      </p>
    </div>
  `;

  const template = wrapEmailTemplate(content, 'You Left a House - House M8');
  return replaceTemplateVars(template, data);
};
