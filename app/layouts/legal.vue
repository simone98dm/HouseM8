<script setup lang="ts">
defineOptions({ name: 'LegalLayout' });
useSeoMeta({ robots: 'index, follow' });
useThemeColor();

interface TocEntry {
  id: string;
  text: string;
}

const { t, locale } = useI18n();
const route = useRoute();

const LEGAL_LINKS = [
  { to: '/privacy', key: 'privacyPolicy' },
  { to: '/terms', key: 'termsOfService' },
  { to: '/cookies', key: 'cookiePolicy' },
  { to: '/accessibility', key: 'accessibility' },
] as const;

const contentRef = ref<HTMLElement | null>(null);
const toc = ref<TocEntry[]>([]);

// Built from the rendered h2s so every legal page gets anchors without
// repeating its headings (ids are added when a heading has none).
function buildToc() {
  const el = contentRef.value;
  if (!el) return;
  toc.value = Array.from(el.querySelectorAll('h2')).map((h, i) => {
    if (!h.id) h.id = `section-${i + 1}`;
    h.tabIndex = -1; // focus target for TOC links (WCAG 2.4.3)
    return { id: h.id, text: h.textContent?.trim() ?? '' };
  });
}

// The native hash jump scrolls but leaves focus on the link; move it to the
// heading so keyboard/SR users continue reading from the section.
function focusTarget(event: MouseEvent) {
  const href = (event.target as HTMLElement).closest('a')?.getAttribute('href');
  if (!href?.startsWith('#')) return;
  const target = document.getElementById(href.slice(1));
  nextTick(() => target?.focus({ preventScroll: true }));
}

onMounted(buildToc);
watch([() => route.path, locale], () => nextTick(buildToc));
</script>

<template>
  <div class="min-h-screen overflow-x-clip bg-bg text-fg">
    <PageHeader />

    <main
      id="main-content"
      tabindex="-1"
      class="mx-auto max-w-3xl focus:outline-none px-4 py-10 sm:px-6 sm:py-14 lg:px-8"
    >
      <nav
        :aria-label="t('legal.nav.label')"
        class="mb-6 flex flex-wrap gap-x-5 gap-y-1 border-b border-line pb-3 text-sm"
      >
        <NuxtLink
          v-for="link in LEGAL_LINKS"
          :key="link.to"
          :to="link.to"
          class="inline-flex min-h-6 items-center text-fg-muted underline-offset-4 hover:text-fg hover:underline aria-[current=page]:font-semibold aria-[current=page]:text-fg"
          >{{ t(`landing.footer.${link.key}`) }}</NuxtLink
        >
      </nav>

      <aside
        role="note"
        aria-labelledby="legal-draft-title"
        class="state-card state-card--warning mb-8"
      >
        <div
          class="state-card-icon-chip state-card-icon-chip--warning"
          aria-hidden="true"
        >
          <Icon name="heroicons:exclamation-triangle" class="h-4 w-4" />
        </div>
        <div>
          <p id="legal-draft-title" class="text-sm font-semibold">
            {{ t('legal.incompleteNotice.title') }}
          </p>
          <p class="mt-1 text-sm">{{ t('legal.incompleteNotice.body') }}</p>
        </div>
      </aside>

      <!-- The TOC is built from the rendered h2s after mount; reserve its
           height so the prose does not jump down when it appears (CLS). -->
      <div class="mb-10 min-h-[22rem] sm:min-h-[11rem]">
        <UiCard
          v-if="toc.length > 1"
          as="nav"
          padding="sm"
          :aria-label="t('legal.toc.title')"
          @click="focusTarget"
        >
          <p class="mb-2 text-sm font-semibold">{{ t('legal.toc.title') }}</p>
          <ol class="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2" role="list">
            <li v-for="entry in toc" :key="entry.id">
              <a
                :href="`#${entry.id}`"
                class="inline-flex min-h-6 items-center text-brand underline-offset-4 hover:underline"
                >{{ entry.text }}</a
              >
            </li>
          </ol>
        </UiCard>
      </div>

      <div
        ref="contentRef"
        class="prose max-w-[72ch] prose-headings:scroll-mt-24 prose-headings:focus:outline-none prose-headings:text-fg prose-h2:mt-10 prose-h2:text-xl prose-table:text-sm prose-th:text-left [--tw-prose-body:var(--fg)] [--tw-prose-bold:var(--fg)] [--tw-prose-bullets:var(--fg-muted)] [--tw-prose-captions:var(--fg-muted)] [--tw-prose-counters:var(--fg-muted)] [--tw-prose-headings:var(--fg)] [--tw-prose-links:var(--primary)] [--tw-prose-quotes:var(--fg)] [--tw-prose-quote-borders:var(--border-strong)] [--tw-prose-hr:var(--border)] [--tw-prose-lead:var(--fg-muted)] [--tw-prose-code:var(--fg)] prose-a:underline-offset-4 [--tw-prose-td-borders:var(--border)] [--tw-prose-th-borders:var(--border-strong)]"
      >
        <slot />
      </div>
    </main>

    <PageFooter />
  </div>
</template>
