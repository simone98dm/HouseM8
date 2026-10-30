<script lang="ts" setup>
type Locale = 'en' | 'it';

const { locale, setLocale } = useI18n();
const selectId = useId();
const { fieldClasses } = useFieldStyles();
const selectClasses = `${fieldClasses()} w-36 cursor-pointer`;
const localeCookie = useCookie<string | null>('i18n_locale', {
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
});

// Get current locale info
const currentLocale = computed(() => locale.value);
const availableLocales = computed(() => [
  { code: 'en' as Locale, name: 'English' },
  { code: 'it' as Locale, name: 'Italiano' },
]);

// Switch language function
const switchLanguage = async (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const newLocale = target.value as Locale;

  if (newLocale !== currentLocale.value) {
    localeCookie.value = newLocale; // explicit choice: only place the cookie is set
    await setLocale(newLocale);
  }
};
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <label :for="selectId" class="text-sm font-medium text-fg">
      {{ $t('profile.settings.language') }}
    </label>
    <select
      :id="selectId"
      :value="currentLocale"
      :class="selectClasses"
      @change="switchLanguage"
    >
      <!-- No flag glyph in the option text (options cannot hide it from AT);
           each option is announced by its language name, in that language. -->
      <option
        v-for="loc in availableLocales"
        :key="loc.code"
        :value="loc.code"
        :lang="loc.code"
      >
        {{ loc.name }}
      </option>
    </select>
  </div>
</template>
