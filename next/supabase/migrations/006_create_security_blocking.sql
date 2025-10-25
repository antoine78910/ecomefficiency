-- Migration: Système de sécurité - Blocage IP et pays
-- Date: 2025-01-15

-- Table pour les IPs bloquées
CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET NOT NULL UNIQUE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    notes TEXT
);

-- Table pour les pays bloqués
CREATE TABLE IF NOT EXISTS blocked_countries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL UNIQUE,
    country_name TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    notes TEXT
);

-- Table pour les plages d'IPs bloquées (CIDR)
CREATE TABLE IF NOT EXISTS blocked_ip_ranges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_range CIDR NOT NULL UNIQUE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    notes TEXT
);

-- Table pour les logs de blocage
CREATE TABLE IF NOT EXISTS security_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET NOT NULL,
    country_code VARCHAR(2),
    country_name TEXT,
    user_agent TEXT,
    blocked_reason TEXT NOT NULL,
    blocked_type TEXT NOT NULL, -- 'ip', 'country', 'ip_range'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    request_path TEXT,
    headers JSONB
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_blocked_ips_active ON blocked_ips(is_active, ip_address) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_blocked_countries_active ON blocked_countries(is_active, country_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_blocked_ip_ranges_active ON blocked_ip_ranges(is_active, ip_range) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip ON security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_logs_country ON security_logs(country_code);

-- Index pour les requêtes de blocage rapides
CREATE INDEX IF NOT EXISTS idx_blocked_ips_lookup ON blocked_ips(ip_address) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_blocked_countries_lookup ON blocked_countries(country_code) WHERE is_active = true;

-- Commentaires
COMMENT ON TABLE blocked_ips IS 'Liste des adresses IP bloquées';
COMMENT ON TABLE blocked_countries IS 'Liste des pays bloqués par code ISO';
COMMENT ON TABLE blocked_ip_ranges IS 'Liste des plages IP bloquées (CIDR)';
COMMENT ON TABLE security_logs IS 'Logs des tentatives de connexion bloquées';

COMMENT ON COLUMN blocked_ips.ip_address IS 'Adresse IP à bloquer';
COMMENT ON COLUMN blocked_ips.reason IS 'Raison du blocage';
COMMENT ON COLUMN blocked_ips.expires_at IS 'Date d''expiration du blocage (NULL = permanent)';
COMMENT ON COLUMN blocked_ips.notes IS 'Notes additionnelles';

COMMENT ON COLUMN blocked_countries.country_code IS 'Code ISO du pays (ex: FR, US, CN)';
COMMENT ON COLUMN blocked_countries.country_name IS 'Nom du pays';
COMMENT ON COLUMN blocked_countries.reason IS 'Raison du blocage du pays';

COMMENT ON COLUMN blocked_ip_ranges.ip_range IS 'Plage IP au format CIDR (ex: 192.168.1.0/24)';
COMMENT ON COLUMN blocked_ip_ranges.expires_at IS 'Date d''expiration du blocage (NULL = permanent)';

COMMENT ON COLUMN security_logs.blocked_reason IS 'Raison du blocage (IP, pays, etc.)';
COMMENT ON COLUMN security_logs.blocked_type IS 'Type de blocage: ip, country, ip_range';
COMMENT ON COLUMN security_logs.request_path IS 'Chemin de la requête bloquée';
COMMENT ON COLUMN security_logs.headers IS 'Headers HTTP de la requête';

-- RLS (Row Level Security) - Seul l'admin peut gérer les blocages
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ip_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS (à adapter selon votre système d'auth admin)
-- Pour l'instant, on permet l'accès complet (à sécuriser selon vos besoins)
CREATE POLICY "Allow all access to blocked_ips" ON blocked_ips FOR ALL USING (true);
CREATE POLICY "Allow all access to blocked_countries" ON blocked_countries FOR ALL USING (true);
CREATE POLICY "Allow all access to blocked_ip_ranges" ON blocked_ip_ranges FOR ALL USING (true);
CREATE POLICY "Allow all access to security_logs" ON security_logs FOR ALL USING (true);
