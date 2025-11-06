-- Migration: Table pour les analytics utilisateurs avec dates de join réelles
-- Date: 2025-01-15

-- Table pour stocker les données des utilisateurs avec leurs dates de join réelles
CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    email TEXT,
    source TEXT NOT NULL, -- 'tiktok', 'insta', 'google', etc.
    joined_at TIMESTAMPTZ NOT NULL, -- Date réelle de join
    subscribed_at TIMESTAMPTZ, -- Date de souscription (si applicable)
    is_subscriber BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_user_analytics_joined_at ON user_analytics(joined_at);
CREATE INDEX IF NOT EXISTS idx_user_analytics_source ON user_analytics(source);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_subscriber ON user_analytics(is_subscriber);

-- Index composite pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_user_analytics_source_joined ON user_analytics(source, joined_at);
CREATE INDEX IF NOT EXISTS idx_user_analytics_subscriber_joined ON user_analytics(is_subscriber, joined_at);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_user_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_user_analytics_updated_at
    BEFORE UPDATE ON user_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_user_analytics_updated_at();

-- Commentaires
COMMENT ON TABLE user_analytics IS 'Données des utilisateurs avec dates de join réelles pour analytics';
COMMENT ON COLUMN user_analytics.source IS 'Canal d''acquisition (tiktok, insta, google, etc.)';
COMMENT ON COLUMN user_analytics.joined_at IS 'Date réelle de join de l''utilisateur';
COMMENT ON COLUMN user_analytics.subscribed_at IS 'Date de souscription (si applicable)';
COMMENT ON COLUMN user_analytics.is_subscriber IS 'Utilisateur abonné payant';

-- RLS (Row Level Security)
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre l'accès en lecture au service role
CREATE POLICY "Service role can manage user analytics"
    ON user_analytics
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Politique pour permettre l'accès en lecture aux utilisateurs authentifiés (pour leurs propres données)
CREATE POLICY "Users can view their own analytics"
    ON user_analytics
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
