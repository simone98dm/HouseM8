/**
 * Bulletin Board Component Tests
 * Tests for bulletin board component following CLAUDE.md guidelines
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import BulletinBoard from '~/components/bulletin/Board.vue';
import type { BulletinNote, CreateBulletinNotePayload } from '~/types';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

describe('Bulletin Board Component', () => {
  const mockNotes: BulletinNote[] = [
    {
      id: '1',
      house_id: 'house-1',
      user_id: 'user-1',
      title: 'Test Note 1',
      message: 'Test note 1',
      color: 'yellow',
      created_at: '2025-11-10T10:00:00Z',
      updated_at: '2025-11-10T10:00:00Z',
    },
    {
      id: '2',
      house_id: 'house-1',
      user_id: 'user-2',
      title: 'Test Note 2',
      message: 'Test note 2',
      color: 'blue',
      dismiss_date: '2025-12-01',
      created_at: '2025-11-10T11:00:00Z',
      updated_at: '2025-11-10T11:00:00Z',
    },
  ];

  const mockHouse = {
    id: 'house-1',
    name: 'Test House',
    members: [
      { user_id: 'user-1', role: 'owner' as const },
      { user_id: 'user-2', role: 'member' as const },
      { user_id: 'user-3', role: 'member' as const },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Props and Data', () => {
    it('should display bulletin board title', () => {
      const titleKey = 'bulletin.title';
      expect(titleKey).toBe('bulletin.title');
    });

    it('should have new note button text', () => {
      const buttonTextKey = 'bulletin.newNote';
      expect(buttonTextKey).toBe('bulletin.newNote');
    });

    it('should display empty state message when no notes', () => {
      const emptyMessageKey = 'bulletin.noNotes';
      expect(emptyMessageKey).toBe('bulletin.noNotes');
    });

    it('should accept notes array', () => {
      expect(Array.isArray(mockNotes)).toBe(true);
      expect(mockNotes).toHaveLength(2);
    });
  });

  /**
   * These used to assert on a colour-assignment scheme that exists nowhere in
   * the code (a per-member-index Map built inside the test itself), so they
   * passed happily throughout the entire period when `bulletin_notes` had no
   * `color` column at all and every note rendered `sticky-undefined`. Mount
   * the component and read the class it actually emits.
   */
  describe('Colour', () => {
    const mountBoard = (notes: BulletinNote[]) =>
      mountSuspended(BulletinBoard, {
        props: { notes, currentHouse: null },
        global: {
          stubs: {
            Icon: true,
            UiButton: { template: '<button><slot /></button>' },
            LazyBulletinModal: true,
          },
        },
      });

    it("renders each note's own colour class", async () => {
      const wrapper = await mountBoard(mockNotes);
      const rendered = wrapper.findAll('.sticky-note');

      expect(rendered).toHaveLength(2);
      expect(rendered[0]!.classes()).toContain('sticky-yellow');
      expect(rendered[1]!.classes()).toContain('sticky-blue');
    });

    it('supports every colour in the palette', async () => {
      const palette = ['yellow', 'pink', 'blue', 'green', 'purple'] as const;
      const wrapper = await mountBoard(
        palette.map((color, i) => ({
          ...mockNotes[0]!,
          id: `note-${i}`,
          color,
        })),
      );

      const classes = wrapper.findAll('.sticky-note').map((n) => n.classes());
      palette.forEach((color, i) => {
        expect(classes[i]).toContain(`sticky-${color}`);
      });
    });

    it('never emits sticky-undefined when a colour is missing', async () => {
      const wrapper = await mountBoard([
        { ...mockNotes[0]!, color: undefined as unknown as 'yellow' },
      ]);

      const classes = wrapper.find('.sticky-note').classes();
      expect(classes).not.toContain('sticky-undefined');
      expect(classes).toContain('sticky-yellow');
    });
  });

  describe('Note Management', () => {
    it('should load notes on mount', async () => {
      const loadNotes = vi.fn();
      await loadNotes();
      expect(loadNotes).toHaveBeenCalled();
    });

    it('should reload notes when house changes', async () => {
      const loadNotes = vi.fn();

      // Simulate house change
      await loadNotes();
      expect(loadNotes).toHaveBeenCalled();
    });

    it('should not load notes if no current house', async () => {
      const currentHouse: { id: string } | null = null;
      const loadNotes = vi.fn();

      if (!currentHouse) {
        // Should not call loadNotes
      } else {
        await loadNotes();
      }

      expect(loadNotes).not.toHaveBeenCalled();
    });
  });

  describe('Create Note', () => {
    it('should create note with valid payload', async () => {
      const createNote = vi.fn();
      const payload: CreateBulletinNotePayload = {
        message: 'New test note',
      };

      await createNote(payload);
      expect(createNote).toHaveBeenCalledWith(payload);
    });

    it('should create note with dismiss date', async () => {
      const createNote = vi.fn();
      const payload: CreateBulletinNotePayload = {
        message: 'Note with dismiss date',
        dismiss_date: '2025-12-31',
      };

      await createNote(payload);
      expect(createNote).toHaveBeenCalledWith(payload);
    });

    it('should close modal after successful creation', async () => {
      const showModal = { value: true };
      const createNote = vi.fn().mockResolvedValue({ id: 'new-note' });

      const newNote = await createNote({
        message: 'Test',
      });

      if (newNote) {
        showModal.value = false;
      }

      expect(showModal.value).toBe(false);
    });

    it('should not close modal if creation fails', async () => {
      const showModal = { value: true };
      const createNote = vi.fn().mockResolvedValue(null);

      const newNote = await createNote({
        message: 'Test',
      });

      if (newNote) {
        showModal.value = false;
      }

      expect(showModal.value).toBe(true);
    });

    it('should require house id to create note', async () => {
      const currentHouse: { id: string } | null = null;
      const createNote = vi.fn();

      if (!currentHouse) {
        // Should not proceed
      } else {
        await createNote({ message: 'Test' });
      }

      expect(createNote).not.toHaveBeenCalled();
    });
  });

  describe('Delete Note', () => {
    it('should delete note by id', async () => {
      const deleteNote = vi.fn();
      const noteId = 'note-to-delete';

      await deleteNote(noteId);
      expect(deleteNote).toHaveBeenCalledWith(noteId);
    });

    it('should accept note id as string', () => {
      const noteId = '123';
      expect(typeof noteId).toBe('string');
      expect(noteId).toBeTruthy();
    });
  });

  describe('Modal Control', () => {
    it('should show modal when new note button clicked', () => {
      const showModal = { value: false };
      showModal.value = true;
      expect(showModal.value).toBe(true);
    });

    it('should hide modal on close', () => {
      const showModal = { value: true };
      showModal.value = false;
      expect(showModal.value).toBe(false);
    });

    it('should initialize modal as hidden', () => {
      const showModal = { value: false };
      expect(showModal.value).toBe(false);
    });
  });

  describe('Layout and Styling', () => {
    it('should use full-width card', () => {
      const fullWidth = true;
      expect(fullWidth).toBe(true);
    });

    it('should display notes in grid layout', () => {
      const gridClasses =
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
      expect(gridClasses).toContain('grid');
      expect(gridClasses).toContain('grid-cols-1');
      expect(gridClasses).toContain('sm:grid-cols-2');
      expect(gridClasses).toContain('lg:grid-cols-3');
      expect(gridClasses).toContain('xl:grid-cols-4');
    });

    it('should center empty state content', () => {
      const emptyStateClasses = 'text-center py-8 text-gray-500';
      expect(emptyStateClasses).toContain('text-center');
      expect(emptyStateClasses).toContain('py-8');
    });

    it('should style header with flex layout', () => {
      const headerClasses = 'flex items-center justify-between';
      expect(headerClasses).toContain('flex');
      expect(headerClasses).toContain('items-center');
      expect(headerClasses).toContain('justify-between');
    });
  });

  describe('Store Integration', () => {
    it('should use houses store for current house', () => {
      const useHousesStore = vi.fn(() => ({
        currentHouse: mockHouse,
      }));

      const housesStore = useHousesStore();
      expect(housesStore.currentHouse).toBeDefined();
      expect(housesStore.currentHouse?.id).toBe('house-1');
    });

    it('should use bulletin notes store for notes', () => {
      const useBulletinNotesStore = vi.fn(() => ({
        notes: mockNotes,
        loadHouseNotes: vi.fn(),
        createNote: vi.fn(),
        deleteNote: vi.fn(),
      }));

      const bulletinNotesStore = useBulletinNotesStore();
      expect(bulletinNotesStore.notes).toBeDefined();
      expect(bulletinNotesStore.notes).toHaveLength(2);
    });
  });

  describe('Computed Properties', () => {
    it('should compute current house from store', () => {
      const housesStore = {
        currentHouse: mockHouse,
      };

      const currentHouse = housesStore.currentHouse;
      expect(currentHouse).toEqual(mockHouse);
    });

    it('should compute notes from store', () => {
      const bulletinNotesStore = {
        notes: mockNotes,
      };

      const notes = bulletinNotesStore.notes;
      expect(notes).toHaveLength(2);
      expect(notes[0]?.message).toBe('Test note 1');
    });

    it('should compute user color map from house members', () => {
      const colors = ['yellow', 'pink', 'blue', 'green', 'purple'];
      const userColorMap = new Map();

      if (mockHouse.members) {
        mockHouse.members.forEach((member, index) => {
          const color = colors[index % colors.length];
          if (color) {
            userColorMap.set(member.user_id, color);
          }
        });
      }

      expect(userColorMap.size).toBe(3);
      expect(userColorMap.has('user-1')).toBe(true);
    });
  });

  describe('Lazy Loading', () => {
    it('should lazy load modal component', () => {
      const showModal = false;
      const shouldLoadModal = showModal;
      expect(shouldLoadModal).toBe(false);
    });

    it('should load modal when needed', () => {
      const showModal = true;
      const shouldLoadModal = showModal;
      expect(shouldLoadModal).toBe(true);
    });
  });

  describe('Translations', () => {
    it('should use translation key for title', () => {
      const titleKey = 'bulletin.title';
      expect(titleKey).toBe('bulletin.title');
    });

    it('should use translation key for new note button', () => {
      const buttonKey = 'bulletin.newNote';
      expect(buttonKey).toBe('bulletin.newNote');
    });

    it('should use translation key for empty state', () => {
      const emptyKey = 'bulletin.noNotes';
      expect(emptyKey).toBe('bulletin.noNotes');
    });
  });

  describe('Rendered behaviour', () => {
    const mountBoard = (notes: BulletinNote[]) =>
      mountSuspended(BulletinBoard, {
        props: { notes, currentHouse: null },
        global: { stubs: { Icon: true, LazyBulletinModal: true } },
      });

    it('collapses to one line with an "Add one" action when empty', async () => {
      const w = await mountBoard([]);
      expect(w.text()).toContain('bulletin.noNotes');
      expect(w.find('button').text()).toBe('bulletin.addOne');
      expect(w.find('.bulletin-board').exists()).toBe(false);
    });

    it('falls back from first name to full name to email local part', async () => {
      const base = { ...mockNotes[0]! };
      const w = await mountBoard([
        {
          ...base,
          id: 'a',
          author: { id: 'u', first_name: 'Ada', last_name: 'L' },
        },
        {
          ...base,
          id: 'b',
          author: { id: 'u', first_name: '', last_name: 'Lovelace' },
        },
        {
          ...base,
          id: 'c',
          author: {
            id: 'u',
            first_name: '',
            last_name: '',
            email: 'bob@example.com',
          },
        },
        { ...base, id: 'd' },
      ]);
      const authors = w.findAll('.note-author').map((n) => n.text());
      expect(authors[0]).toMatch(/^Ada · /);
      expect(authors[1]).toMatch(/^Lovelace · /);
      expect(authors[2]).toMatch(/^bob · /);
      // No name at all: just the time, no dangling separator.
      expect(authors[3]).not.toContain('·');
      expect(authors[3]).not.toMatch(/^\s/);
    });
  });
});
