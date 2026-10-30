import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { getRegistrationEmailTemplate } from '../server/templates/registration';
import { getNewTenantNotificationTemplate } from '../server/templates/new-tenant';
import { getHomeAcceptanceTemplate } from '../server/templates/home-acceptance';
import { getPasswordResetTemplate } from '../server/templates/password-reset';
import { getAccountDeletionTemplate } from '../server/templates/account-deletion';
import { getLeavingHomeTemplate } from '../server/templates/leaving-home';
import { getTenantDepartureTemplate } from '../server/templates/tenant-departure';
import { getNewReportNotificationTemplate } from '../server/templates/new-report';
import { getAccountDeletionRequestedTemplate } from '../server/templates/account-deletion-requested';
import { getMemberInviteTemplate } from '../server/templates/member-invite';

const baseUrl = '';

const previews: Record<string, string> = {
  registration: getRegistrationEmailTemplate({
    userName: 'Mario Rossi',
    confirmationLink: `${baseUrl}/confirm?token=demo`,
    baseUrl,
  }),
  'new-tenant': getNewTenantNotificationTemplate({
    tenantName: 'Mario Rossi',
    newTenantName: 'Giulia Bianchi',
    houseName: 'Via Roma 12',
    baseUrl,
  }),
  'home-acceptance': getHomeAcceptanceTemplate({
    userName: 'Mario Rossi',
    houseName: 'Via Roma 12',
    houseAddress: 'Via Roma 12, Milano',
    baseUrl,
  }),
  'password-reset': getPasswordResetTemplate({
    userName: 'Mario Rossi',
    resetLink: `${baseUrl}/reset?token=demo`,
    baseUrl,
  }),
  'account-deletion': getAccountDeletionTemplate({
    userName: 'Mario Rossi',
    baseUrl,
  }),
  'leaving-home': getLeavingHomeTemplate({
    userName: 'Mario Rossi',
    houseName: 'Via Roma 12',
    ratingLink: `${baseUrl}/rate?token=demo`,
    baseUrl,
  }),
  'tenant-departure': getTenantDepartureTemplate({
    tenantName: 'Mario Rossi',
    departingTenantName: 'Giulia Bianchi',
    houseName: 'Via Roma 12',
    ratingLink: `${baseUrl}/rate?token=demo`,
    baseUrl,
  }),
  'new-report': getNewReportNotificationTemplate({
    ownerName: 'Mario Rossi',
    reporterName: 'Giulia Bianchi',
    houseName: 'Via Roma 12',
    reportSummary: 'La lavatrice perde acqua',
    reportLink: `${baseUrl}/reports?id=demo`,
    baseUrl,
  }),
  'account-deletion-requested': getAccountDeletionRequestedTemplate({
    userName: 'Mario Rossi',
    cancelLink: `${baseUrl}/account/cancel-deletion?token=demo`,
    scheduledFor: '2026-08-01',
    baseUrl,
  }),
  'member-invite': getMemberInviteTemplate({
    inviterName: 'Mario Rossi',
    houseName: 'Via Roma 12',
    inviteLink: `${baseUrl}/invite?code=demo`,
    code: 'ABC123',
    codeExpiresAt: '2026-07-08',
    baseUrl,
  }),
};

const outDir = join(process.cwd(), 'public', 'email-previews');
mkdirSync(outDir, { recursive: true });

for (const [name, html] of Object.entries(previews)) {
  writeFileSync(join(outDir, `${name}.html`), html, 'utf-8');
}

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email Templates Preview - House M8</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        padding: 40px 20px;
      }
      .container { max-width: 1200px; margin: 0 auto; }
      .header { text-align: center; color: white; margin-bottom: 50px; }
      .header h1 { font-size: 42px; margin-bottom: 10px; font-weight: 700; }
      .header p { font-size: 18px; opacity: 0.9; }
      .email-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
      .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); }
      .card h2 { font-size: 18px; margin-bottom: 12px; }
      .card a { color: #667eea; font-weight: 600; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Email Templates Preview</h1>
        <p>House M8</p>
      </div>
      <div class="email-grid">
        ${Object.keys(previews)
          .map(
            (name) => `<div class="card">
          <h2>${name}</h2>
          <a href="./${name}.html" target="_blank">Open preview →</a>
        </div>`,
          )
          .join('\n        ')}
      </div>
    </div>
  </body>
</html>
`;

writeFileSync(join(outDir, 'index.html'), indexHtml, 'utf-8');

console.log(
  `Generated ${Object.keys(previews).length} email previews in ${outDir}`,
);
