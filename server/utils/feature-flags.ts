import * as configcat from '@configcat/sdk/node';
import { consola } from 'consola';

/** ConfigCat setting keys. All are public: `/api/feature-flags` returns every one. */
export const FEATURE_FLAG_KEYS = [
  'showStripe',
  'showSignup',
  'showProfilePicture',
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

// ponytail: LazyLoad suits serverless (no background poll timer); flags can lag up to this long.
const CACHE_TTL_SECONDS = 60;

function getClient(): configcat.IConfigCatClient | null {
  const sdkKey = useRuntimeConfig().configcatSdkKey;
  if (!sdkKey) {
    consola.warn(
      '[FeatureFlags] CONFIGCAT_SDK_KEY is not set — all flags are off',
    );
    return null;
  }
  // getClient returns a cached singleton per SDK key.
  return configcat.getClient(sdkKey, configcat.PollingMode.LazyLoad, {
    cacheTimeToLiveSeconds: CACHE_TTL_SECONDS,
  });
}

/** Resolves a flag; any failure (missing key, network, unknown setting) means off. */
export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  try {
    return await client.getValueAsync(key, false);
  } catch (err) {
    consola.warn(`[FeatureFlags] Failed to read "${key}":`, err);
    return false;
  }
}

export async function getAllFeatureFlags(): Promise<
  Record<FeatureFlagKey, boolean>
> {
  const values = await Promise.all(FEATURE_FLAG_KEYS.map(isFeatureEnabled));
  return Object.fromEntries(
    FEATURE_FLAG_KEYS.map((key, i) => [key, values[i]]),
  ) as Record<FeatureFlagKey, boolean>;
}
