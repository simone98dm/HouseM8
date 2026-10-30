import { defineStore } from 'pinia';
import type { BulletinNote, CreateBulletinNotePayload } from '~/types';

/**
 * Layer 3: Bulletin Notes Store
 *
 * Responsibilities:
 * - State management (reactive data)
 * - Business logic and validation
 * - Data manipulation and transformation
 * - Computed properties (derived state)
 * - Call Layer 4 composables for API operations
 * - Handle notifications (success/error)
 */
export const useBulletinNotesStore = defineStore('bulletinNotes', () => {
  const bulletinNotesApi = useBulletinNotesApi();
  const housesStore = useHousesStore();
  const notificationStore = useNotificationStore();

  const notes = ref<BulletinNote[]>([]);

  const activeNotes = computed(() => {
    const now = new Date();
    return notes.value.filter((note) => {
      if (!note.dismiss_date) return true;
      const dismissDate = new Date(note.dismiss_date);
      return dismissDate >= now;
    });
  });

  const upcomingDismissals = computed(() => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return notes.value.filter((note) => {
      if (!note.dismiss_date) return false;
      const dismissDate = new Date(note.dismiss_date);
      return dismissDate >= now && dismissDate <= nextWeek;
    });
  });

  /**
   * Load notes for current house
   */
  async function loadHouseNotes(houseId?: string): Promise<void> {
    const targetHouseId = houseId || housesStore.currentHouse?.id;
    if (!targetHouseId) {
      notificationStore.addNotification(
        'error',
        'errors.generic',
        'errors.noHouseSelected',
        { i18n: true },
      );
      return;
    }

    const fetchedNotes = await bulletinNotesApi.getHouseNotes(targetHouseId);

    if (fetchedNotes) {
      notes.value = fetchedNotes;
    } else {
      notificationStore.addNotification(
        'error',
        'errors.generic',
        'errors.failedToLoad',
        { i18n: true },
      );
    }
  }

  /**
   * Create a new note
   * Business logic: validation, state updates, notifications
   */
  async function createNote(
    houseId: string,
    payload: CreateBulletinNotePayload,
  ): Promise<BulletinNote | null> {
    // Business logic: validation
    if (!payload.message || payload.message.trim().length === 0) {
      notificationStore.addNotification(
        'error',
        'errors.validation',
        'bulletin.modal.messagePlaceholder',
        { i18n: true },
      );
      return null;
    }

    const newNote = await bulletinNotesApi.createNote(houseId, payload);

    if (newNote) {
      // Business logic: add to state at beginning
      notes.value.unshift(newNote);
      notificationStore.addNotification(
        'success',
        'common.success',
        'success.bulletinNoteCreated',
        { i18n: true },
      );
      return newNote;
    }

    notificationStore.addNotification(
      'error',
      'errors.generic',
      'errors.failedToCreateNote',
      { i18n: true },
    );
    return null;
  }

  /**
   * Delete a note
   */
  async function deleteNote(noteId: string): Promise<boolean> {
    const success = await bulletinNotesApi.deleteNote(noteId);

    if (success) {
      // Business logic: remove from state
      notes.value = notes.value.filter((note) => note.id !== noteId);
      notificationStore.addNotification(
        'success',
        'common.success',
        'success.bulletinNoteDeleted',
        { i18n: true },
      );
      return true;
    }

    notificationStore.addNotification(
      'error',
      'errors.generic',
      'errors.failedToDeleteNote',
      { i18n: true },
    );
    return false;
  }

  /**
   * Cleanup expired notes
   */
  async function cleanupExpiredNotes(): Promise<void> {
    const success = await bulletinNotesApi.cleanupExpiredNotes();

    if (success) {
      // Reload notes after cleanup
      await loadHouseNotes();
    }
    // Silent failure for cleanup
  }

  /**
   * Reset store to initial state
   */
  function $reset(): void {
    notes.value = [];
  }

  return {
    notes,

    activeNotes,
    upcomingDismissals,

    loadHouseNotes,
    createNote,
    deleteNote,
    cleanupExpiredNotes,
    $reset,
  };
});
