/**
 * The one sentence shared by the dashboard and /balance. Every branch, in
 * English and Italian (plurals differ: "and 1 more" / "e un altro").
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent } from 'vue';
import { useMoneyHeadline } from '~/composables/useMoneyHeadline';
import { avatarTone } from '~/utils/avatarTone';
import type {
  HouseBalance,
  SettlementTransaction,
} from '~/types/composables/balance';

const ME = 'me';
const person = (id: string, name: string) => ({
  id,
  first_name: name,
  last_name: 'X',
});

const tx = (
  from: string,
  fromName: string,
  to: string,
  toName: string,
  amount: number,
): SettlementTransaction => ({
  from_user_id: from,
  to_user_id: to,
  amount,
  from_user: person(from, fromName),
  to_user: person(to, toName),
});

/** 'YYYY-MM-DD' `days` from today, local time. */
const dayFromToday = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const shown = (iso: string, locale: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};
const dated = (t: SettlementTransaction, due: string | null) => ({
  ...t,
  due_date: due,
});

const plan = (txs: SettlementTransaction[]): HouseBalance =>
  ({
    house_id: 'h',
    currency: 'EUR',
    user_balances: [],
    settlement_transactions: txs,
    total_expenses: 0,
    is_balanced: txs.length === 0,
  }) as HouseBalance;

async function headlineFor(
  balance: HouseBalance | null,
  locale: 'en' | 'it' = 'en',
  userId: string = ME,
) {
  await useNuxtApp().$i18n.setLocale(locale);
  let result!: ReturnType<typeof useMoneyHeadline>;
  const Host = defineComponent({
    template: '<div />',
    setup() {
      result = useMoneyHeadline(balance, userId);
      return {};
    },
  });
  await mountSuspended(Host);
  return result.value;
}

describe('useMoneyHeadline', () => {
  afterEach(() => useNuxtApp().$i18n.setLocale('en'));

  it('has no sentence while the balance is unknown', async () => {
    expect(await headlineFor(null)).toEqual({
      sentence: null,
      parts: [],
      action: null,
    });
    expect(
      await headlineFor(plan([]), 'en', '').then((h) => h.sentence),
    ).toBeNull();
  });

  it('says who the user owes and offers Settle up', async () => {
    const h = await headlineFor(plan([tx(ME, 'Me', 'm', 'Marco', 47)]));
    expect(h.sentence).toBe('You owe Marco €47.00');
    expect(h.action).toEqual({ label: 'Pay back', to: '/balance' });
  });

  it('leads with the largest debt and counts the rest', async () => {
    const h = await headlineFor(
      plan([
        tx(ME, 'Me', 'a', 'Anna', 10),
        tx(ME, 'Me', 'm', 'Marco', 47),
        tx(ME, 'Me', 'l', 'Luca', 5),
      ]),
    );
    expect(h.sentence).toBe('You owe Marco €47.00 and 2 more');
  });

  it('uses the singular for exactly one more', async () => {
    const h = await headlineFor(
      plan([tx(ME, 'Me', 'a', 'Anna', 10), tx(ME, 'Me', 'm', 'Marco', 47)]),
    );
    expect(h.sentence).toBe('You owe Marco €47.00 and 1 more');
  });

  it('names a single creditor and offers View balance', async () => {
    const h = await headlineFor(plan([tx('m', 'Marco', ME, 'Me', 12.5)]));
    expect(h.sentence).toBe('Marco owes you €12.50');
    expect(h.action).toEqual({ label: 'View balance', to: '/balance' });
  });

  it('totals several creditors without float drift', async () => {
    const h = await headlineFor(
      plan([tx('a', 'Anna', ME, 'Me', 10.1), tx('b', 'Bo', ME, 'Me', 20.2)]),
    );
    expect(h.sentence).toBe('2 housemates owe you €30.30');
  });

  it('is plain when settled, with no action', async () => {
    const h = await headlineFor(plan([]));
    expect(h.sentence).toBe("You're all settled up");
    expect(h.action).toBeNull();
  });

  it('ignores transfers between other housemates', async () => {
    const h = await headlineFor(plan([tx('a', 'Anna', 'b', 'Bo', 30)]));
    expect(h.sentence).toBe("You're all settled up");
  });

  describe('due dates', () => {
    const future = dayFromToday(5);
    const past = dayFromToday(-3);

    it('adds "before {date}" to a debt with an upcoming date', async () => {
      const h = await headlineFor(
        plan([dated(tx(ME, 'Me', 'm', 'Marco', 47), future)]),
      );
      expect(h.sentence).toBe(
        `You owe Marco €47.00 before ${shown(future, 'en')}`,
      );
    });

    it('treats today as still on time', async () => {
      const today = dayFromToday(0);
      const h = await headlineFor(
        plan([dated(tx(ME, 'Me', 'm', 'Marco', 47), today)]),
      );
      expect(h.sentence).toBe(
        `You owe Marco €47.00 before ${shown(today, 'en')}`,
      );
    });

    it('says "overdue since" for a past date, without raising its voice', async () => {
      const h = await headlineFor(
        plan([dated(tx(ME, 'Me', 'm', 'Marco', 47), past)]),
      );
      expect(h.sentence).toBe(
        `You owe Marco €47.00, overdue since ${shown(past, 'en')}`,
      );
      expect(h.sentence).not.toContain('!');
    });

    it('carries the date of the lead debt into "and N more"', async () => {
      const h = await headlineFor(
        plan([
          dated(tx(ME, 'Me', 'm', 'Marco', 47), future),
          tx(ME, 'Me', 'a', 'Anna', 10),
        ]),
      );
      expect(h.sentence).toBe(
        `You owe Marco €47.00 before ${shown(future, 'en')} and 1 more`,
      );
    });

    it('adds "by {date}" to a single credit, "overdue since" when late', async () => {
      const by = await headlineFor(
        plan([dated(tx('m', 'Marco', ME, 'Me', 12.5), future)]),
      );
      expect(by.sentence).toBe(
        `Marco owes you €12.50 by ${shown(future, 'en')}`,
      );
      const late = await headlineFor(
        plan([dated(tx('m', 'Marco', ME, 'Me', 12.5), past)]),
      );
      expect(late.sentence).toBe(
        `Marco owes you €12.50, overdue since ${shown(past, 'en')}`,
      );
    });

    it('keeps the plain sentence when the plan has no date', async () => {
      const h = await headlineFor(
        plan([dated(tx(ME, 'Me', 'm', 'Marco', 47), null)]),
      );
      expect(h.sentence).toBe('You owe Marco €47.00');
    });

    it('does not date the many-creditors summary', async () => {
      const h = await headlineFor(
        plan([
          dated(tx('a', 'Anna', ME, 'Me', 10), future),
          dated(tx('b', 'Bo', ME, 'Me', 20), future),
        ]),
      );
      expect(h.sentence).toBe('2 housemates owe you €30.00');
    });

    it('formats in Italian', async () => {
      const debt = await headlineFor(
        plan([dated(tx(ME, 'Me', 'm', 'Marco', 47), future)]),
        'it',
      );
      expect(debt.sentence).toMatch(
        new RegExp(`^Devi 47,00\\s€ a Marco entro ${shown(future, 'it')}$`),
      );
      const late = await headlineFor(
        plan([dated(tx(ME, 'Me', 'm', 'Marco', 47), past)]),
        'it',
      );
      expect(late.sentence).toContain(`scaduto dal ${shown(past, 'it')}`);
      const credit = await headlineFor(
        plan([dated(tx('m', 'Marco', ME, 'Me', 12.5), future)]),
        'it',
      );
      expect(credit.sentence).toContain(`entro ${shown(future, 'it')}`);
    });
  });

  describe('Italian', () => {
    it('owe, with singular and plural "more"', async () => {
      const one = await headlineFor(
        plan([tx(ME, 'Me', 'a', 'Anna', 10), tx(ME, 'Me', 'm', 'Marco', 47)]),
        'it',
      );
      expect(one.sentence).toMatch(/^Devi 47,00\s€ a Marco e un altro$/);
      const two = await headlineFor(
        plan([
          tx(ME, 'Me', 'a', 'Anna', 10),
          tx(ME, 'Me', 'm', 'Marco', 47),
          tx(ME, 'Me', 'l', 'Luca', 5),
        ]),
        'it',
      );
      expect(two.sentence).toMatch(/e altri 2$/);
    });

    it('owed and settled', async () => {
      const owed = await headlineFor(
        plan([tx('m', 'Marco', ME, 'Me', 12)]),
        'it',
      );
      expect(owed.sentence).toMatch(/^Marco ti deve 12,00\s€$/);
      const many = await headlineFor(
        plan([tx('a', 'Anna', ME, 'Me', 1), tx('b', 'Bo', ME, 'Me', 2)]),
        'it',
      );
      expect(many.sentence).toMatch(/^2 coinquilini ti devono 3,00\s€$/);
      expect((await headlineFor(plan([]), 'it')).sentence).toBe(
        'Sei in pari con tutti',
      );
    });
  });

  describe('name parts', () => {
    it('marks the creditor you owe with their avatar tone', async () => {
      const h = await headlineFor(plan([tx(ME, 'Me', 'm', 'Marco', 47)]));
      const name = h.parts.find((p) => p.tone);
      expect(name).toEqual({ text: 'Marco', tone: avatarTone('m') });
      expect(h.parts.map((p) => p.text).join('')).toBe(h.sentence);
      expect(h.sentence).not.toContain('\u0001');
    });

    it('marks the debtor in Italian word order too', async () => {
      const h = await headlineFor(
        plan([tx('g', 'Giulia', ME, 'Me', 12)]),
        'it',
      );
      expect(h.parts[0]).toEqual({ text: 'Giulia', tone: avatarTone('g') });
      expect(h.parts.map((p) => p.text).join('')).toBe(h.sentence);
    });

    it('keeps the name marked when more debts follow', async () => {
      const h = await headlineFor(
        plan([tx(ME, 'Me', 'm', 'Marco', 47), tx(ME, 'Me', 'l', 'Luca', 5)]),
      );
      expect(h.parts.filter((p) => p.tone)).toEqual([
        { text: 'Marco', tone: avatarTone('m') },
      ]);
    });

    it('has no coloured name when several people owe you or all is settled', async () => {
      const many = await headlineFor(
        plan([tx('a', 'Ada', ME, 'Me', 5), tx('b', 'Bo', ME, 'Me', 6)]),
      );
      const settled = await headlineFor(plan([]));
      expect(many.parts.some((p) => p.tone)).toBe(false);
      expect(settled.parts).toEqual([{ text: settled.sentence }]);
    });
  });
});
