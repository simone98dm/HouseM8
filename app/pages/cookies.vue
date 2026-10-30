<script setup lang="ts">
import {
  STORAGE_ITEMS,
  LEGAL_LAST_UPDATED,
  PRIVACY_CONTACT_EMAIL,
} from '~/utils/legal/cookies';

definePageMeta({ layout: 'legal' });
const { t } = useI18n();
const config = useRuntimeConfig();

useSeoMeta({
  title: t('seo.titles.cookies'),
  ogTitle: `${t('seo.titles.cookies')} | House M8`,
  description: t('seo.descriptions.cookies'),
  ogDescription: t('seo.descriptions.cookies'),
  ogUrl: `${config.public.baseUrl}/cookies`,
});

const BROWSER_HELP = [
  {
    key: 'chrome',
    href: 'https://support.google.com/chrome/answer/95647',
  },
  {
    key: 'firefox',
    href: 'https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox',
  },
  {
    key: 'safari',
    href: 'https://support.apple.com/guide/safari/sfri11471/mac',
  },
  {
    key: 'edge',
    href: 'https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09',
  },
] as const;
</script>

<template>
  <div>
    <h1>{{ t('cookiePolicy.title') }}</h1>
    <p>
      {{ t('cookiePolicy.lastUpdated', { date: LEGAL_LAST_UPDATED }) }}
    </p>

    <h2>{{ t('cookiePolicy.whatTitle') }}</h2>
    <p>{{ t('cookiePolicy.whatBody') }}</p>

    <h2 id="cookies-used">{{ t('cookiePolicy.usedTitle') }}</h2>
    <p>{{ t('cookiePolicy.usedIntro') }}</p>
    <div
      class="not-prose overflow-x-auto"
      role="region"
      tabindex="0"
      aria-labelledby="cookies-used"
    >
      <table class="w-full text-left text-sm">
        <caption class="mb-2 text-left font-semibold">
          {{
            t('cookiePolicy.table.caption')
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col" class="p-2">{{ t('cookiePolicy.table.name') }}</th>
            <th scope="col" class="p-2">
              {{ t('cookiePolicy.table.provider') }}
            </th>
            <th scope="col" class="p-2">{{ t('cookiePolicy.table.type') }}</th>
            <th scope="col" class="p-2">
              {{ t('cookiePolicy.table.category') }}
            </th>
            <th scope="col" class="p-2">
              {{ t('cookiePolicy.table.purpose') }}
            </th>
            <th scope="col" class="p-2">
              {{ t('cookiePolicy.table.duration') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in STORAGE_ITEMS"
            :key="item.name"
            class="border-t border-line align-top"
          >
            <th scope="row" class="p-2 font-mono font-normal">
              {{ item.name }}
            </th>
            <td class="p-2">{{ t('legal.storage.firstParty') }}</td>
            <td class="p-2">{{ t(`legal.storage.kind.${item.kind}`) }}</td>
            <td class="p-2">
              {{ t(`legal.storage.category.${item.category}`) }}
            </td>
            <td class="p-2">{{ t(item.purposeKey) }}</td>
            <td class="p-2">{{ t(item.durationKey) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p>{{ t('cookiePolicy.localeNote') }}</p>

    <h2>{{ t('cookiePolicy.noConsentTitle') }}</h2>
    <p>{{ t('cookiePolicy.noConsentBody') }}</p>

    <h2>{{ t('cookiePolicy.thirdPartyTitle') }}</h2>
    <p>{{ t('cookiePolicy.thirdPartyBody') }}</p>

    <h2>{{ t('cookiePolicy.manageTitle') }}</h2>
    <p>{{ t('cookiePolicy.manageBody') }}</p>
    <ul>
      <li v-for="browser in BROWSER_HELP" :key="browser.key">
        <a :href="browser.href" target="_blank" rel="noopener noreferrer">{{
          t(`cookiePolicy.browsers.${browser.key}`)
        }}</a>
      </li>
    </ul>

    <h2>{{ t('cookiePolicy.clearTitle') }}</h2>
    <p>{{ t('cookiePolicy.clearBody') }}</p>

    <h2>{{ t('cookiePolicy.contactTitle') }}</h2>
    <i18n-t keypath="cookiePolicy.contactBody" tag="p">
      <template #email>
        <LegalMailLink
          :email="PRIVACY_CONTACT_EMAIL"
          :lead="t('cookiePolicy.contactLead')"
          :fallback="t('cookiePolicy.contactFallback')"
        />
      </template>
      <template #privacyLink>
        <NuxtLink to="/privacy">{{
          t('cookiePolicy.privacyLinkText')
        }}</NuxtLink>
      </template>
    </i18n-t>
  </div>
</template>
