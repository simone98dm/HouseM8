/**
 * Global type declarations for test mocks
 * Extends the global namespace with Nuxt auto-imports and composables
 */

import type { Mock } from 'vitest';

declare global {
  // Nuxt auto-imports
  var defineProps: Mock;
  var defineEmits: Mock;
  var useI18n: Mock;
  var useRoute: Mock;
  var useRouter: Mock;
  var navigateTo: Mock;
  var resolveComponent: Mock;

  // App stores
  var useUserStore: Mock;

  // App composables
  var useApi: Mock;
  var useCurrency: Mock;
}

export {};
