-- Create bulletin_notes table
CREATE TABLE IF NOT EXISTS public.bulletin_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    dismiss_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
-- Enable RLS
ALTER TABLE public.bulletin_notes ENABLE ROW LEVEL SECURITY;
-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_bulletin_notes_house_id ON public.bulletin_notes(house_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_notes_dismiss_date ON public.bulletin_notes(dismiss_date);
-- RLS Policies for bulletin_notes
-- Users can view notes from their houses
DROP POLICY IF EXISTS "Users can view notes from their houses" ON public.bulletin_notes;
CREATE POLICY "Users can view notes from their houses" ON public.bulletin_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_id = bulletin_notes.house_id
            AND user_id = auth.uid()
            AND left_at IS NULL
        )
    );
-- Users can create notes in their houses
DROP POLICY IF EXISTS "Users can create notes in their houses" ON public.bulletin_notes;
CREATE POLICY "Users can create notes in their houses" ON public.bulletin_notes
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.house_members
            WHERE house_id = bulletin_notes.house_id
            AND user_id = auth.uid()
            AND left_at IS NULL
        )
    );
-- Users can delete their own notes
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.bulletin_notes;
CREATE POLICY "Users can delete their own notes" ON public.bulletin_notes
    FOR DELETE USING (user_id = auth.uid());
-- Function to auto-delete expired notes
CREATE OR REPLACE FUNCTION delete_expired_bulletin_notes()
RETURNS void AS $$
BEGIN
    DELETE FROM public.bulletin_notes
    WHERE dismiss_date IS NOT NULL AND dismiss_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- You can set up a cron job or pg_cron extension to run this periodically
-- For now, it can be called manually or via an API endpoint;