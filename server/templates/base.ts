/**
 * Email Template Base
 * Provides consistent styling across all email templates
 */

/**
 * Get base email styles
 */
export const getEmailStyles = () => `
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #f5f5f5;
  }
  .email-container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
  }
  .email-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px 20px;
    text-align: center;
  }
  .email-logo {
    color: #ffffff;
    font-size: 32px;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.5px;
  }
  .email-body {
    padding: 40px 30px;
    color: #333333;
    line-height: 1.6;
  }
  .email-title {
    font-size: 24px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 20px 0;
  }
  .email-text {
    font-size: 16px;
    color: #555555;
    margin: 0 0 15px 0;
  }
  .email-button {
    display: inline-block;
    padding: 14px 32px;
    margin: 20px 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    transition: transform 0.2s;
  }
  .email-button:hover {
    transform: translateY(-2px);
  }
  .email-footer {
    background-color: #f8f9fa;
    padding: 30px;
    text-align: center;
    border-top: 1px solid #e9ecef;
  }
  .email-footer-text {
    font-size: 14px;
    color: #6c757d;
    margin: 5px 0;
  }
  .email-link {
    color: #667eea;
    text-decoration: none;
  }
  .email-divider {
    height: 1px;
    background-color: #e9ecef;
    margin: 30px 0;
  }
  .info-box {
    background-color: #f8f9fa;
    border-left: 4px solid #667eea;
    padding: 15px 20px;
    margin: 20px 0;
    border-radius: 4px;
  }
  .info-box-title {
    font-weight: 600;
    color: #333333;
    margin: 0 0 8px 0;
  }
  .info-box-text {
    color: #555555;
    margin: 0;
    font-size: 14px;
  }
  @media only screen and (max-width: 600px) {
    .email-body {
      padding: 30px 20px;
    }
    .email-title {
      font-size: 20px;
    }
    .email-button {
      display: block;
      text-align: center;
    }
  }
`;

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape a value so it renders as text inside an HTML email rather than as
 * markup. Every template variable is user-reachable — a display name, a house
 * name, a report summary — and these emails are delivered to third parties
 * from our own domain, so unescaped markup here is a phishing vector, not a
 * cosmetic bug.
 */
export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] as string);

/**
 * Wrap email content with base template
 */
export const wrapEmailTemplate = (
  content: string,
  title: string = 'House M8',
) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(title)}</title>
  <style>
    ${getEmailStyles()}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1 class="email-logo">🏠 House M8</h1>
    </div>
    ${content}
    <div class="email-footer">
      <p class="email-footer-text">
        This email was sent by House M8 - Roommate Manager
      </p>
      <p class="email-footer-text">
        <a href="{{baseUrl}}" class="email-link">Visit our website</a>
      </p>
      <p class="email-footer-text" style="margin-top: 15px; font-size: 12px;">
        If you have any questions, please contact us at support@housem8.app
      </p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Replace template variables with actual values.
 *
 * Values are HTML-escaped and substituted through a replacer function: passing
 * the value as a replacement *string* would let `$&`, `$1` and friends inside
 * it expand as replacement patterns, which is a second injection route that
 * escaping alone does not close.
 */
export const replaceTemplateVars = (
  template: string,
  vars: Record<string, string>,
): string =>
  Object.entries(vars).reduce((result, [key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    const escaped = escapeHtml(value);
    return result.replace(regex, () => escaped);
  }, template);
