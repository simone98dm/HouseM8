-- PostgreSQL Schema Migration for Reports Feature
-- Issue reporting system for house members (non-owners)

-- =============================================================================
-- REPORTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    solved_at TIMESTAMP WITH TIME ZONE
);


-- =============================================================================
-- REPORT IMAGES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS report_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);


-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_reports_house_id ON reports(house_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_images_report_id ON report_images(report_id);

-- =============================================================================
-- PREVENT OWNERS FROM CREATING REPORTS (using a trigger)
-- =============================================================================
CREATE OR REPLACE FUNCTION check_report_creator_not_owner()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM houses 
        WHERE id = NEW.house_id 
        AND owner_id = NEW.created_by
    ) THEN
        RAISE EXCEPTION 'House owners cannot create reports for their own house';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_report_creator_not_owner ON reports;
CREATE TRIGGER trigger_check_report_creator_not_owner
    BEFORE INSERT ON reports
    FOR EACH ROW
    EXECUTE FUNCTION check_report_creator_not_owner();
