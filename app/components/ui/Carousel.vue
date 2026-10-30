<script setup lang="ts">
// Size justification: ONE widget whose parts share `currentIndex`, autoplay
// and keyboard state; splitting would only add prop/emit plumbing.
interface Props {
  images: string[];
  autoplay?: boolean;
  interval?: number;
  showThumbnails?: boolean;
  /** Caller-provided alt prefix; slides read "{alt} {n}". Falls back to "Image n of total". */
  alt?: string;
}

const {
  images,
  autoplay = false,
  interval = 5000,
  showThumbnails = true,
  alt = '',
} = defineProps<Props>();

const { t } = useI18n();

const currentIndex = ref(0);
const isTransitioning = ref(false);
const isFullscreen = ref(false);
let autoplayTimer: ReturnType<typeof setInterval> | null = null;

const imageLabel = (index: number) =>
  t('a11y.carousel.image', { n: index + 1, total: images.length });
const imageAlt = (index: number) =>
  alt ? `${alt} ${index + 1}` : imageLabel(index);

const goToSlide = (index: number) => {
  if (isTransitioning.value) return;
  isTransitioning.value = true;
  currentIndex.value = index;
  setTimeout(() => {
    isTransitioning.value = false;
  }, 300);

  resetAutoplay();
};

const nextSlide = () => {
  const next = (currentIndex.value + 1) % images.length;
  goToSlide(next);
};

const prevSlide = () => {
  const prev = (currentIndex.value - 1 + images.length) % images.length;
  goToSlide(prev);
};

const startAutoplay = () => {
  if (!autoplay || images.length <= 1) return;
  autoplayTimer = setInterval(() => {
    nextSlide();
  }, interval);
};

const stopAutoplay = () => {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
};

const resetAutoplay = () => {
  stopAutoplay();
  startAutoplay();
};

const openFullscreen = () => {
  isFullscreen.value = true;
};

const closeFullscreen = () => {
  isFullscreen.value = false;
};

// Used in both the inline view and the fullscreen modal (focus is inside).
const handleKeydown = (event: KeyboardEvent) => {
  if (images.length <= 1) return;
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    prevSlide();
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    nextSlide();
  }
};

onMounted(() => {
  if (autoplay) startAutoplay();
});

onUnmounted(stopAutoplay);

watch(
  () => autoplay,
  (newValue) => {
    if (newValue) {
      startAutoplay();
    } else {
      stopAutoplay();
    }
  },
);
</script>

<template>
  <div
    class="relative w-full"
    role="group"
    aria-roledescription="carousel"
    @keydown="handleKeydown"
  >
    <div
      class="relative aspect-[4/3] overflow-hidden rounded-card bg-surface-hover"
    >
      <TransitionGroup name="carousel" tag="div" class="relative h-full w-full">
        <div
          v-for="(image, index) in images"
          v-show="index === currentIndex"
          :key="image"
          class="absolute inset-0"
        >
          <button
            type="button"
            class="block size-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
            :aria-label="$t('a11y.carousel.open')"
            @click="openFullscreen"
          >
            <NuxtImg
              :src="image"
              :alt="imageAlt(index)"
              class="h-full w-full object-cover"
            />
          </button>
        </div>
      </TransitionGroup>

      <!-- Raw: bespoke circular icon overlay positioned over the image. -->
      <template v-if="images.length > 1">
        <button
          type="button"
          class="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface-raised text-fg transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          :aria-label="$t('a11y.carousel.previous')"
          @click="prevSlide"
        >
          <Icon
            name="heroicons:chevron-left"
            class="size-5"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface-raised text-fg transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          :aria-label="$t('a11y.carousel.next')"
          @click="nextSlide"
        >
          <Icon
            name="heroicons:chevron-right"
            class="size-5"
            aria-hidden="true"
          />
        </button>
      </template>

      <div
        v-if="images.length > 1"
        class="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-line bg-surface-raised px-3 py-1 text-xs font-medium text-fg"
        aria-hidden="true"
      >
        {{ currentIndex + 1 }} / {{ images.length }}
      </div>
    </div>

    <div
      v-if="showThumbnails && images.length > 1"
      class="mt-3 flex gap-2 overflow-x-auto p-1"
    >
      <!-- Raw: image thumbnail, not a text/icon button. -->
      <button
        v-for="(image, index) in images"
        :key="`thumb-${index}`"
        type="button"
        class="relative size-16 shrink-0 overflow-hidden rounded-control border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        :class="
          index === currentIndex
            ? 'border-brand'
            : 'border-line hover:border-line-strong'
        "
        :aria-label="imageLabel(index)"
        :aria-current="index === currentIndex ? 'true' : undefined"
        @click="goToSlide(index)"
      >
        <NuxtImg :src="image" alt="" class="h-full w-full object-cover" />
      </button>
    </div>

    <div
      v-if="!showThumbnails && images.length > 1"
      class="mt-3 flex justify-center gap-1"
    >
      <!-- Raw: indicator dot; the 24px button is the target, the span the dot. -->
      <button
        v-for="(_, index) in images"
        :key="`dot-${index}`"
        type="button"
        class="flex size-6 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        :aria-label="imageLabel(index)"
        :aria-current="index === currentIndex ? 'true' : undefined"
        @click="goToSlide(index)"
      >
        <span
          class="size-2 rounded-full transition-colors"
          :class="index === currentIndex ? 'bg-brand' : 'bg-line-strong'"
        />
      </button>
    </div>

    <UiModal
      :show="isFullscreen"
      :title="imageLabel(currentIndex)"
      max-width="max-w-5xl"
      @close="closeFullscreen"
      @keydown="handleKeydown"
    >
      <div class="relative flex items-center justify-center">
        <NuxtImg
          :src="images[currentIndex]"
          :alt="imageAlt(currentIndex)"
          class="max-h-[70vh] max-w-full object-contain"
        />
        <template v-if="images.length > 1">
          <button
            type="button"
            class="absolute left-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface-raised text-fg transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            :aria-label="$t('a11y.carousel.previous')"
            @click="prevSlide"
          >
            <Icon
              name="heroicons:chevron-left"
              class="size-6"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            class="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface-raised text-fg transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            :aria-label="$t('a11y.carousel.next')"
            @click="nextSlide"
          >
            <Icon
              name="heroicons:chevron-right"
              class="size-6"
              aria-hidden="true"
            />
          </button>
        </template>
      </div>
    </UiModal>
  </div>
</template>

<style scoped>
.carousel-enter-active,
.carousel-leave-active {
  transition: opacity 180ms ease-out;
}

.carousel-enter-from,
.carousel-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .carousel-enter-active,
  .carousel-leave-active {
    transition: none;
  }
}
</style>
