-- Enrich funnel_sessions with geo, device, and per-step context

ALTER TABLE funnel_sessions ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE funnel_sessions ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE funnel_sessions ADD COLUMN IF NOT EXISTS accept_language TEXT;
ALTER TABLE funnel_sessions ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE funnel_sessions ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE funnel_sessions ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE funnel_sessions ADD COLUMN IF NOT EXISTS landing_ip TEXT;
ALTER TABLE funnel_sessions ADD COLUMN IF NOT EXISTS landing_country TEXT;
ALTER TABLE funnel_sessions ADD COLUMN IF NOT EXISTS landing_city TEXT;
ALTER TABLE funnel_sessions ADD COLUMN IF NOT EXISTS signup_ip TEXT;
ALTER TABLE funnel_sessions ADD COLUMN IF NOT EXISTS signup_country TEXT;

CREATE INDEX IF NOT EXISTS idx_funnel_sessions_country ON funnel_sessions (country);
CREATE INDEX IF NOT EXISTS idx_funnel_sessions_clicked_at_hour ON funnel_sessions (clicked_at DESC);
