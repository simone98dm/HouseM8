import { describe, expect, it } from 'vitest';

import {
  escapeHtml,
  replaceTemplateVars,
  wrapEmailTemplate,
} from '../../templates/base';
import { getMemberInviteTemplate } from '../../templates/member-invite';

describe('escapeHtml', () => {
  it('escapes every character that can change the meaning of the markup', () => {
    // Arrange
    const value = `<a href="x" title='y'>&</a>`;

    // Act
    const escaped = escapeHtml(value);

    // Assert
    expect(escaped).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeHtml('Jane Doe')).toBe('Jane Doe');
  });
});

describe('replaceTemplateVars', () => {
  it('renders an injected anchor as text instead of markup', () => {
    // Arrange
    const template = '<p>Hi {{userName}}</p>';
    const payload = {
      userName:
        '</p><a href="https://evil.example">Confirm your account</a><p>',
    };

    // Act
    const result = replaceTemplateVars(template, payload);

    // Assert
    expect(result).not.toContain('<a href="https://evil.example"');
    expect(result).toContain('&lt;a href=&quot;https://evil.example&quot;');
  });

  it('does not expand replacement patterns present in the value', () => {
    // Arrange — `$&` is the whole matched substring in String.replace
    const template = '<p>{{userName}}</p>';

    // Act
    const result = replaceTemplateVars(template, { userName: '$& $` $1' });

    // Assert
    expect(result).toBe('<p>$&amp; $` $1</p>');
  });

  it('replaces every occurrence of the same variable', () => {
    const result = replaceTemplateVars('{{a}}-{{a}}', { a: 'x' });
    expect(result).toBe('x-x');
  });
});

describe('wrapEmailTemplate', () => {
  it('escapes the title but keeps the content as markup', () => {
    // Act
    const html = wrapEmailTemplate(
      '<p class="email-text">body</p>',
      '<script>',
    );

    // Assert
    expect(html).toContain('<title>&lt;script&gt;</title>');
    expect(html).toContain('<p class="email-text">body</p>');
  });
});

describe('getMemberInviteTemplate', () => {
  it('neutralises markup coming from the inviter display name', () => {
    // Arrange — inviterName is built from user-supplied first/last name
    const html = getMemberInviteTemplate({
      inviterName: '</strong><a href="https://evil.example">Click</a><strong>',
      houseName: 'Flat 3',
      inviteLink: 'https://app.example/house/join/token',
      code: 'ABC123',
      codeExpiresAt: '1 Jan 2027, 10:00',
      baseUrl: 'https://app.example',
    });

    // Assert
    expect(html).not.toContain('href="https://evil.example"');
    expect(html).toContain('&lt;a href=&quot;https://evil.example&quot;');
  });
});
