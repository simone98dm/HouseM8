-- Sticky notes had no colour.
--
-- `app/types/domain/bulletin.ts` declared `color: PostItColor` and
-- `bulletin/Board.vue` rendered `class="sticky-{{ note.color }}"`, but the
-- column never existed. Every note therefore resolved to `sticky-undefined`,
-- matched no rule in main.css, and rendered with the board's own background —
-- an invisible note on an invisible board.
--
-- The colour is assigned by the column default rather than in application code
-- so every insert path gets one, including any future direct write.

ALTER TABLE public.bulletin_notes
  ADD COLUMN IF NOT EXISTS color TEXT NOT NULL
  DEFAULT (ARRAY['yellow', 'pink', 'blue', 'green', 'purple'])[floor(random() * 5 + 1)];

ALTER TABLE public.bulletin_notes
  DROP CONSTRAINT IF EXISTS bulletin_notes_color_check;

ALTER TABLE public.bulletin_notes
  ADD CONSTRAINT bulletin_notes_color_check
  CHECK (color IN ('yellow', 'pink', 'blue', 'green', 'purple'));

-- Existing rows all took the default at ALTER time, which Postgres evaluates
-- ONCE for the whole table — so they would share a single colour. Re-randomise
-- them per row.
UPDATE public.bulletin_notes
SET color = (ARRAY['yellow', 'pink', 'blue', 'green', 'purple'])[floor(random() * 5 + 1)];
