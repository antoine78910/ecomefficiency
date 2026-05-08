-- Migration: add device fingerprint columns for shared-login detection
-- Date: 2026-05-08

ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS fingerprint_version TEXT;

CREATE INDEX IF NOT EXISTS idx_user_sessions_device_fingerprint
ON user_sessions(device_fingerprint);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_fingerprint
ON user_sessions(user_id, device_fingerprint);

COMMENT ON COLUMN user_sessions.device_fingerprint IS 'Hashed browser/device fingerprint generated client-side for anti-sharing detection';
COMMENT ON COLUMN user_sessions.fingerprint_version IS 'Fingerprint algorithm version (ex: v1)';
