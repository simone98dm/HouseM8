// Restores the language the user explicitly picked in LanguageSwitcher.
// i18n's own cookie handling is off (see nuxt.config.ts) so nothing is stored
// until the user chooses.
const LOCALE_COOKIE = 'i18n_locale';
const SUPPORTED = ['en', 'it'];

export default defineNuxtPlugin({
  name: 'locale-preference',
  dependsOn: ['i18n:plugin'],
  async setup(nuxtApp) {
    const saved = useCookie<string | null>(LOCALE_COOKIE).value;
    const i18n = nuxtApp.$i18n as {
      locale: { value: string };
      setLocale: (l: string) => Promise<void>;
    };
    if (saved && SUPPORTED.includes(saved) && saved !== i18n.locale.value) {
      await i18n.setLocale(saved);
    }
  },
});
