import type { JoinCode } from '~/types';

/**
 * The house page's join-code card: loads the current shareable code (admins
 * only), generates a new one on demand and copies it. Codes are single use
 * and expire after 24h, so "generate" is the normal way to get a fresh one.
 */
export function useHouseJoinCode(
  houseId: MaybeRefOrGetter<string | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const houses = useHouses();
  const notificationStore = useNotificationStore();

  const joinCode = ref<JoinCode | null>(null);
  const loading = ref(false);
  const generating = ref(false);
  const hasError = ref(false);

  const refresh = async () => {
    const id = toValue(houseId);
    if (!id || !toValue(enabled)) {
      joinCode.value = null;
      return;
    }
    loading.value = true;
    hasError.value = false;
    const { data, error } = await houses.getActiveInviteCode(id);
    joinCode.value = data;
    hasError.value = !!error;
    loading.value = false;
  };

  const generate = async () => {
    const id = toValue(houseId);
    if (!id || generating.value) return;
    generating.value = true;
    hasError.value = false;
    const { data, error } = await houses.generateInvitation(id);
    if (data?.code && data.code_expires_at) {
      joinCode.value = {
        code: data.code,
        code_expires_at: data.code_expires_at,
      };
    } else if (error) {
      hasError.value = true;
    }
    generating.value = false;
  };

  const copy = async () => {
    if (!joinCode.value) return;
    try {
      await navigator.clipboard.writeText(joinCode.value.code);
      notificationStore.success('houseProfile.joinCode.copied', '', {
        i18n: true,
      });
    } catch {
      notificationStore.error('houseProfile.joinCode.copyFailed', '', {
        i18n: true,
      });
    }
  };

  watch(
    () => [toValue(houseId), toValue(enabled)],
    () => refresh(),
    { immediate: true },
  );

  return { joinCode, loading, generating, hasError, refresh, generate, copy };
}
