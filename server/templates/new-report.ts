import { wrapEmailTemplate, replaceTemplateVars } from './base';

/**
 * New Report Notification Email Template
 * Sent to house owner when a tenant submits a new report
 */
export const getNewReportNotificationTemplate = (data: {
  ownerName: string;
  reporterName: string;
  houseName: string;
  reportSummary: string;
  reportLink: string;
  baseUrl: string;
}): string => {
  const content = `
    <div class="email-body">
      <h2 class="email-title">New Issue Report 📋</h2>
      <p class="email-text">
        Hi <strong>{{ownerName}}</strong>,
      </p>
      <p class="email-text">
        A new issue has been reported in your house <strong>{{houseName}}</strong> by 
        <strong>{{reporterName}}</strong>.
      </p>
      <div class="info-box">
        <p class="info-box-title">📝 Report Summary</p>
        <p class="info-box-text">
          {{reportSummary}}
        </p>
      </div>
      <p class="email-text" style="margin-top: 20px;">
        Please review this report and take appropriate action. You can mark the issue as 
        read or solved once you've addressed it.
      </p>
      <div style="text-align: center;">
        <a href="{{reportLink}}" class="email-button">
          View Report Details
        </a>
      </div>
      <p class="email-text" style="margin-top: 20px; font-size: 14px; color: #888;">
        You can manage all reports from your Reports page in House M8.
      </p>
    </div>
  `;

  const template = wrapEmailTemplate(content, 'New Issue Report - House M8');
  return replaceTemplateVars(template, data);
};
