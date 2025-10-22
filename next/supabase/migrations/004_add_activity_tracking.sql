-- Migration: Ajout des colonnes pour le tracking d'activité en temps réel
-- Date: 2025-10-22

-- Ajouter la colonne pour l'activité récente (heartbeat)
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ;

-- Ajouter la colonne pour savoir si la session est active
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Ajouter la colonne pour l'heure de fin de session
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

-- Ajouter la colonne pour la durée de la session en secondes
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Ajouter un ID unique pour chaque session (pour le tracking)
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

-- Index pour trouver rapidement les sessions actives
CREATE INDEX IF NOT EXISTS idx_user_sessions_active 
ON user_sessions(is_active, last_activity) 
WHERE is_active = true;

-- Index pour les sessions par utilisateur
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_activity 
ON user_sessions(user_id, last_activity DESC);

-- Commentaires
COMMENT ON COLUMN user_sessions.last_activity IS 'Dernière activité détectée (heartbeat)';
COMMENT ON COLUMN user_sessions.is_active IS 'Session actuellement active';
COMMENT ON COLUMN user_sessions.ended_at IS 'Heure de fin de session (logout ou timeout)';
COMMENT ON COLUMN user_sessions.duration_seconds IS 'Durée totale de la session en secondes';
COMMENT ON COLUMN user_sessions.id IS 'Identifiant unique de la session';

