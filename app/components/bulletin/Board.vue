<script lang="ts" setup>
import type { BulletinNote, House, CreateBulletinNotePayload } from '~/types';

interface BulletinBoardProps {
  notes: BulletinNote[];
  currentHouse: House | null;
}

interface BulletinBoardEmits {
  'create-note': [payload: CreateBulletinNotePayload];
  'delete-note': [noteId: string];
}

const { notes = [], currentHouse: _currentHouse = null } =
  defineProps<BulletinBoardProps>();
const emit = defineEmits<BulletinBoardEmits>();

const { t, locale } = useI18n();

const showModal = ref(false);

// Falls back rather than emitting `sticky-undefined`, which matches no rule in
// the --postit-* tokens and renders the note in the board's own background — the exact
// failure that shipped while bulletin_notes had no `color` column at all.
const stickyClass = (note: BulletinNote) => `sticky-${note.color ?? 'yellow'}`;

const formatTimeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return t('bulletin.justNow');
  const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' });
  if (hours < 24) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.floor(hours / 24), 'day');
};

// First name, else full name, else the part of the email before "@": never
// empty-string-with-a-separator ("· 2h ago").
const authorName = (note: BulletinNote) => {
  const author = note.author;
  if (!author) return '';
  return (
    author.first_name?.trim() ||
    `${author.first_name ?? ''} ${author.last_name ?? ''}`.trim() ||
    author.email?.split('@')[0] ||
    ''
  );
};

const handleCreateNote = (payload: CreateBulletinNotePayload) => {
  emit('create-note', payload);
  showModal.value = false;
};
</script>

<template>
  <div class="flex flex-col">
    <!-- Empty: one line, not a card. The modal below still serves "Add one". -->
    <p
      v-if="notes.length === 0"
      class="flex flex-wrap items-center gap-x-1 text-sm text-fg-muted"
    >
      {{ t('bulletin.noNotes') }}
      <span aria-hidden="true">·</span>
      <UiButton
        type="button"
        variant="ghost"
        size="sm"
        @click="showModal = true"
      >
        {{ t('bulletin.addOne') }}
      </UiButton>
    </p>

    <UiCard
      v-else
      class="flex-1"
      :title="t('bulletin.title')"
      :heading-level="2"
      padding="sm"
    >
      <template #actions>
        <UiButton
          type="button"
          variant="ghost"
          size="sm"
          icon="plus"
          @click="showModal = true"
        >
          {{ t('bulletin.newNote') }}
        </UiButton>
      </template>

      <!-- Fills the card body, so the board stretches when the dashboard grid
           makes the card taller than its notes (desktop: a full-height column). -->
      <div class="flex h-full flex-col">
        <div
          class="bulletin-board"
          role="region"
          :aria-label="t('bulletin.title')"
        >
          <div
            v-for="note in notes"
            :key="note.id"
            class="sticky-note"
            :class="stickyClass(note)"
          >
            <div class="note-author">
              <template v-if="authorName(note)"
                >{{ authorName(note) }} <span aria-hidden="true">·</span
                >{{ ' ' }}</template
              >{{ formatTimeAgo(note.created_at) }}
            </div>
            <div>{{ note.message }}</div>
            <UiButton
              type="button"
              variant="ghost"
              size="sm"
              class="note-delete"
              :aria-label="
                authorName(note)
                  ? t('bulletin.deleteNoteBy', { author: authorName(note) })
                  : t('bulletin.deleteNote')
              "
              @click="emit('delete-note', note.id)"
            >
              <Icon name="heroicons:x-mark" class="size-4" aria-hidden="true" />
            </UiButton>
          </div>
        </div>
      </div>
    </UiCard>

    <!-- No `v-if` alongside `:show` — see the note in pages/expenses/index.vue:
         an outer v-if skips both the enter and leave animations. -->
    <LazyBulletinModal
      :show="showModal"
      @close="showModal = false"
      @submit="handleCreateNote"
    />
  </div>
</template>

<style scoped>
/* ─── Bulletin Board ──────────────────────────────────────────
   `.sticky-*` modifiers are built at runtime from the PostItColor union
   (`sticky-${note.color}`), so every member of that union needs a rule
   here even though no template names one literally. Colours: --postit-*
   in tokens.css (contrast ratios recorded there). */
.bulletin-board {
  background: var(--postit-board);
  border-radius: var(--radius-control);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.sticky-note {
  position: relative;
  border-radius: var(--radius-control);
  padding: 12px 52px 12px 14px;
  font-size: var(--fs-base);
  line-height: 1.55;
  box-shadow: 2px 3px 8px rgba(0, 0, 0, 0.2);
}

.note-author {
  font-size: var(--fs-sm);
  font-weight: 600;
  margin-bottom: 6px;
}

/* Full-opacity ink; 44px target pinned to the corner. */
.note-delete {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 44px;
  min-height: 44px;
  color: inherit;
}

.sticky-yellow {
  background: var(--postit-yellow-bg);
  color: var(--postit-yellow-fg);
}
.sticky-blue {
  background: var(--postit-blue-bg);
  color: var(--postit-blue-fg);
}
.sticky-green {
  background: var(--postit-green-bg);
  color: var(--postit-green-fg);
}
.sticky-pink {
  background: var(--postit-pink-bg);
  color: var(--postit-pink-fg);
}
.sticky-purple {
  background: var(--postit-purple-bg);
  color: var(--postit-purple-fg);
}
</style>
