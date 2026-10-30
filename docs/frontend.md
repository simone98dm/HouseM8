# Frontend Architecture

The frontend is a **Nuxt 4 / Vue 3.5** application using the Composition API throughout. Routing is file-based, state lives in Pinia stores, and every HTTP call goes through a single enhanced fetch client.

---

## Directory Structure

```
app/
├── assets/css/main.scss      # Sass entry (@use-only) → partials + Tailwind
├── components/               # Dumb UI components (grouped by domain)
│   ├── balance/
│   ├── bill/
│   ├── bulletin/
│   ├── dashboard/
│   ├── expense/
│   ├── house/
│   ├── report/
│   ├── ui/                   # Generic: Button, Modal, Badge, etc.
│   └── user/
├── composables/
│   ├── useApi.ts             # Thin wrapper around enhancedFetch()
│   ├── useExpensesApi.ts     # Domain API composables
│   ├── useBillsApi.ts
│   ├── useHousesApi.ts
│   ├── useBalance.ts
│   ├── useReportsApi.ts
│   ├── useCurrency.ts        # Currency formatting
│   ├── useCountUp.ts         # Animated counter
│   ├── useUndoToast.ts       # Shared 10s undo toast for money actions
│   ├── useHouseSummary.ts    # One-sentence House page summary
│   ├── useErrorMessage.ts    # Maps error codes to i18n keys
│   └── ...
├── layouts/
│   ├── default.vue           # Authenticated shell (nav + header)
│   └── auth.vue              # Unauthenticated shell
├── middleware/
│   └── auth.ts               # Redirects unauthenticated users
├── pages/
│   ├── index.vue             # Landing page
│   ├── dashboard.vue
│   ├── auth/                 # login, register, confirm
│   ├── balance/
│   ├── bills/
│   ├── expenses/
│   ├── house/
│   ├── reports/
│   ├── settings/             # profile + subscription
│   └── user/
├── plugins/
│   └── api.client.ts         # Registers enhancedFetch() globally
└── stores/
    ├── base.ts               # Shared store utilities
    ├── bills.ts
    ├── bulletinNotes.ts
    ├── expenses.ts
    ├── houses.ts
    ├── notifications.ts
    ├── reports.ts
    ├── subscription.ts
    └── user.ts
```

---

## Layer Responsibilities

### Layer 1 — Components

Components are **dumb**: they accept props and emit events. No direct store access, no API calls.

```vue
<!-- app/components/expense/ExpenseCard.vue -->
<script setup lang="ts">
interface Props {
  expense: Expense;
  currentUserId: string;
}
interface Events {
  pay: [shareId: string];
  delete: [expenseId: string];
}
const { expense, currentUserId } = defineProps<Props>();
const emit = defineEmits<Events>();
</script>
```

Props use **destructuring with inline defaults** — never `withDefaults()`. Emits use Nuxt 4 **tuple style**.

### Layer 2 — Pages

Pages own route-level state and orchestrate stores. They call store actions and pass results as props to components.

```vue
<!-- app/pages/expenses/index.vue (simplified) -->
<script setup lang="ts">
const expensesStore = useExpensesStore();
const housesStore = useHousesStore();
onMounted(() => expensesStore.initialize());

async function handleCreate(data: CreateExpensePayload) {
  const ok = await expensesStore.createExpense(data);
  if (ok) showModal.value = false;
}
</script>
```

### Layer 3 — Pinia Stores

Stores hold reactive state, perform client-side validation, and call API composables. They are the only place that triggers notifications.

```typescript
// app/stores/expenses.ts (simplified)
export const useExpensesStore = defineStore('expenses', () => {
  const expenses = ref<Expense[]>([]);
  const isLoading = ref(false);

  // Computed
  const unpaidExpenses = computed(() =>
    expenses.value.filter(e => e.shares?.some(s => s.user_id === userId && !s.is_paid))
  );

  // Action with business logic
  async function createExpense(data): Promise<boolean> {
    if (data.total_amount <= 0) {
      notificationStore.addNotification('error', ...);
      return false;
    }
    const result = await expensesApi.createExpense(payload);
    if (result) {
      expenses.value.unshift(result);   // optimistic update
      notificationStore.addNotification('success', ...);
      return true;
    }
    return false;
  }

  // Initialize only if needed
  async function initialize(forceRefresh = false) {
    if (forceRefresh || expenses.value.length === 0) await loadHouseExpenses();
  }
});
```

**Lazy initialization** — every store exposes `initialize(forceRefresh?)`. The page calls this on mount; data loads only once unless forced. This prevents redundant network requests when navigating between pages.

### Layer 4 — API Composables

Pure HTTP layer. Maps server responses to typed domain objects. No state, no notifications.

```typescript
// app/composables/useExpensesApi.ts (simplified)
export const useExpensesApi = () => {
  const api = useApi();

  async function createExpense(input: CreateExpensePayload): Promise<Expense | null> {
    try {
      return await api.fetch<Expense>('/api/expenses', { method: 'POST', body: input }, false);
    } catch {
      return null;   // errors handled by enhancedFetch (toasts for 403/5xx)
    }
  }

  return { createExpense, ... };
};
```

---

## API Client — `enhancedFetch()`

Defined in `app/plugins/api.client.ts` and registered globally via `nuxtApp.$fetch`. All composables use this.

Features:

- **Retry with exponential backoff** — 2 retries for network errors, 408, 429, 5xx.
- **Automatic token refresh** — on 401, calls `POST /api/auth/refresh` and retries the original request once.
- **Auth logout** — if refresh fails, resets user store and navigates to `/auth/login`.
- **Known error toasts** — 403 → "Access denied" notification; 5xx → "Server error" notification.
- **Dev logging** — logs errors with status, method, URL, and timestamp in development only.

```
Request
  → retryWithBackoff(2 attempts, 1s/2s delay)
     → on 401: POST /api/auth/refresh → retry original
     → on failure: sign out
     → on 403/5xx: show notification toast
```

---

## State Initialization Pattern

`app/composables/useInitializeStores.ts` is called once from the default layout on mount. It initializes all stores in dependency order:

```
1. userStore.initialize()       — current user profile
2. housesStore.initialize()     — user's houses + current house
3. expensesStore.initialize()   — expenses for current house
4. billsStore.initialize()      — bills
5. bulletinNotesStore.initialize()
```

Each store skips fetching if data is already loaded (`data.length > 0`), so navigation between pages is instant after the first load.

---

## Internationalization

All user-facing strings use `t('key')` from `@nuxtjs/i18n`. Locale files are at:

- `i18n/locales/en.json`
- `i18n/locales/it.json`

The language is detected from the browser and stored in the `i18n_locale` cookie. Users can switch via the language selector in settings.

**No hardcoded strings anywhere** — this is a lint rule enforced by ESLint.

---

## Dark Mode

`@nuxtjs/color-mode` with `classSuffix: ''` and `darkMode: 'class'`. Adding the `dark` class to `<html>` enables all `dark:` Tailwind variants. Preference defaults to the OS setting and is stored in a cookie.

---

## Styling

- **Tailwind CSS 3.x** — utility classes, `@tailwindcss/forms`, `@tailwindcss/typography`
- **Design system** defined in `DESIGN.md` (Kinetic Gallery) — color tokens, typography scale, elevation, motion
- **Font** — Plus Jakarta Sans via `@nuxt/fonts`
- **Icons** — `@nuxt/icon` with Heroicons, MDI, Logos and Phosphor (`ph`, duotone category icons) icon sets; categories are defined in `shared/constants/categories.ts` with colour tokens in `tokens.css`
- **Page band** — per-page pattern band from `app/assets/css/components/page-band.css`, applied by `app/layouts/default.vue`
- **Type** — 12px font floor; no uppercase labels

Component-level custom styles go in `<style scoped>` using `@apply` sparingly. Prefer Tailwind classes directly in templates.

---

## Key Frontend Flows

### Create Expense

```
1. User opens the Add modal (component)
2. Fills description, amount, confirms the guessed category; "Paid by you · split with everyone" can be edited. No due date for one-offs
3. Clicks submit → page handler calls expensesStore.createExpense()
4. Store validates: amount > 0, at least 1 user selected
5. Store calls expensesApi.createExpense(payload)
6. API composable: POST /api/expenses
7. On success: store unshifts new expense into state, shows toast
8. Modal closes, list re-renders reactively
```

### Create Bill

```
1. User opens the Add modal and switches on "Does it repeat?" (title becomes "Add bill")
2. Fills description, cost, payment period, next due date; input is kept if create fails and reset on close
3. billsStore.createBill() → validates, calls billsApi.createBill()
4. POST /api/bills → Zod validation → ensureHouseMember → repos.bills.create()
5. Store pushes new bill into state
```

### Balance View

```
1. Balance page mounts → calls balanceStore or useBalance composable
2. GET /api/balance/[house_id]
3. Server computes net balances in SQL (CTEs in PostgresBalanceRepository)
4. Response includes user_balances[] and settlement_transactions[]
5. you↔them rows show who owes what (second-person copy)
6. Debtor settles, or creditor taps "Mark as received" → settle endpoint; no confirm modal, a 10s undo toast reverses it (toasts pause on hover/focus). Per-expense pay back uses the same flow via `markShareAsPaid`
```

### PDF Report Export

```
1. User navigates to /reports → selects date range
2. POST /api/reports → creates report record
3. User can attach images: POST /api/reports/[id]/images (multipart)
4. Client uses pdf-lib to generate and download PDF in-browser
   (report data fetched, images embedded as base64)
```

---

## Testing

| Layer                 | Tool                    | Command                 |
| --------------------- | ----------------------- | ----------------------- |
| Components            | Vitest + Vue Test Utils | `yarn test:unit`        |
| Pages (integration)   | Vitest                  | `yarn test:integration` |
| API endpoints + repos | Vitest                  | `yarn test:api`         |
| E2E                   | Cypress                 | `yarn test:e2e`         |

Test files live alongside source with `__tests__/` subdirectories. API tests use a real PostgreSQL test database (not mocks) — this is intentional to catch query-level bugs.
