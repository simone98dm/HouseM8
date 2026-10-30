/**
 * Bulletin Notes Store Tests — real store with mocked dependencies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import { useBulletinNotesApi } from '~/composables/useBulletinNotesApi';
import { useHousesStore } from '~/stores/houses';
import { useNotificationStore } from '~/stores/notifications';
import { useBulletinNotesStore } from '~/stores/bulletinNotes';
import { createMockBulletinNote, createMockHouse } from '~/tests/utils';

vi.mock('~/composables/useBulletinNotesApi', () => ({
  useBulletinNotesApi: vi.fn(),
}));
vi.mock('~/stores/houses', () => ({ useHousesStore: vi.fn() }));
vi.mock('~/stores/notifications', () => ({ useNotificationStore: vi.fn() }));

describe('useBulletinNotesStore', () => {
  let mockBulletinNotesApi: {
    getHouseNotes: ReturnType<typeof vi.fn>;
    createNote: ReturnType<typeof vi.fn>;
    deleteNote: ReturnType<typeof vi.fn>;
    cleanupExpiredNotes: ReturnType<typeof vi.fn>;
  };
  let mockNotificationStore: { addNotification: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    setActivePinia(createPinia());

    mockBulletinNotesApi = {
      getHouseNotes: vi.fn(),
      createNote: vi.fn(),
      deleteNote: vi.fn(),
      cleanupExpiredNotes: vi.fn(),
    };
    mockNotificationStore = { addNotification: vi.fn() };

    vi.mocked(useBulletinNotesApi).mockReturnValue(mockBulletinNotesApi as any);
    vi.mocked(useHousesStore).mockReturnValue({
      currentHouse: createMockHouse(),
    } as any);
    vi.mocked(useNotificationStore).mockReturnValue(
      mockNotificationStore as any,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('initializes with empty notes array', () => {
      const store = useBulletinNotesStore();
      expect(store.notes).toEqual([]);
    });
  });

  describe('computed: activeNotes', () => {
    it('includes notes with no dismiss_date', async () => {
      mockBulletinNotesApi.getHouseNotes.mockResolvedValue([
        createMockBulletinNote({ id: 'n1', dismiss_date: null }),
      ]);
      const store = useBulletinNotesStore();
      await store.loadHouseNotes('house-1');
      expect(store.activeNotes).toHaveLength(1);
    });

    it('includes notes whose dismiss_date is in the future', async () => {
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      mockBulletinNotesApi.getHouseNotes.mockResolvedValue([
        createMockBulletinNote({ id: 'n1', dismiss_date: future }),
      ]);
      const store = useBulletinNotesStore();
      await store.loadHouseNotes('house-1');
      expect(store.activeNotes).toHaveLength(1);
    });

    it('excludes notes whose dismiss_date is in the past', async () => {
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      mockBulletinNotesApi.getHouseNotes.mockResolvedValue([
        createMockBulletinNote({ id: 'n1', dismiss_date: past }),
      ]);
      const store = useBulletinNotesStore();
      await store.loadHouseNotes('house-1');
      expect(store.activeNotes).toHaveLength(0);
    });
  });

  describe('computed: upcomingDismissals', () => {
    it('includes notes dismissing within 7 days', async () => {
      const inSixDays = new Date(
        Date.now() + 6 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const inEightDays = new Date(
        Date.now() + 8 * 24 * 60 * 60 * 1000,
      ).toISOString();
      mockBulletinNotesApi.getHouseNotes.mockResolvedValue([
        createMockBulletinNote({ id: 'n1', dismiss_date: inSixDays }),
        createMockBulletinNote({ id: 'n2', dismiss_date: inEightDays }),
        createMockBulletinNote({ id: 'n3', dismiss_date: null }),
      ]);
      const store = useBulletinNotesStore();
      await store.loadHouseNotes('house-1');
      expect(store.upcomingDismissals).toHaveLength(1);
      expect(store.upcomingDismissals[0]!.id).toBe('n1');
    });
  });

  describe('loadHouseNotes', () => {
    it('loads notes from API and stores them', async () => {
      const notes = [createMockBulletinNote({ id: 'n1' })];
      mockBulletinNotesApi.getHouseNotes.mockResolvedValue(notes);
      const store = useBulletinNotesStore();
      await store.loadHouseNotes('house-1');
      expect(store.notes).toEqual(notes);
    });

    it('falls back to housesStore.currentHouse.id when no arg', async () => {
      mockBulletinNotesApi.getHouseNotes.mockResolvedValue([]);
      const store = useBulletinNotesStore();
      await store.loadHouseNotes();
      expect(mockBulletinNotesApi.getHouseNotes).toHaveBeenCalledWith(
        'test-house-id',
      );
    });

    it('notifies when no house is selected', async () => {
      vi.mocked(useHousesStore).mockReturnValue({ currentHouse: null } as any);
      const store = useBulletinNotesStore();
      await store.loadHouseNotes();
      expect(mockNotificationStore.addNotification).toHaveBeenCalled();
    });

    it('notifies when API returns null', async () => {
      mockBulletinNotesApi.getHouseNotes.mockResolvedValue(null);
      const store = useBulletinNotesStore();
      await store.loadHouseNotes('house-1');
      expect(mockNotificationStore.addNotification).toHaveBeenCalled();
    });
  });

  describe('createNote', () => {
    it('creates a note and prepends it to state', async () => {
      const newNote = createMockBulletinNote({ id: 'new-note' });
      mockBulletinNotesApi.createNote.mockResolvedValue(newNote);
      const store = useBulletinNotesStore();
      const result = await store.createNote('house-1', {
        message: 'Hello',
      });
      expect(result).toEqual(newNote);
      expect(store.notes[0]!.id).toBe('new-note');
    });

    it('returns null and notifies when message is empty', async () => {
      const store = useBulletinNotesStore();
      const result = await store.createNote('house-1', {
        message: '   ',
      });
      expect(result).toBeNull();
      expect(mockBulletinNotesApi.createNote).not.toHaveBeenCalled();
    });

    it('returns null and notifies when API fails', async () => {
      mockBulletinNotesApi.createNote.mockResolvedValue(null);
      const store = useBulletinNotesStore();
      const result = await store.createNote('house-1', {
        message: 'Hello',
      });
      expect(result).toBeNull();
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('deleteNote', () => {
    it('removes note from state on success', async () => {
      mockBulletinNotesApi.getHouseNotes.mockResolvedValue([
        createMockBulletinNote({ id: 'n1' }),
        createMockBulletinNote({ id: 'n2' }),
      ]);
      mockBulletinNotesApi.deleteNote.mockResolvedValue(true);
      const store = useBulletinNotesStore();
      await store.loadHouseNotes('house-1');
      const result = await store.deleteNote('n1');
      expect(result).toBe(true);
      expect(store.notes).toHaveLength(1);
      expect(store.notes[0]!.id).toBe('n2');
    });

    it('returns false and notifies on failure', async () => {
      mockBulletinNotesApi.deleteNote.mockResolvedValue(false);
      const store = useBulletinNotesStore();
      const result = await store.deleteNote('n1');
      expect(result).toBe(false);
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'error',
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('$reset', () => {
    it('clears all notes', async () => {
      mockBulletinNotesApi.getHouseNotes.mockResolvedValue([
        createMockBulletinNote(),
      ]);
      const store = useBulletinNotesStore();
      await store.loadHouseNotes('house-1');
      store.$reset();
      expect(store.notes).toEqual([]);
    });
  });
});
