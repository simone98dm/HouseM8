import type { RepositoryResponse, PaginatedResponse } from './IBaseRepository';
import type { User } from './IUserRepository';

/**
 * Bulletin note entity
 */
/** The sticky-note palette. Mirrors the CHECK on bulletin_notes.color. */
export type BulletinNoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple';

export interface BulletinNote {
  id: string;
  house_id: string;
  user_id: string;
  message: string;
  /**
   * Assigned at insert time by the column default, not by this application —
   * see supabase/migrations/20260819120000_bulletin_note_color.sql. Never
   * write it from a create payload; there is no reason for a caller to pick.
   */
  color: BulletinNoteColor;
  dismiss_date?: string | null;
  created_at: string;
  user?: User;
}

/**
 * Bulletin note create data
 */
export interface BulletinNoteCreateData {
  house_id: string;
  user_id: string;
  message: string;
  dismiss_date?: string | null;
}

/**
 * Bulletin note update data
 */
export interface BulletinNoteUpdateData {
  message?: string;
  dismiss_date?: string | null;
}

/**
 * Bulletin note repository interface
 */
export interface IBulletinNoteRepository {
  /**
   * Get bulletin note by ID
   */
  getById(noteId: string): Promise<RepositoryResponse<BulletinNote>>;

  /**
   * Get bulletin notes for a house with optional pagination
   */
  getByHouse(
    houseId: string,
    options?: {
      activeOnly?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<PaginatedResponse<BulletinNote>>;

  /**
   * Get active bulletin notes for a user (not dismissed)
   */
  getActiveForUser(
    houseId: string,
  ): Promise<RepositoryResponse<BulletinNote[]>>;

  /**
   * Create a new bulletin note
   */
  create(
    data: BulletinNoteCreateData,
  ): Promise<RepositoryResponse<BulletinNote>>;

  /**
   * Update bulletin note
   */
  update(
    noteId: string,
    data: BulletinNoteUpdateData,
  ): Promise<RepositoryResponse<BulletinNote>>;

  /**
   * Delete a bulletin note
   */
  delete(noteId: string): Promise<RepositoryResponse<void>>;

  /**
   * Dismiss a bulletin note by setting dismiss date
   */
  dismiss(
    noteId: string,
    dismissDate: string,
  ): Promise<RepositoryResponse<void>>;

  /**
   * Clean up notes with past dismiss dates
   * @param houseId - Optional house ID. If not provided, cleans up all houses
   */
  cleanup(houseId?: string): Promise<RepositoryResponse<void>>;

  /**
   * Check if user is creator of note
   */
  isCreator(noteId: string, userId: string): Promise<boolean>;
}
