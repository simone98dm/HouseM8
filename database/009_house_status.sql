-- database/009_house_status.sql
-- Add status column to houses table for archiving support

ALTER TABLE houses
  ADD COLUMN IF NOT EXISTS status TEXT
    NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived'));

COMMENT ON COLUMN houses.status IS 'active = operational, archived = no members or dismantled (restorable)';
