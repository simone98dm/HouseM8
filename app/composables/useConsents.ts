import type { ConsentPurpose, UserConsent } from '~/types/domain/consent';

/**
 * Layer 4: API composable for the current user's consents.
 * HTTP + DTO mapping only; state and notifications live in the store.
 */
export const useConsents = () => {
  const api = useApi();
  const baseUrl = '/api/users/me/consents';

  async function listConsents(): Promise<UserConsent[] | null> {
    try {
      const response = await api.fetch<{ data: UserConsent[] }>(baseUrl);
      return response.data;
    } catch {
      return null;
    }
  }

  async function grantConsent(
    purpose: ConsentPurpose,
  ): Promise<UserConsent | null> {
    try {
      const response = await api.fetch<{ data: UserConsent }>(baseUrl, {
        method: 'POST',
        body: { purpose },
      });
      return response.data;
    } catch {
      return null;
    }
  }

  async function withdrawConsent(purpose: ConsentPurpose): Promise<boolean> {
    try {
      await api.fetch(`${baseUrl}/${purpose}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  }

  async function acceptTerms(): Promise<boolean> {
    try {
      await api.fetch('/api/users/me/accept-terms', {
        method: 'POST',
        body: {
          terms_accepted: true,
          privacy_acknowledged: true,
          age_confirmed: true,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  return { listConsents, grantConsent, withdrawConsent, acceptTerms };
};
