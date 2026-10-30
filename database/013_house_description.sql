-- Optional free-text description of a house (shown on the house page).
ALTER TABLE houses
  ADD COLUMN IF NOT EXISTS description TEXT
  CONSTRAINT houses_description_length CHECK (char_length(description) <= 1000);
