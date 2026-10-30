<script lang="ts" setup>
import type { Bill } from '~/types';

interface Props {
  bill: Bill;
}

const { bill } = defineProps<Props>();

const { t: $t } = useI18n();
const {
  formatDate,
  getContractDuration,
  getTotalPayments,
  getTotalAmountPaid,
} = useBillDetails();
</script>

<template>
  <UiCard>
    <template #header>
      <h3 class="text-base font-semibold text-fg">
        {{ $t('bills.details.contractDetails') }}
      </h3>
    </template>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="space-y-5">
        <div>
          <p class="text-xs font-medium text-fg-muted mb-1">
            {{ $t('bills.details.contractStarted') }}
          </p>
          <div class="flex items-center gap-2">
            <Icon
              name="heroicons:play-circle"
              class="w-5 h-5 text-ok-fg"
              aria-hidden="true"
            />
            <span class="text-sm text-fg">
              {{ formatDate(bill.created_at) }}
            </span>
          </div>
          <p class="text-xs text-fg-muted mt-0.5">
            {{
              $t('bills.details.ago', {
                time: getContractDuration(bill.created_at),
              })
            }}
          </p>
        </div>

        <div>
          <p class="text-xs font-medium text-fg-muted mb-1">
            {{ $t('bills.details.createdBy') }}
          </p>
          <div class="flex items-center gap-3">
            <UiUserAvatar :user="bill.creator" size="sm" />
            <div>
              <NuxtLink
                v-if="bill.creator?.id"
                :to="`/user/${bill.creator.id}`"
                class="text-sm font-semibold text-fg hover:text-brand transition-colors"
              >
                {{ bill.creator.first_name }} {{ bill.creator.last_name }}
              </NuxtLink>
              <p class="text-xs text-fg-muted">
                {{ $t('bills.details.billManager') }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <p class="text-xs font-medium text-fg-muted mb-2">
          {{ $t('bills.details.contractHistory') }}
        </p>

        <div class="divide-y divide-line">
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-fg-muted">
              {{ $t('bills.details.totalPayments') }}
            </span>
            <span class="text-sm font-semibold text-fg">
              {{ getTotalPayments(bill.created_at) }}
            </span>
          </div>
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-fg-muted">
              {{ $t('bills.details.totalAmountPaid') }}
            </span>
            <UiCurrency
              class="text-numeric text-sm text-ok-fg"
              :amount="getTotalAmountPaid(bill.created_at, bill.monthly_cost)"
              :currency-code="bill.currency"
            />
          </div>
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-fg-muted">
              {{ $t('bills.details.lastUpdated') }}
            </span>
            <span class="text-sm font-semibold text-fg">
              {{ formatDate(bill.updated_at) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </UiCard>
</template>
