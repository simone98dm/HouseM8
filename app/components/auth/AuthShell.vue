<script lang="ts" setup>
// The one home of the auth chrome (logo, card, headings, alerts, divider) so
// login / register / confirm / forgot / reset stay identical. The stylesheet is
// one cohesive surface, which is why it lives here and not in the pages.
interface Props {
  cardMaxWidth?: number;
  cardPaddingBottom?: number;
}

const { cardMaxWidth = 420, cardPaddingBottom = 32 } = defineProps<Props>();

const cardStyle = computed(() => ({
  '--auth-card-max-width': `${cardMaxWidth}px`,
  '--auth-card-pb': `${cardPaddingBottom}px`,
}));

const slots = useSlots();
const hasFooterLink = computed(() => !!slots['footer-link']);

// "Joining {house}" when the visitor arrived from an invite link. The name is
// read from sessionStorage (set by the join page from the public preview),
// never from the URL, and only after mount so SSR and hydration agree.
const route = useRoute();
const joinHouseName = ref('');
onMounted(() => {
  if (!isJoinRedirect(route.query.redirect)) return;
  try {
    joinHouseName.value = sessionStorage.getItem(JOIN_HOUSE_NAME_KEY) ?? '';
  } catch {
    joinHouseName.value = '';
  }
});
</script>

<template>
  <div class="auth-bg">
    <a
      href="#auth-main"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[var(--z-toast)] focus:rounded-control focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-fg focus:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {{ $t('common.skipToContent') }}
    </a>
    <main id="auth-main" tabindex="-1" class="auth-main">
      <div class="auth-card" :style="cardStyle">
        <NuxtLink to="/" class="auth-logo" :aria-label="$t('app.name')">
          <span
            class="flex size-10 items-center justify-center rounded-control bg-brand text-brand-on"
          >
            <Icon
              name="heroicons:home-modern"
              class="size-5"
              aria-hidden="true"
            />
          </span>
          <span class="auth-logo-text">House M8</span>
        </NuxtLink>

        <p v-if="joinHouseName" class="auth-context">
          {{ $t('auth.joiningHouse', { house: joinHouseName }) }}
        </p>

        <slot />

        <p v-if="hasFooterLink" class="auth-altlink">
          <slot name="footer-link" />
        </p>
      </div>
    </main>

    <!-- Legal links only: the layer's <AppFooter> credit belongs to the
         marketing pages. A sibling of <main>, so the footer landmark stays
         reachable. -->
    <LegalLinks class="py-2" />
  </div>
</template>

<style scoped>
.auth-bg {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  background: var(--bg);
}

.auth-altlink {
  text-align: center;
  margin-top: 22px;
  font-size: var(--fs-base);
  color: var(--fg-muted);
}
.auth-altlink :deep(a) {
  color: var(--primary);
  font-weight: 500;
}

.auth-main {
  width: 100%;
  outline: none;
  display: flex;
  justify-content: center;
  /* Direct flex child of .auth-bg: these auto block margins absorb the free
     space along .auth-bg's column main axis, so the card stays optically
     centred while AppFooter (a sibling below, see template) lands on the
     bottom edge instead of below the fold. `justify-content: center` alone
     cannot do both at once, and the margin trick only works one level up
     from .auth-bg — hence living on .auth-main rather than .auth-card. */
  margin: auto 0;
}

.auth-card {
  width: 100%;
  max-width: var(--auth-card-max-width, 420px);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 36px 32px var(--auth-card-pb, 32px);
  box-shadow: var(--shadow-lg);
}

.auth-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
  text-decoration: none;
}
.auth-logo:hover {
  text-decoration: none;
}

.auth-logo-text {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--fg);
}

.auth-context {
  margin-bottom: 16px;
  padding: 8px 12px;
  border-radius: var(--radius-control);
  background: var(--primary-subtle);
  color: var(--fg);
  font-size: var(--fs-md);
}

/* The following rules style markup that pages provide through the default
   slot (headings, alerts, forms), not markup this component renders itself,
   so :deep() is required to reach across the slot boundary. */
:deep(.auth-heading) {
  font-size: var(--text-2xl, 1.5rem);
  font-weight: 700;
  color: var(--fg);
  margin-bottom: 5px;
  line-height: 1.2;
}

:deep(.auth-sub) {
  font-size: var(--fs-md);
  color: var(--fg-muted);
  margin-bottom: 24px;
  line-height: 1.5;
}

:deep(.auth-note) {
  font-size: var(--fs-base);
  margin: -8px 0 0;
}

:deep(.auth-form) {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

:deep(.auth-divider) {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--fg-muted);
  font-size: var(--fs-base);
  font-weight: 500;
}
:deep(.auth-divider::before),
:deep(.auth-divider::after) {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

/* The only raw control left in the auth pages: a branded OAuth button that is
   deliberately off UiButton's scale (flat surface, no gradient, no pill). */
:deep(.btn-google) {
  width: 100%;
  /* Same height as the lg primary button above it (min-h-12). */
  min-height: 48px;
  padding: 10px 16px;
  background: var(--surface-raised);
  /* A control boundary, so it needs 3:1 (DESIGN.md §2). */
  border: 1px solid var(--border-control);
  border-radius: var(--radius-control);
  font-size: var(--fs-md);
  font-weight: 500;
  color: var(--fg);
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition:
    background var(--transition),
    border-color var(--transition);
}
:deep(.btn-google:hover) {
  background: var(--surface-hover);
}
:deep(.btn-google:disabled) {
  background: var(--surface-hover);
  color: var(--fg-muted);
  cursor: not-allowed;
}
:deep(.btn-google:focus-visible) {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
:deep(.auth-alert) {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-control);
  font-size: var(--fs-base);
  margin-bottom: 16px;
}
:deep(.auth-alert-success) {
  background: var(--success-subtle);
  color: var(--success-fg);
  border: 1px solid color-mix(in srgb, var(--success) 20%, transparent);
}
:deep(.auth-alert-error) {
  background: var(--danger-subtle);
  color: var(--danger-fg);
  border: 1px solid color-mix(in srgb, var(--danger) 20%, transparent);
}

@media (max-width: 640px) {
  /* DESIGN.md §7b: 16px page gutter on phones. */
  .auth-bg {
    padding: 16px;
  }
  .auth-card {
    padding: 28px 20px 24px;
  }
}
</style>

<style>
/* Plain (unscoped) on purpose: `.auth-spinner` is rendered inside each page's
   slotted content, and Vue's scoped-CSS keyframe renaming is file-local, so a
   scoped @keyframes here would not reliably resolve across the slot/component
   boundary. The class name is app-specific enough that global scope is safe
   (verified: no other component in app/ uses it). */
.auth-spinner {
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
