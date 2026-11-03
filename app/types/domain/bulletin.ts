/**
 * Bulletin board domain types
 */

export type PostItColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple';

export interface BulletinNote {
  id: string;
  house_id: string;
  user_id: string;
  title: string;
  message: string;
  color: PostItColor;
  expires_at?: string | null;
  dismiss_date?: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
  };
}
