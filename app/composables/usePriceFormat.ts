/** Formats a minor-unit amount (cents) as currency in the current locale. */
export const usePriceFormat = () => {
  const { locale } = useI18n();

  const money = (cents: number, currency: string): string =>
    new Intl.NumberFormat(locale.value, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);

  return { money };
};
