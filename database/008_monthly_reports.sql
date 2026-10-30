-- Migration: monthly_reports table
-- Stores generated PDF report metadata per house per month

CREATE TABLE IF NOT EXISTS monthly_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    expense_count INTEGER NOT NULL DEFAULT 0,
    pdf_url TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(house_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_house_id ON monthly_reports(house_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_period ON monthly_reports(year, month);
