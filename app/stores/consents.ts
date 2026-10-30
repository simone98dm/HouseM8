import { defineStore } from 'pinia';
import type { ConsentPurpose, UserConsent } from '~/types/domain/consent';

export const useConsentsStore = defineStore('consents', () => {
  const consentsApi = useConsents();
  const notificationStore = useNotificationStore();

  const consents = ref<UserConsent[]>([]);
  const isLoading = ref(false);

  const hasConsent = (purpose: ConsentPurpose) =>
    consents.value.some((c) => c.purpose === purpose);
  const hasProfileSharing = computed(() => hasConsent('profile_sharing'));

  async function loadConsents(): Promise<void> {
    isLoading.value = true;
    try {
      const data = await consentsApi.listConsents();
      if (data) consents.value = data;
    } finally {
      isLoading.value = false;
    }
  }

  async function grant(purpose: ConsentPurpose): Promise<boolean> {
    isLoading.value = true;
    try {
      const consent = await consentsApi.grantConsent(purpose);
      if (!consent) {
        notificationStore.addNotification(
          'error',
          'errors.generic',
          'errors.consentGrantFailed',
          { i18n: true },
        );
        return false;
      }
      consents.value = [
        ...consents.value.filter((c) => c.purpose !== purpose),
        consent,
      ];
      return true;
    } finally {
      isLoading.value = false;
    }
  }

  async function withdraw(purpose: ConsentPurpose): Promise<boolean> {
    isLoading.value = true;
    try {
      const ok = await consentsApi.withdrawConsent(purpose);
      if (!ok) {
        notificationStore.addNotification(
          'error',
          'errors.generic',
          'errors.consentWithdrawFailed',
          { i18n: true },
        );
        return false;
      }
      consents.value = consents.value.filter((c) => c.purpose !== purpose);
      return true;
    } finally {
      isLoading.value = false;
    }
  }

  async function acceptTerms(): Promise<boolean> {
    isLoading.value = true;
    try {
      const ok = await consentsApi.acceptTerms();
      if (!ok) {
        notificationStore.addNotification(
          'error',
          'errors.generic',
          'errors.consentAcceptFailed',
          { i18n: true },
        );
      }
      return ok;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    acceptTerms,
    consents,
    isLoading,
    hasProfileSharing,
    hasConsent,
    loadConsents,
    grant,
    withdraw,
  };
});
