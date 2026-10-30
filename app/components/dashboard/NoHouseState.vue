<script lang="ts" setup>
/**
 * DashboardNoHouseState — Shown on the dashboard when the user has no house.
 * Create one, or paste an invite link (or its token) to open the join page.
 */

interface NoHouseStateEmits {
  create: [];
  join: [token: string];
}

const emit = defineEmits<NoHouseStateEmits>();

const { t } = useI18n();

const invite = ref('');
const inviteError = ref('');

// Validate on submit, not on every keystroke.
const submitInvite = () => {
  const token = extractInviteToken(invite.value);
  if (!token) {
    inviteError.value = t('home.inviteInvalid');
    return;
  }
  inviteError.value = '';
  emit('join', token);
};
</script>

<template>
  <UiCard padding="lg" class="text-center">
    <div
      class="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-subtle"
    >
      <Icon
        name="heroicons:home"
        class="w-8 h-8 text-brand"
        aria-hidden="true"
      />
    </div>

    <h2 class="text-lg font-bold text-fg">
      {{ t('home.noHouseFound') }}
    </h2>
    <p class="text-sm text-fg-muted">
      {{ t('home.createOrJoinHouse') }}
    </p>

    <div class="flex justify-center">
      <UiButton icon="plus" @click="emit('create')">
        {{ t('home.createHouse') }}
      </UiButton>
    </div>

    <form
      class="mx-auto mt-6 flex max-w-md flex-col gap-3 border-t border-line pt-6 text-left"
      novalidate
      @submit.prevent="submitInvite"
    >
      <UiInput
        v-model="invite"
        :label="t('home.haveInviteLink')"
        :hint="inviteError || t('home.inviteLinkHint')"
        :error="Boolean(inviteError)"
      />
      <UiButton type="submit" variant="secondary">
        {{ t('home.joinHouse') }}
      </UiButton>
    </form>
  </UiCard>
</template>
