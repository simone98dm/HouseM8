-- Migration: bill_reminders table
-- Tracks sent reminder notifications to prevent duplicates

CREATE TABLE IF NOT EXISTS bill_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
    due_period DATE NOT NULL,
    days_before INTEGER NOT NULL CHECK (days_before IN (1, 3, 7)),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(bill_id, due_period, days_before)
);

CREATE INDEX IF NOT EXISTS idx_bill_reminders_bill_id ON bill_reminders(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_due_period ON bill_reminders(due_period);
