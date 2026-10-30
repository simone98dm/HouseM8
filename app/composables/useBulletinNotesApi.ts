import type { BulletinNote, CreateBulletinNotePayload } from '~/types';

/**
 * Layer 4: API Composable for Bulletin Notes
 *
 * Responsibilities:
 * - Make HTTP requests via useApi()
 * - Map DTOs to domain objects
 * - Return typed data or null on error
 * - NO business logic
 * - NO state management
 * - NO notifications (stores handle this)
 */
export const useBulletinNotesApi = () => {
  const api = useApi();
  const baseUrl = '/api/bulletin-notes';

  /**
   * Get all bulletin notes for a house
   */
  const getHouseNotes = async (
    houseId: string,
  ): Promise<BulletinNote[] | null> => {
    try {
      const notes = await api.fetch<BulletinNote[]>(baseUrl, {
        params: { house_id: houseId },
      });
      return notes || [];
    } catch {
      return null;
    }
  };

  /**
   * Create a new bulletin note
   */
  const createNote = async (
    houseId: string,
    payload: CreateBulletinNotePayload,
  ): Promise<BulletinNote | null> => {
    try {
      const note = await api.fetch<BulletinNote>(baseUrl, {
        method: 'POST',
        body: {
          house_id: houseId,
          ...payload,
        },
      });
      return note;
    } catch {
      return null;
    }
  };

  /**
   * Delete a bulletin note
   */
  const deleteNote = async (noteId: string): Promise<boolean> => {
    try {
      await api.fetch(`${baseUrl}/${noteId}`, { method: 'DELETE' });
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Delete expired bulletin notes (cleanup)
   */
  const cleanupExpiredNotes = async (): Promise<boolean> => {
    try {
      await api.fetch(`${baseUrl}/cleanup`, { method: 'POST' });
      return true;
    } catch {
      return false;
    }
  };

  return {
    getHouseNotes,
    createNote,
    deleteNote,
    cleanupExpiredNotes,
  };
};
