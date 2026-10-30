import type { Currency } from '~/types';
import type { RecentPayment } from '~/types/composables/balance';

/** Money left the current user (`out`), reached them (`in`), or neither. */
export type PaymentDirection = 'in' | 'out' | 'other';

/**
 * One payment as a sentence from the current user's point of view, shared by
 * /balance's "Recent payments" and the dashboard activity feed so the two never
 * word the same payment differently.
 */
export const usePaymentDescription = () => {
  const { t, locale } = useI18n();
  const { formatAmount } = useCurrency();

  /** "Tue, Oct 28" / IT "mar 28 ott". */
  const formatWhen = (iso: string): string =>
    new Date(iso).toLocaleDateString(locale.value, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

  const direction = (
    p: RecentPayment,
    currentUserId: string | undefined,
  ): PaymentDirection => {
    if (currentUserId && p.from_user.id === currentUserId) return 'out';
    if (currentUserId && p.to_user.id === currentUserId) return 'in';
    return 'other';
  };

  /** "You paid Marco €47.00" / "Anna paid you €12.00" / "Anna paid Marco €5.00". */
  const describe = (
    p: RecentPayment,
    currency: Currency,
    currentUserId: string | undefined,
  ): string => {
    const amount = formatAmount(p.amount, currency);
    switch (direction(p, currentUserId)) {
      case 'out':
        return t('balance.recent.youPaid', {
          name: p.to_user.first_name,
          amount,
        });
      case 'in':
        return t('balance.recent.paidYou', {
          name: p.from_user.first_name,
          amount,
        });
      default:
        return t('balance.recent.paidOther', {
          from: p.from_user.first_name,
          to: p.to_user.first_name,
          amount,
        });
    }
  };

  return { describe, direction, formatWhen };
};
