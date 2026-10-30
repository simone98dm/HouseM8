import { escapeHtml } from './base';

export type BillingEmailLocale = 'it' | 'en';

export interface SubscriptionConfirmationTemplateProps {
  locale: BillingEmailLocale;
  planName: string;
  /** Pre-formatted VAT-inclusive price, e.g. "€3,99". */
  price: string;
  interval: string;
  /** Pre-formatted dates. */
  trialEnd: string | null;
  waiverDate: string;
  termsVersion: number;
  baseUrl: string;
}

export interface SubscriptionWithdrawalTemplateProps {
  locale: BillingEmailLocale;
  planName: string;
  mode: 'immediate' | 'period_end';
  accessEndsAt: string;
  baseUrl: string;
}

const shell = (
  title: string,
  body: string,
  baseUrl: string,
  locale: BillingEmailLocale,
): string => `
<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
  <h1>${escapeHtml(title)}</h1>
  ${body}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="color:#9ca3af;font-size:12px;">House M8 · <a href="${escapeHtml(baseUrl)}/privacy" style="color:#9ca3af;">${COPY[locale].privacy}</a></p>
</body>
</html>`;

const COPY = {
  it: {
    confirmSubject: 'House M8 - Conferma del tuo abbonamento',
    confirmTitle: 'Conferma del tuo abbonamento',
    plan: 'Piano',
    price: 'Prezzo (IVA inclusa)',
    privacy: 'Informativa privacy',
    perInterval: { month: 'al mese', year: "all'anno" } as Record<
      string,
      string
    >,
    trial: (d: string) =>
      `La prova gratuita termina il <strong>${d}</strong>; da quel giorno viene addebitato il primo pagamento.`,
    renewal:
      "L'abbonamento si rinnova automaticamente alla fine di ogni periodo fino alla disdetta.",
    waiver: (d: string) =>
      `Il ${d} hai richiesto espressamente l'avvio immediato del servizio e hai preso atto di perdere il diritto di recesso una volta completata la prestazione (art. 59 Codice del Consumo). Durante la prova, o entro 14 giorni dalla sottoscrizione, puoi comunque recedere dal contratto con effetto immediato.`,
    terms: (v: number) => `Termini e condizioni (versione ${v})`,
    cancel: 'Come disdire o recedere',
    cancelText:
      'Puoi disdire o recedere in qualsiasi momento da Impostazioni > Abbonamento:',
    manage: 'Gestisci abbonamento',
    withdrawSubject: 'House M8 - Abbonamento annullato',
    withdrawTitle: 'Abbonamento annullato',
    immediate: (p: string, d: string) =>
      `Il tuo abbonamento <strong>${p}</strong> è stato annullato con effetto immediato (${d}).`,
    periodEnd: (p: string, d: string) =>
      `Il tuo abbonamento <strong>${p}</strong> è stato annullato: potrai usare il servizio fino al <strong>${d}</strong>.`,
    noCharge: 'Non verranno effettuati ulteriori addebiti.',
  },
  en: {
    confirmSubject: 'House M8 - Your subscription confirmation',
    confirmTitle: 'Your subscription confirmation',
    plan: 'Plan',
    price: 'Price (VAT included)',
    privacy: 'Privacy',
    perInterval: { month: 'per month', year: 'per year' } as Record<
      string,
      string
    >,
    trial: (d: string) =>
      `Your free trial ends on <strong>${d}</strong>; the first payment is charged that day.`,
    renewal:
      'The subscription renews automatically at the end of each period until you cancel.',
    waiver: (d: string) =>
      `On ${d} you expressly requested immediate start of the service and acknowledged that you lose your right of withdrawal once the service has been fully performed. During the trial, or within 14 days of subscribing, you can still withdraw from the contract with immediate effect.`,
    terms: (v: number) => `Terms and conditions (version ${v})`,
    cancel: 'How to cancel or withdraw',
    cancelText:
      'You can cancel or withdraw at any time from Settings > Subscription:',
    manage: 'Manage subscription',
    withdrawSubject: 'House M8 - Subscription cancelled',
    withdrawTitle: 'Subscription cancelled',
    immediate: (p: string, d: string) =>
      `Your <strong>${p}</strong> subscription has been cancelled with immediate effect (${d}).`,
    periodEnd: (p: string, d: string) =>
      `Your <strong>${p}</strong> subscription has been cancelled: you can keep using the service until <strong>${d}</strong>.`,
    noCharge: 'You will not be charged again.',
  },
} as const;

export function getSubscriptionConfirmationSubject(l: BillingEmailLocale) {
  return COPY[l].confirmSubject;
}

export function getSubscriptionWithdrawalSubject(l: BillingEmailLocale) {
  return COPY[l].withdrawSubject;
}

export function getSubscriptionConfirmationTemplate(
  p: SubscriptionConfirmationTemplateProps,
): string {
  const c = COPY[p.locale];
  const base = escapeHtml(p.baseUrl);
  const manageUrl = `${base}/settings/subscription`;
  return shell(
    c.confirmTitle,
    `
  <p>${c.plan}: <strong>${escapeHtml(p.planName)}</strong><br>
     ${c.price}: <strong>${escapeHtml(p.price)}</strong> ${c.perInterval[p.interval] ?? ''}</p>
  ${p.trialEnd ? `<p>${c.trial(escapeHtml(p.trialEnd))}</p>` : ''}
  <p>${c.renewal}</p>
  <p>${c.waiver(escapeHtml(p.waiverDate))}</p>
  <p><a href="${base}/terms">${c.terms(p.termsVersion)}</a></p>
  <h2>${c.cancel}</h2>
  <p>${c.cancelText} <a href="${manageUrl}">${c.manage}</a></p>`,
    p.baseUrl,
    p.locale,
  );
}

export function getSubscriptionWithdrawalTemplate(
  p: SubscriptionWithdrawalTemplateProps,
): string {
  const c = COPY[p.locale];
  const plan = escapeHtml(p.planName);
  const when = escapeHtml(p.accessEndsAt);
  return shell(
    c.withdrawTitle,
    `<p>${p.mode === 'immediate' ? c.immediate(plan, when) : c.periodEnd(plan, when)}</p>
  <p>${c.noCharge}</p>`,
    p.baseUrl,
    p.locale,
  );
}
