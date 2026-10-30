<script lang="ts" setup>
const { t } = useI18n();

useSeoMeta({
  title: () => t('seo.titles.dashboard'),
});

const {
  house,
  members,
  upcomingBills,
  notes,
  currentUserId,
  houseBalance,
  headline,
  heroAction,
  isSettling,
  markSettlementComplete,
  month,
  nextBill,
  attention,
  recentPayments,
  isBalanceLoading,
  isInitialLoading,
  showCreateHouse,
  handleCreateHouse,
  handleCreateNote,
  handleDeleteNote,
} = useDashboardPage();
</script>

<template>
  <!-- ClientOnly is load-bearing, do not unwrap it.
       `isInitialLoading` reads Pinia state (userStore.currentUser,
       housesStore.lastFetch) that does not exist during SSR, so the server
       always rendered the skeleton branch while the client — whose stores are
       already populated by hydration time — rendered the real branch. Vue
       reported three "Hydration node mismatch" warnings on this page for
       exactly that reason: the summary block and `div.dash-grid`
       served, comment/fragment placeholders expected.

       The fallback renders on the server and the branch below only ever runs on
       the client, so the two are never compared. -->
  <!-- One header for every state: AppPageHeader is client-only itself, so it
       may read `isInitialLoading` (Pinia state absent during SSR) freely. -->
  <AppPageHeader
    :title="isInitialLoading ? undefined : t('navigation.home')"
    :meta="
      house
        ? `${house.name} · ${t('home.housemateCount', members.length)}`
        : undefined
    "
  >
    <template v-if="isInitialLoading" #default>
      <UiSkeleton :width="160" :height="20" rounded="rounded-control" />
    </template>
    <template #actions>
      <UiLinkButton
        v-if="house && !isInitialLoading"
        variant="primary"
        icon="plus"
        to="/expenses"
      >
        {{ t('home.addExpense') }}
      </UiLinkButton>
    </template>
  </AppPageHeader>

  <!-- ClientOnly is load-bearing, do not unwrap it.
       `isInitialLoading` reads Pinia state (userStore.currentUser,
       housesStore.lastFetch) that does not exist during SSR, so the server
       always rendered the skeleton branch while the client — whose stores are
       already populated by hydration time — rendered the real branch, which
       Vue reported as "Hydration node mismatch". The fallback renders on the
       server and the branch below only ever runs on the client, so the two
       are never compared. -->
  <ClientOnly>
    <template #fallback>
      <DashboardSkeleton />
    </template>

    <DashboardSkeleton v-if="isInitialLoading" />

    <template v-else>
      <DashboardNoHouseState
        v-if="!house"
        @create="showCreateHouse = true"
        @join="(token) => navigateTo(`/house/join/${token}`)"
      />

      <div v-if="house" class="dash-stack">
        <div class="dash-top">
          <!-- Hierarchy: the month and its balance, the owner's status line,
               what is due next. The side column holds the bulletin board and recent activity. -->
          <div class="dash-main">
            <DashboardYourMonthCard
              :month="month"
              :currency="house.currency"
              :headline="headline"
              :action="heroAction"
              :next-bill="nextBill"
              :is-settling="isSettling"
              :is-balance-loading="isBalanceLoading"
              :is-balance-available="houseBalance !== null"
              @settle="markSettlementComplete"
            />
            <DashboardStatusLine :items="attention" />
            <HouseBillsPreview :bills="upcomingBills" />
          </div>
          <div class="dash-side">
            <LazyBulletinBoard
              :notes="notes"
              :current-house="house"
              @create-note="handleCreateNote"
              @delete-note="handleDeleteNote"
            />
            <DashboardActivityFeed
              :payments="recentPayments"
              :current-user-id="currentUserId"
              :currency="house.currency"
            />
          </div>
        </div>
      </div>
    </template>
  </ClientOnly>

  <!-- No `v-if` alongside `:show` — see the note in pages/expenses/index.vue:
       an outer v-if skips both the enter and leave animations. -->
  <LazyHouseModal
    :show="showCreateHouse"
    @close="showCreateHouse = false"
    @submit="handleCreateHouse"
  />
</template>
