<script lang="ts" setup>
import type { CancelDeletionResult } from '~/composables/useUser';
import { ALREADY_CANCELLED } from '~/composables/useUser';
import type { Currency } from '~/types';
import { EXPORT_RATE_LIMITED, saveBlob } from '~/utils/download';

definePageMeta({
  layout: false,
});

const { t, locale } = useI18n();

useSeoMeta({
  title: () => t('seo.titles.pendingDeletion'),
  robots: 'noindex, nofollow',
});

const userStore = useUserStore();
const housesStore = useHousesStore();
const auth = useAuth();
const { formatLong } = useDate();
const { formatAmount } = useCurrency();

type PendingAction = 'cancel' | 'export' | 'signOut';

const GRACE_DAYS = 30;
const DAY_MS = 86_400_000;

const pendingAction = ref<PendingAction | null>(null);
const error = ref('');
const exportedFilename = ref('');
const restored = ref<CancelDeletionResult | null>(null);
const restoredHouseNames = ref<string[]>([]);

const restoredHeading = ref<HTMLElement | null>(null);

// The cancel button disappears on success; move focus to the new heading so
// keyboard and screen-reader users are not dropped on <body>.
watch(restored, (val) => {
  if (val) nextTick(() => restoredHeading.value?.focus());
});

const route = useRoute();
const router = useRouter();

onMounted(() => {
  userStore.loadPendingSummary();
  // Arrived from the deletion email's cancel link: that click is the intent.
  // The session identifies the account, so the token itself is not needed.
  if (route.query.cancel_token) {
    router.replace({ query: {} });
    cancelDeletion();
  }
});

const isBusy = computed(() => pendingAction.value !== null);

const scheduledAt = computed(() => {
  const raw = userStore.currentUser?.deletion_scheduled_for;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
});

const scheduledDate = computed(() =>
  formatLong(scheduledAt.value, { weekday: false }),
);

// Whole local days left, rounded up so "later today" still reads as today.
const daysLeft = computed(() =>
  scheduledAt.value
    ? Math.max(
        0,
        Math.ceil((scheduledAt.value.getTime() - Date.now()) / DAY_MS),
      )
    : null,
);

const isOverdue = computed(
  () => !!scheduledAt.value && scheduledAt.value.getTime() <= Date.now(),
);

const subtitle = computed(() => {
  if (!scheduledAt.value || daysLeft.value === null) {
    return t('pendingDeletion.scheduledSoon', { days: GRACE_DAYS });
  }
  if (isOverdue.value) return t('pendingDeletion.scheduledPast');
  return t(
    'pendingDeletion.daysLeft',
    { n: daysLeft.value, date: scheduledDate.value },
    daysLeft.value,
  );
});

const requestedDate = computed(() => {
  const raw = userStore.currentUser?.deleted_at;
  const fallback = scheduledAt.value
    ? new Date(scheduledAt.value.getTime() - GRACE_DAYS * DAY_MS)
    : null;
  return formatLong(raw ?? fallback, { weekday: false });
});

const fullName = (u: {
  first_name?: string | null;
  last_name?: string | null;
}) =>
  `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() ||
  t('pendingDeletion.balances.someone');

const balanceHouses = computed(() =>
  (userStore.pendingSummary?.houses ?? [])
    .map((house) => ({
      id: house.id,
      name: house.name,
      lines: house.counterparts
        .filter((c) => c.net_cents !== 0)
        .map((c) => {
          const name = fullName(c.user);
          const amount = formatAmount(
            Math.abs(c.net_cents) / 100,
            house.currency as Currency,
          );
          return {
            key: c.user.id,
            name,
            amount,
            keypath:
              c.net_cents > 0
                ? 'pendingDeletion.balances.owesYou'
                : 'pendingDeletion.balances.youOwe',
          };
        }),
    }))
    .filter((house) => house.lines.length > 0),
);

const hasSummary = computed(() => userStore.pendingSummary !== null);

const subscriptionMessageKey = computed(() =>
  restored.value?.subscription_restored === true
    ? 'pendingDeletion.restored.subscriptionResumed'
    : null,
);

const showSubscriptionFailed = computed(
  () => restored.value?.subscription_restored === false,
);

const restoredHousesText = computed(() => {
  const names = restoredHouseNames.value;
  if (!names.length) {
    return restored.value?.restored_house_ids.length
      ? t('pendingDeletion.restored.housesFallback')
      : '';
  }
  return t(
    'pendingDeletion.restored.houses',
    { names: new Intl.ListFormat(locale.value).format(names) },
    names.length,
  );
});

async function run(action: PendingAction, task: () => Promise<void>) {
  if (isBusy.value) return;
  pendingAction.value = action;
  error.value = '';
  exportedFilename.value = '';
  try {
    await task();
  } finally {
    pendingAction.value = null;
  }
}

async function showRestored(result: CancelDeletionResult) {
  restored.value = result;
  if (!result.restored_house_ids.length) return;
  const houses = await housesStore.getHouseNames(result.restored_house_ids);
  restoredHouseNames.value = houses.map((h) => h.name);
}

const cancelDeletion = () =>
  run('cancel', async () => {
    const { result, error: failure } = await userStore.cancelDeletion();
    if (result && !failure) {
      await showRestored(result);
      return;
    }
    if (failure === ALREADY_CANCELLED) {
      await userStore.fetchCurrentUser(true);
      if (!userStore.currentUser?.pending_deletion) {
        await showRestored({
          restored_house_ids: [],
          subscription_restored: null,
        });
        return;
      }
    }
    error.value = t('pendingDeletion.errors.cancel');
  });

const downloadData = () =>
  run('export', async () => {
    const { data, error: failure } = await userStore.exportData();
    if (failure || !data) {
      error.value =
        failure === EXPORT_RATE_LIMITED
          ? t('errors.tooManyRequestsMessage')
          : t('pendingDeletion.errors.export');
      return;
    }
    saveBlob(data.blob, data.filename);
    exportedFilename.value = data.filename;
  });

const signOut = () =>
  run('signOut', async () => {
    const { error: failure } = await auth.signOut();
    if (failure) {
      error.value = t('pendingDeletion.errors.signOut');
      return;
    }
    await navigateTo('/auth/login', { replace: true });
  });
</script>

<template>
  <AuthShell :card-max-width="480">
    <template v-if="restored">
      <div class="restored-icon" aria-hidden="true">
        <AuthIconCheck :size="28" />
      </div>
      <h1
        ref="restoredHeading"
        tabindex="-1"
        aria-describedby="pending-restored-body"
        class="auth-heading restored-heading"
      >
        {{ t('pendingDeletion.restored.title') }}
      </h1>
      <div id="pending-restored-body" class="restored-body">
        <p v-if="restoredHousesText" class="auth-sub">
          {{ restoredHousesText }}
        </p>
        <p v-if="subscriptionMessageKey" class="auth-sub">
          {{ t(subscriptionMessageKey) }}
        </p>
      </div>
      <i18n-t
        v-if="showSubscriptionFailed"
        keypath="pendingDeletion.restored.subscriptionFailed"
        tag="p"
        class="auth-sub"
      >
        <template #link>
          <NuxtLink to="/settings/subscription" class="inline-link">
            {{ t('pendingDeletion.restored.subscriptionLink') }}
          </NuxtLink>
        </template>
      </i18n-t>
      <div class="auth-form">
        <UiLinkButton to="/dashboard" variant="primary" size="lg" full-width>
          {{ t('pendingDeletion.restored.continue') }}
        </UiLinkButton>
      </div>
    </template>

    <template v-else>
      <h1 class="auth-heading pending-heading">
        {{ t('pendingDeletion.title') }}
      </h1>
      <p class="auth-sub pending-sub">{{ subtitle }}</p>
      <p v-if="requestedDate" class="requested">
        {{ t('pendingDeletion.requestedOn', { date: requestedDate }) }}
      </p>

      <section
        aria-labelledby="pending-balances"
        class="what-happens"
        :aria-busy="userStore.isPendingSummaryLoading && !hasSummary"
      >
        <h2 id="pending-balances">{{ t('pendingDeletion.balances.title') }}</h2>
        <div
          v-if="userStore.isPendingSummaryLoading && !hasSummary"
          role="status"
          class="skeleton-group"
        >
          <span class="sr-only">{{
            t('pendingDeletion.balances.loading')
          }}</span>
          <span class="skeleton" aria-hidden="true" />
          <span class="skeleton skeleton-short" aria-hidden="true" />
        </div>
        <template v-else-if="hasSummary">
          <div
            v-if="balanceHouses.length"
            class="balances-scroll"
            role="group"
            tabindex="0"
            aria-labelledby="pending-balances"
          >
            <div v-for="house in balanceHouses" :key="house.id">
              <h3>{{ house.name }}</h3>
              <ul>
                <li v-for="line in house.lines" :key="line.key">
                  <i18n-t :keypath="line.keypath" scope="global" tag="span">
                    <template #name>{{ line.name }}</template>
                    <template #amount>
                      <span class="text-numeric amount">{{ line.amount }}</span>
                    </template>
                  </i18n-t>
                </li>
              </ul>
            </div>
          </div>
          <p v-else class="balances-empty">
            {{ t('pendingDeletion.balances.none') }}
          </p>
        </template>
      </section>

      <section aria-labelledby="pending-what-happens" class="what-happens">
        <h2 id="pending-what-happens">
          {{ t('pendingDeletion.whatHappens') }}
        </h2>
        <ul>
          <li>{{ t('pendingDeletion.points.hidden') }}</li>
          <li>{{ t('pendingDeletion.points.subscription') }}</li>
          <li>{{ t('pendingDeletion.points.erased') }}</li>
          <li>
            {{
              scheduledDate
                ? t('pendingDeletion.points.balances', { date: scheduledDate })
                : t('pendingDeletion.points.balancesNoDate')
            }}
          </li>
        </ul>
      </section>

      <div
        v-if="error"
        id="pending-deletion-error"
        class="auth-alert auth-alert-error"
        role="alert"
      >
        <AuthIconAlert />
        {{ error }}
      </div>
      <!-- Always rendered: a live region must exist before its text changes. -->
      <p
        class="export-ok"
        :class="{ 'export-ok-empty': !exportedFilename }"
        role="status"
      >
        {{
          exportedFilename
            ? t('pendingDeletion.exported', { filename: exportedFilename })
            : ''
        }}
      </p>

      <div class="auth-form">
        <UiButton
          variant="primary"
          size="lg"
          full-width
          :loading="pendingAction === 'cancel'"
          @click="cancelDeletion"
        >
          {{ t('pendingDeletion.actions.cancel') }}
        </UiButton>
        <UiButton
          size="md"
          full-width
          variant="secondary"
          :loading="pendingAction === 'export'"
          @click="downloadData"
        >
          {{ t('pendingDeletion.actions.export') }}
        </UiButton>
        <hr class="divider" aria-hidden="true" />
        <UiButton
          size="md"
          variant="ghost"
          class="sign-out"
          :loading="pendingAction === 'signOut'"
          @click="signOut"
        >
          {{ t('pendingDeletion.actions.signOut') }}
        </UiButton>
      </div>
    </template>
  </AuthShell>
</template>

<style scoped>
.pending-heading {
  margin-bottom: 10px;
}
.pending-sub {
  margin-bottom: 4px;
}
.amount {
  color: var(--fg);
}
.requested {
  margin: 0 0 8px;
  font-size: 0.875rem;
  color: var(--fg-muted);
}
.what-happens {
  margin: 0 0 12px;
}
/* Phones: drop the card chrome (keeps primary above the fold, AC24). */
@media (min-width: 640px) {
  .requested {
    margin-bottom: 16px;
  }
  .what-happens {
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    background: var(--surface);
  }
}
.what-happens h2 {
  margin: 0 0 4px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--fg);
}
.what-happens h3 {
  margin: 0 0 4px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--fg);
}
.what-happens ul {
  margin: 0;
  padding-left: 18px;
  list-style: disc;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--fg-muted);
}
.what-happens li::marker {
  color: var(--fg-muted);
}
.balances-scroll {
  /* Phones: ~2.5 lines, so the cut-off line signals scroll and the primary
     button keeps headroom above the fold at 390x844 (AC24). */
  max-height: 4.5rem;
  scrollbar-width: thin;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: var(--radius-control);
}
.balances-scroll:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
@media (min-width: 640px) {
  .balances-scroll {
    max-height: 10rem;
  }
}
.balances-empty {
  margin: 0;
  font-size: 0.875rem;
  color: var(--fg-muted);
}
.skeleton-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.skeleton {
  display: block;
  height: 0.875rem;
  border-radius: 4px;
  background: var(--border);
  animation: pulse 1.4s ease-in-out infinite;
}
.skeleton-short {
  width: 60%;
}
@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}
.export-ok {
  margin: 0 0 12px;
  font-size: 0.875rem;
  color: var(--success-fg);
}
.export-ok-empty {
  margin: 0;
}
.divider {
  width: 100%;
  margin: 4px 0;
  border: 0;
  border-top: 1px solid var(--border);
}
.sign-out {
  align-self: center;
}
.inline-link {
  color: var(--primary);
  text-decoration: underline;
}
.restored-icon {
  width: 56px;
  height: 56px;
  margin-bottom: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--success-subtle);
  color: var(--success-fg);
}
.restored-body {
  margin-bottom: 24px;
}
.restored-body .auth-sub {
  margin-bottom: 8px;
}
.restored-heading {
  margin-bottom: 12px;
}
</style>
