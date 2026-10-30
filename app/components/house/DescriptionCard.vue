<script lang="ts" setup>
/**
 * HouseDescriptionCard - "About this house": free text the owner writes for
 * housemates, edited in place. Line breaks are kept when reading.
 */
interface HouseDescriptionCardProps {
  description?: string | null;
  isOwner?: boolean;
  error?: string;
  /** Resolves true when saved; the form then closes. */
  save: (description: string | null) => Promise<boolean>;
}

const {
  description = null,
  isOwner = false,
  error = '',
  save,
} = defineProps<HouseDescriptionCardProps>();

const MAX_LENGTH = 1000;

const { t } = useI18n();
const draft = ref('');

const {
  editing,
  saving,
  submitted,
  editButton,
  formRoot,
  start,
  stop,
  submit,
} = useHouseInlineEdit(() => save(draft.value.trim() || null));

const startEdit = () => {
  draft.value = description ?? '';
  return start();
};

const headingId = useId();
</script>

<template>
  <UiCard as="section" :aria-labelledby="headingId">
    <template #header>
      <h2 :id="headingId" class="min-w-0 text-base font-semibold text-fg">
        {{ t('houseProfile.about.title') }}
      </h2>
    </template>
    <template v-if="isOwner && !editing" #actions>
      <UiButton
        ref="editButton"
        variant="secondary"
        size="sm"
        icon="pencil"
        :aria-describedby="headingId"
        @click="startEdit"
      >
        {{ t('houseProfile.edit') }}
      </UiButton>
    </template>

    <form
      v-if="editing"
      ref="formRoot"
      class="space-y-4"
      novalidate
      @submit.prevent="submit"
    >
      <p v-if="error && submitted" class="text-sm text-danger-fg" role="alert">
        {{ error }}
      </p>
      <UiInput
        v-model="draft"
        type="textarea"
        :rows="6"
        :label="t('houseProfile.about.label')"
        :hint="
          t('houseProfile.about.counter', { n: draft.length, max: MAX_LENGTH })
        "
        :error="draft.length > MAX_LENGTH"
        :maxlength="MAX_LENGTH"
      />
      <div class="flex flex-wrap justify-end gap-2">
        <UiButton type="button" variant="secondary" @click="stop">
          {{ t('common.cancel') }}
        </UiButton>
        <UiButton type="submit" :loading="saving">
          {{ t('houseProfile.save') }}
        </UiButton>
      </div>
    </form>

    <p v-else-if="description" class="text-sm whitespace-pre-line text-fg">
      {{ description }}
    </p>
    <p v-else class="text-sm text-fg-muted">
      {{ t('houseProfile.about.empty') }}
      <template v-if="isOwner">{{
        t('houseProfile.about.ownerHint')
      }}</template>
    </p>
  </UiCard>
</template>
