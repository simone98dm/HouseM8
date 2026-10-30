import type { HouseBalance } from '~/types/composables/balance';
import type { Currency } from '~/types';
import type { AvatarTone } from '~/utils/avatarTone';

export interface MoneyHeadlineAction {
  label: string;
  to: string;
}

/** A run of the sentence; the housemate's name carries their avatar tone. */
export interface MoneyHeadlinePart {
  text: string;
  tone?: AvatarTone;
}

export interface MoneyHeadline {
  /** The one sentence, ready to render. Null while the balance is unknown. */
  sentence: string | null;
  /** The same sentence split so the named housemate can be coloured. */
  parts: MoneyHeadlinePart[];
  action: MoneyHeadlineAction | null;
}

// Stand-in for the name while translating, so the name's position is known in
// any locale's word order without parsing the message.
const NAME_MARK = '\u0001';

const withName = (
  marked: string,
  person: { id: string; first_name: string } | null,
): Pick<MoneyHeadline, 'sentence' | 'parts'> => {
  if (!person) return { sentence: marked, parts: [{ text: marked }] };
  const tone = avatarTone(person.id);
  const parts = marked
    .split(NAME_MARK)
    .flatMap((text, i) =>
      i === 0 ? [{ text }] : [{ text: person.first_name, tone }, { text }],
    )
    .filter((part) => part.text);
  return { sentence: parts.map((p) => p.text).join(''), parts };
};

const BALANCE_ROUTE = '/balance';

/**
 * One sentence from the current user's settle-up plan (PRODUCT.md principle 1:
 * "€47 to Marco"). Shared by the dashboard and /balance so the two never
 * disagree. Debts win over credits (the plan nets each person to one side, so
 * only one applies); several of either lead with the largest.
 *
 * A single named debt or credit carries its due date when the plan has one
 * ("before Fri, Oct 31"); past dates read "overdue since", in the same calm
 * tone.
 */
export function useMoneyHeadline(
  balance: MaybeRefOrGetter<HouseBalance | null>,
  userId: MaybeRefOrGetter<string | undefined>,
) {
  const { t } = useI18n();
  const { formatAmount } = useCurrency();
  const { formatDue, isOverdue } = useDueDate();

  const dueKey = (
    dueDate: string | null | undefined,
    base: 'owe' | 'owedOne',
  ) => {
    if (!dueDate) return `balance.headline.${base}`;
    return `balance.headline.${base}${isOverdue(dueDate) ? 'Overdue' : 'By'}`;
  };

  const headline = computed<MoneyHeadline>(() => {
    const data = toValue(balance);
    const uid = toValue(userId);
    if (!data || !uid) return { sentence: null, parts: [], action: null };

    const fmt = (amount: number) =>
      formatAmount(amount, data.currency as Currency);
    const mine = (side: 'from_user_id' | 'to_user_id') =>
      data.settlement_transactions
        .filter((tx) => tx[side] === uid)
        .sort((a, b) => b.amount - a.amount);

    const debts = mine('from_user_id');
    const [topDebt] = debts;
    if (topDebt) {
      const base = t(dueKey(topDebt.due_date, 'owe'), {
        name: NAME_MARK,
        amount: fmt(topDebt.amount),
        date: topDebt.due_date ? formatDue(topDebt.due_date) : '',
      });
      const more = debts.length - 1;
      return {
        ...withName(
          more > 0
            ? t('balance.headline.andMore', { base, n: more }, more)
            : base,
          topDebt.to_user,
        ),
        action: { label: t('balance.headline.settleUp'), to: BALANCE_ROUTE },
      };
    }

    const credits = mine('to_user_id');
    const [topCredit] = credits;
    if (topCredit) {
      const isOne = credits.length === 1;
      const sentence = isOne
        ? t(dueKey(topCredit.due_date, 'owedOne'), {
            name: NAME_MARK,
            amount: fmt(topCredit.amount),
            date: topCredit.due_date ? formatDue(topCredit.due_date) : '',
          })
        : t('balance.headline.owedMany', {
            n: credits.length,
            amount: fmt(
              credits.reduce((c, tx) => c + Math.round(tx.amount * 100), 0) /
                100,
            ),
          });
      return {
        ...withName(sentence, isOne ? topCredit.from_user : null),
        action: { label: t('balance.headline.view'), to: BALANCE_ROUTE },
      };
    }

    const settled = t('balance.headline.settled');
    return { sentence: settled, parts: [{ text: settled }], action: null };
  });

  return headline;
}
