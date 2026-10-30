import type { MaybeRefOrGetter } from 'vue';

export interface AppNavItem {
  path: string;
  icon: string;
  label: string;
  needHouse: boolean;
  needAuth: boolean;
}

/**
 * Shared nav-item filtering/route-matching logic for the desktop sidebar and
 * mobile bottom nav (AppNavigationSidebar.vue / AppNavigationBottomNav.vue).
 * Each caller gets its own independent computed state — nothing reactive is
 * shared across the two navigation surfaces, only the logic that builds it.
 */
export function useAppNavItems(
  hasHouse: MaybeRefOrGetter<boolean>,
  currentHouseId: MaybeRefOrGetter<string>,
) {
  const route = useRoute();
  const { t } = useI18n();
  const userStore = useUserStore();

  // computed so labels follow the active locale (t() reads it reactively).
  const mainNavItems = computed<AppNavItem[]>(() => [
    {
      path: '/dashboard',
      icon: 'heroicons:rectangle-group',
      label: t('navigation.home'),
      needHouse: false,
      needAuth: true,
    },
    {
      path: '/expenses',
      icon: 'heroicons:credit-card',
      label: t('navigation.expenses'),
      needHouse: true,
      needAuth: true,
    },
    {
      path: '/bills',
      icon: 'heroicons:document-text',
      label: t('navigation.bills'),
      needHouse: true,
      needAuth: true,
    },
    {
      path: '/balance',
      icon: 'heroicons:wallet',
      label: t('navigation.balance'),
      needHouse: true,
      needAuth: true,
    },
  ]);

  const secondaryNavItems = computed<AppNavItem[]>(() => [
    {
      path: '/reports',
      icon: 'heroicons:wrench-screwdriver',
      label: t('navigation.reports'),
      needHouse: true,
      needAuth: true,
    },
    {
      path: '/house/:id',
      icon: 'heroicons:home',
      label: t('navigation.house'),
      needHouse: true,
      needAuth: true,
    },
  ]);

  const filterItems = (items: AppNavItem[]) =>
    items.filter((item) => {
      if (item.needAuth && !userStore.isAuthenticated) return false;
      if (item.needHouse && !toValue(hasHouse)) return false;
      return true;
    });

  /** The four bottom-nav / sidebar destinations. */
  const primaryItems = computed(() => filterItems(mainNavItems.value));
  /** Destinations that live in the mobile "More" sheet. */
  const secondaryItems = computed(() => filterItems(secondaryNavItems.value));

  // Segment-aware prefix match: /house matches /house/1, not /houses.
  const isActive = (path: string) => {
    const normalized = path.replace('/:id', '');
    return route.path === normalized || route.path.startsWith(`${normalized}/`);
  };

  const resolvedPath = (path: string) =>
    path.replace(':id', toValue(currentHouseId) || '');

  /** Own profile only: /user/<me>, never another member's profile. */
  const profilePath = computed(() =>
    userStore.isAuthenticated && userStore.currentUser
      ? `/user/${userStore.currentUser.id}`
      : null,
  );
  const isProfileActive = computed(
    () => profilePath.value !== null && isActive(profilePath.value),
  );

  return {
    primaryItems,
    secondaryItems,
    profilePath,
    isProfileActive,
    isActive,
    resolvedPath,
  };
}
