import { describe, it, expect } from 'vitest';
import {
  getSubscriptionConfirmationSubject,
  getSubscriptionConfirmationTemplate,
  getSubscriptionWithdrawalSubject,
  getSubscriptionWithdrawalTemplate,
} from '~~/server/templates/subscription';

const confirm = {
  locale: 'en' as const,
  planName: 'Premium',
  price: '€3.99',
  interval: 'month',
  trialEnd: '1 Nov 2026',
  waiverDate: '25 Oct 2026',
  termsVersion: 3,
  baseUrl: 'https://app.test',
};

describe('subscription email templates', () => {
  it('returns localized subjects', () => {
    expect(getSubscriptionConfirmationSubject('it')).toContain('Conferma');
    expect(getSubscriptionConfirmationSubject('en')).toContain('confirmation');
    expect(getSubscriptionWithdrawalSubject('it')).toContain('annullato');
    expect(getSubscriptionWithdrawalSubject('en')).toContain('cancelled');
  });

  it('confirmation includes plan, price, interval, trial, waiver, terms and manage link', () => {
    const html = getSubscriptionConfirmationTemplate(confirm);
    expect(html).toContain('lang="en"');
    expect(html).toContain('Premium');
    expect(html).toContain('€3.99');
    expect(html).toContain('per month');
    expect(html).toContain('1 Nov 2026');
    expect(html).toContain('25 Oct 2026');
    expect(html).toContain('version 3');
    expect(html).toContain('https://app.test/settings/subscription');
  });

  it('omits the trial paragraph when there is no trial', () => {
    expect(
      getSubscriptionConfirmationTemplate({ ...confirm, trialEnd: null }),
    ).not.toContain('free trial');
  });

  it('renders Italian copy and yearly interval', () => {
    const html = getSubscriptionConfirmationTemplate({
      ...confirm,
      locale: 'it',
      interval: 'year',
    });
    expect(html).toContain("all'anno");
    expect(html).toContain('art. 59 Codice del Consumo');
  });

  it('renders no interval text for an unknown interval', () => {
    const html = getSubscriptionConfirmationTemplate({
      ...confirm,
      interval: 'week',
    });
    expect(html).not.toContain('per month');
    expect(html).not.toContain('per year');
  });

  it('escapes HTML in user-influenced fields', () => {
    const html = getSubscriptionConfirmationTemplate({
      ...confirm,
      planName: '<script>x</script>',
      waiverDate: '<img onerror=1>',
      trialEnd: '<b>t</b>',
    });
    expect(html).not.toContain('<script>x</script>');
    expect(html).not.toContain('<img onerror=1>');
    expect(html).toContain('&lt;script&gt;');
  });

  const withdraw = {
    locale: 'en' as const,
    planName: 'Premium',
    mode: 'immediate' as const,
    accessEndsAt: '25 Oct 2026',
    baseUrl: 'https://app.test',
  };

  it('withdrawal immediate vs period_end wording', () => {
    expect(getSubscriptionWithdrawalTemplate(withdraw)).toContain(
      'immediate effect',
    );
    const pe = getSubscriptionWithdrawalTemplate({
      ...withdraw,
      mode: 'period_end',
    });
    expect(pe).toContain('keep using the service until');
    expect(pe).toContain('25 Oct 2026');
  });

  it('withdrawal supports Italian and escapes plan name', () => {
    const html = getSubscriptionWithdrawalTemplate({
      ...withdraw,
      locale: 'it',
      planName: '<i>p</i>',
    });
    expect(html).toContain('annullato');
    expect(html).not.toContain('<i>p</i>');
  });

  it.each([
    ['it', 'month', 'al mese', 'Informativa privacy'],
    ['it', 'year', "all'anno", 'Informativa privacy'],
    ['en', 'month', 'per month', '>Privacy<'],
    ['en', 'year', 'per year', '>Privacy<'],
  ] as const)(
    'localizes %s/%s interval, html lang and footer link',
    (locale, interval, text, footer) => {
      const html = getSubscriptionConfirmationTemplate({
        ...confirm,
        locale,
        interval,
      });
      expect(html).toContain(`<html lang="${locale}">`);
      expect(html).toContain(text);
      expect(html).toContain(footer);
      expect(html).toContain('href="https://app.test/privacy"');
    },
  );

  it('withdrawal email uses the localized html lang and privacy footer', () => {
    const html = getSubscriptionWithdrawalTemplate({
      ...withdraw,
      locale: 'it',
    });
    expect(html).toContain('<html lang="it">');
    expect(html).toContain('Informativa privacy');
  });
});
