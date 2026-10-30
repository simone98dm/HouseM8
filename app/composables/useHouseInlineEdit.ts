/**
 * Inline edit state shared by the house page's sections: Edit swaps the card
 * body for a form, Save/Cancel swap it back. Focus follows (WCAG 2.2): the
 * first field on Edit, the Edit button on Save/Cancel.
 */
export function useHouseInlineEdit(
  save: (() => Promise<boolean>) | (() => boolean),
) {
  const editing = ref(false);
  const saving = ref(false);
  // A save error belongs to this edit session: hidden again on re-open.
  const submitted = ref(false);
  const editButton = ref<{ $el?: HTMLElement } | HTMLElement | null>(null);
  const formRoot = ref<HTMLElement | null>(null);

  const buttonEl = () => {
    const b = editButton.value;
    return b && '$el' in b ? b.$el : (b as HTMLElement | null);
  };

  const start = async () => {
    editing.value = true;
    submitted.value = false;
    await nextTick();
    formRoot.value
      ?.querySelector<HTMLElement>('input, textarea, select')
      ?.focus();
  };

  const stop = async () => {
    editing.value = false;
    await nextTick();
    buttonEl()?.focus();
  };

  const submit = async () => {
    if (saving.value) return;
    saving.value = true;
    submitted.value = true;
    try {
      if (await save()) await stop();
    } finally {
      saving.value = false;
    }
  };

  return {
    editing,
    saving,
    submitted,
    editButton,
    formRoot,
    start,
    stop,
    submit,
  };
}
