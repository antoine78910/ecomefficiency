-- Bio link funnel tracking (/try = Instagram, /start = TikTok)
-- Tracks: click → landing → signup → paid conversion

CREATE TABLE IF NOT EXISTS funnel_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('instagram', 'tiktok')),
    entry_path TEXT NOT NULL,
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    landed_at TIMESTAMPTZ,
    signed_up_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    user_id UUID,
    email TEXT,
    stripe_customer_id TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    referrer TEXT,
    landing_path TEXT,
    ip_address TEXT,
    country TEXT,
    user_agent TEXT,
    datafast_visitor_id TEXT,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (visitor_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_funnel_sessions_channel_clicked
    ON funnel_sessions (channel, clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_funnel_sessions_user_id
    ON funnel_sessions (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_funnel_sessions_email
    ON funnel_sessions (email)
    WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_funnel_sessions_converted
    ON funnel_sessions (converted_at DESC)
    WHERE converted_at IS NOT NULL;

CREATE OR REPLACE FUNCTION update_funnel_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_funnel_sessions_updated_at ON funnel_sessions;
CREATE TRIGGER update_funnel_sessions_updated_at
    BEFORE UPDATE ON funnel_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_funnel_sessions_updated_at();

ALTER TABLE funnel_sessions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE funnel_sessions IS 'Internal bio-link funnel: /try (Instagram) and /start (TikTok)';
