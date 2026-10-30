import type { House } from '~/types';

/**
 * Owns the /house/join/[token] page's invitation flow: loading the house
 * invitation from the token (signed-in users) and accepting it.
 * Extracted from [token].vue so the page's script stays focused on
 * rendering the four resulting states (loading / error / success / details).
 *
 * Known P0 (not fixed here): refreshing during the 3s post-accept redirect
 * re-queries the now-consumed token and shows "Invalid Invitation" after a
 * successful join.
 */
export function useHouseJoinFlow() {
  const { t: $t } = useI18n();
  const route = useRoute();
  const housesComposable = useHouses();
  const userStore = useUserStore();

  const token = computed(() => route.params.token as string);

  const house = ref<House | null>(null);
  const loading = ref(true);
  const accepting = ref(false);
  const error = ref('');
  const success = ref(false);
  const userInHouse = ref(false);
  let redirectTimer: ReturnType<typeof setTimeout> | null = null;

  onUnmounted(() => {
    if (redirectTimer) clearTimeout(redirectTimer);
  });

  const isAuthenticated = computed(() => !!userStore.currentUser);

  const loadHouseFromToken = async () => {
    if (!token.value) {
      error.value = $t('invitation.invalidToken');
      loading.value = false;
      return;
    }

    // Guests see the public preview only; the full invitation needs a session.
    if (!isAuthenticated.value) {
      loading.value = false;
      return;
    }

    try {
      loading.value = true;
      error.value = '';

      const result = await housesComposable.getHouseFromToken(token.value);

      if (result.error) {
        error.value = result.error;
        return;
      }

      if (result.data) {
        house.value = result.data.house;
        userInHouse.value = result.data.user_in_house;
      }
    } catch {
      error.value = $t('invitation.loadError');
    } finally {
      loading.value = false;
    }
  };

  const handleAcceptInvitation = async () => {
    if (!house.value || !userStore.currentUser || !token.value) return;

    try {
      accepting.value = true;
      error.value = '';

      const result = await housesComposable.acceptInvitation(token.value);

      if (result.error) {
        error.value = result.error;
        return;
      }

      success.value = true;

      // Show success message for 3 seconds then redirect to house page
      redirectTimer = setTimeout(() => {
        if (result.data?.house_id) {
          navigateTo(`/house/${result.data.house_id}`);
        } else {
          navigateTo('/dashboard');
        }
      }, 3000);
    } catch {
      error.value = $t('invitation.acceptError');
    } finally {
      accepting.value = false;
    }
  };

  onMounted(async () => {
    await loadHouseFromToken();
  });

  return {
    house,
    loading,
    accepting,
    error,
    success,
    userInHouse,
    isAuthenticated,
    handleAcceptInvitation,
  };
}
