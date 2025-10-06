-- Create A/B test events table
CREATE TABLE IF NOT EXISTS ab_test_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant TEXT NOT NULL CHECK (variant IN ('stripe', 'custom')),
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'conversion')),
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast queries
CREATE INDEX IF NOT EXISTS idx_ab_test_events_variant_event ON ab_test_events(variant, event_type);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_created_at ON ab_test_events(created_at);

-- Enable RLS
ALTER TABLE ab_test_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert events
CREATE POLICY "Allow insert events" ON ab_test_events FOR INSERT WITH CHECK (true);

-- Only allow reading your own events or anonymous reads
CREATE POLICY "Allow read events" ON ab_test_events FOR SELECT USING (true);

