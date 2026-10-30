import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useApi } from '~/composables/useApi';

vi.mock('~/composables/useApi', () => ({
  useApi: vi.fn(),
}));

describe('useBulletinNotesApi', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockFetch = vi.fn();
    vi.mocked(useApi).mockReturnValue({ fetch: mockFetch } as any);
  });

  describe('getHouseNotes', () => {
    it('fetches notes for a house', async () => {
      const { useBulletinNotesApi } =
        await import('~/composables/useBulletinNotesApi');
      const mockNotes = [
        {
          id: 'n-1',
          house_id: 'h-1',
          user_id: 'u-1',
          title: 'Note 1',
          message: 'Msg 1',
          color: 'yellow',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];
      mockFetch.mockResolvedValue(mockNotes);

      const { getHouseNotes } = useBulletinNotesApi();
      const result = await getHouseNotes('h-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/bulletin-notes', {
        params: { house_id: 'h-1' },
      });
      expect(result).toEqual(mockNotes);
    });

    it('returns empty array when response is null/falsy', async () => {
      const { useBulletinNotesApi } =
        await import('~/composables/useBulletinNotesApi');
      mockFetch.mockResolvedValue(null);

      const { getHouseNotes } = useBulletinNotesApi();
      const result = await getHouseNotes('h-1');

      expect(result).toEqual([]);
    });

    it('returns null on error', async () => {
      const { useBulletinNotesApi } =
        await import('~/composables/useBulletinNotesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { getHouseNotes } = useBulletinNotesApi();
      const result = await getHouseNotes('h-1');

      expect(result).toBeNull();
    });
  });

  describe('createNote', () => {
    it('creates a note successfully', async () => {
      const { useBulletinNotesApi } =
        await import('~/composables/useBulletinNotesApi');
      const payload = { message: 'New Note', dismiss_date: '2024-12-31' };
      const mockNote = {
        id: 'n-new',
        house_id: 'h-1',
        user_id: 'u-1',
        title: 'New Note',
        color: 'yellow',
        ...payload,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      mockFetch.mockResolvedValue(mockNote);

      const { createNote } = useBulletinNotesApi();
      const result = await createNote('h-1', payload);

      expect(mockFetch).toHaveBeenCalledWith('/api/bulletin-notes', {
        method: 'POST',
        body: { house_id: 'h-1', ...payload },
      });
      expect(result).toEqual(mockNote);
    });

    it('returns null on error', async () => {
      const { useBulletinNotesApi } =
        await import('~/composables/useBulletinNotesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { createNote } = useBulletinNotesApi();
      const result = await createNote('h-1', { message: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('deleteNote', () => {
    it('deletes a note and returns true', async () => {
      const { useBulletinNotesApi } =
        await import('~/composables/useBulletinNotesApi');
      mockFetch.mockResolvedValue(undefined);

      const { deleteNote } = useBulletinNotesApi();
      const result = await deleteNote('n-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/bulletin-notes/n-1', {
        method: 'DELETE',
      });
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      const { useBulletinNotesApi } =
        await import('~/composables/useBulletinNotesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { deleteNote } = useBulletinNotesApi();
      const result = await deleteNote('n-1');

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredNotes', () => {
    it('cleans up expired notes and returns true', async () => {
      const { useBulletinNotesApi } =
        await import('~/composables/useBulletinNotesApi');
      mockFetch.mockResolvedValue(undefined);

      const { cleanupExpiredNotes } = useBulletinNotesApi();
      const result = await cleanupExpiredNotes();

      expect(mockFetch).toHaveBeenCalledWith('/api/bulletin-notes/cleanup', {
        method: 'POST',
      });
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      const { useBulletinNotesApi } =
        await import('~/composables/useBulletinNotesApi');
      mockFetch.mockRejectedValue(new Error('API Error'));

      const { cleanupExpiredNotes } = useBulletinNotesApi();
      const result = await cleanupExpiredNotes();

      expect(result).toBe(false);
    });
  });
});
