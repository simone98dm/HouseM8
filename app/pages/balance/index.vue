<script lang="ts" setup>
const { t } = useI18n();

useSeoMeta({
  title: t('seo.titles.balance'),
});

const {
  houseBalance,
  loading,
  recentPayments,
  soleTransfer,
  soleTransferIsCredit,
  currentUserId,
  processingSettlement,
  myCredits,
  me,
  otherPeople,
  currency,
  myDebts,
  headline,
  formatAmount,
  loadBalance,
  markSettlementComplete,
  undoSettlement,
} = useBalancePage();

// Settling or undoing re-renders the row that held focus away, which drops
// focus to <body> (WCAG 2.4.3). Park it on <main> instead.
const keepFocus = async (action: () => unknown) => {
  await action();
  await nextTick();
  if (document.activeElement && document.activeElement !== document.body)
    return;
  document.getElementById('main-content')?.focus({ preventScroll: true });
};

// Hero action for the viewer's only transfer: same verb and accessible name
// (label-in-name) as the row button it replaces.
const soleKey = computed(() =>
  soleTransfer.value
    ? `${soleTransfer.value.from_user_id}-${soleTransfer.value.to_user_id}`
    : null,
);
const soleVerb = computed(() =>
  t(
    soleTransferIsCredit.value
      ? 'balance.markReceived'
      : 'balance.headline.settleUp',
  ),
);
const soleLabel = computed(() => {
  const tx = soleTransfer.value;
  if (!tx) return undefined;
  const credit = soleTransferIsCredit.value;
  const detail = t(
    credit ? 'a11y.buttons.settleCredit' : 'a11y.buttons.settleDebt',
    {
      name: (credit ? tx.from_user : tx.to_user).first_name,
      amount: formatAmount(tx.amount, currency.value),
    },
  );
  return `${soleVerb.value} — ${detail}`;
});
const settle = (transaction: Parameters<typeof markSettlementComplete>[0]) =>
  keepFocus(() => markSettlementComplete(transaction));
</script>

<template>
  <!-- No refresh button: settling reloads the balance, so it stays live. -->
  <AppPageHeader :title="t('navigation.balance')" />

  <!-- Static skeleton rows: motion reports state, a pulse here is decoration. -->
  <div v-if="loading" role="status" class="space-y-4">
    <span class="sr-only">{{ t('common.loading') }}</span>
    <UiSkeleton :height="96" rounded="rounded-card" />
    <UiSkeleton :height="64" />
    <UiSkeleton :height="64" />
    <UiSkeleton :height="64" />
  </div>

  <UiContainer v-else-if="houseBalance">
    <UiSummary v-if="headline.sentence" class="mb-8">
      <BalanceHeadlineSentence :parts="headline.parts" />
      <template v-if="soleTransfer" #action>
        <UiButton
          variant="primary"
          size="md"
          :loading="processingSettlement === soleKey"
          :aria-label="soleLabel"
          @click="settle(soleTransfer)"
        >
          {{ soleVerb }}
        </UiButton>
      </template>
    </UiSummary>

    <BalanceMyDebtsSection
      v-if="!soleTransfer && myDebts.length > 0"
      :transactions="myDebts"
      :currency="currency"
      :processing-key="processingSettlement"
      :current-user-id="currentUserId"
      class="mb-8"
      @settle="settle"
    />

    <BalanceMyDebtsSection
      v-if="!soleTransfer && myCredits.length > 0"
      variant="credits"
      :transactions="myCredits"
      :currency="currency"
      :processing-key="processingSettlement"
      :current-user-id="currentUserId"
      class="mb-8"
      @settle="settle"
    />

    <BalanceAllSettledState
      v-if="houseBalance.is_balanced"
      :me="me"
      :others="otherPeople"
    />

    <section v-else class="mb-8" aria-labelledby="everyone-balance-heading">
      <h2
        id="everyone-balance-heading"
        class="mb-3 text-base font-semibold text-fg"
      >
        {{ t('balance.everyoneBalance') }}
      </h2>
      <UiCard padding="none">
        <ul class="divide-y divide-line">
          <BalancePersonCard
            v-for="balance in houseBalance.user_balances"
            :key="balance.user_id"
            :balance="balance"
            :currency="currency"
            :current-user-id="currentUserId"
            :formatted-net-balance="
              formatAmount(Math.abs(balance.net_balance), currency)
            "
          />
        </ul>
      </UiCard>
    </section>

    <BalanceRecentPayments
      :payments="recentPayments"
      :currency="currency"
      :current-user-id="currentUserId"
      class="mb-8"
      @undo="(payment) => keepFocus(() => undoSettlement(payment.id))"
    />

    <!-- The old "how this works" card and the payment-activity card are gone:
         the first was explanation nobody asked for on every visit, the second
         repeated the headline. One quiet disclosure keeps the explanation
         available without a card. -->
    <details class="text-sm text-fg-muted">
      <summary
        class="cursor-pointer rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {{ t('balance.howThisWorksSummary') }}
      </summary>
      <p class="mt-2 max-w-prose">{{ t('balance.howThisWorksDesc') }}</p>
    </details>
  </UiContainer>

  <BalanceNoBalanceState v-else @retry="loadBalance" />
</template>
