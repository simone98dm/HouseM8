import type { Subscription } from '~/types';

export type PriceKey =
  'pro_monthly' | 'pro_annual' | 'house_plus_monthly' | 'house_plus_annual';

export interface PriceInfo {
  unit_amount: number;
  currency: string;
  interval: 'month' | 'year' | null;
  tax_behavior: string;
  /** VAT-inclusive amount in minor units (cents). */
  display_amount: number;
  vat_included: boolean;
  vat_rate: number;
}

export type Prices = Partial<Record<PriceKey, PriceInfo>>;

export interface WithdrawResult {
  mode: 'immediate' | 'period_end';
  access_ends_at: string | null;
}

const SUBSCRIPTION_ALREADY_ACTIVE = 'SUBSCRIPTION_ALREADY_ACTIVE';

/** Checkout refused (409): the user already has a live subscription. */
export class SubscriptionAlreadyActiveError extends Error {}

interface ApiErrorBody {
  data?: { data?: { code?: string }; code?: string };
}

const errorCode = (error: unknown): string | undefined => {
  const body = (error as ApiErrorBody)?.data;
  return body?.data?.code ?? body?.code;
};

export const useSubscriptionApi = () => {
  const api = useApi();

  const getSubscription = async (): Promise<Subscription | null> => {
    try {
      const result = await api.fetch<{ data: Subscription }>(
        '/api/stripe/subscription',
      );
      return result.data;
    } catch {
      return null;
    }
  };

  const getPrices = async (): Promise<Prices | null> => {
    try {
      const result = await api.fetch<{ data: Prices }>('/api/stripe/prices');
      return result.data;
    } catch {
      return null;
    }
  };

  const withdraw = async (): Promise<WithdrawResult | null> => {
    try {
      const result = await api.fetch<{ data: WithdrawResult }>(
        '/api/stripe/withdraw',
        { method: 'POST' },
      );
      return result.data;
    } catch {
      return null;
    }
  };

  const createCheckout = async (
    priceKey: string,
    withdrawalWaiver = false,
  ): Promise<string | null> => {
    try {
      const result = await api.fetch<{ data: { url: string } }>(
        '/api/stripe/checkout',
        {
          method: 'POST',
          body: { price_key: priceKey, withdrawal_waiver: withdrawalWaiver },
        },
      );
      return result.data.url;
    } catch (error) {
      // Only this case needs its own UI; everything else is a generic failure.
      if (errorCode(error) === SUBSCRIPTION_ALREADY_ACTIVE) {
        throw new SubscriptionAlreadyActiveError();
      }
      return null;
    }
  };

  const openPortal = async (): Promise<string | null> => {
    try {
      const result = await api.fetch<{ data: { url: string } }>(
        '/api/stripe/portal',
        {
          method: 'POST',
        },
      );
      return result.data.url;
    } catch {
      return null;
    }
  };

  return { getSubscription, getPrices, createCheckout, withdraw, openPortal };
};
