-- Migration: Ajout des champs device_name, timezone et isp à la table user_sessions
-- Date: 2025-10-22

-- Ajouter la colonne device_name pour stocker le nom personnalisé du device
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS device_name TEXT;

-- Ajouter la colonne timezone pour stocker le fuseau horaire
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Ajouter la colonne isp pour stocker le fournisseur d'accès Internet
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS isp TEXT;

-- Créer un index sur device_name pour les recherches
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_name ON user_sessions(device_name);

-- Créer un index sur user_id et device_name pour les requêtes combinées
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_device ON user_sessions(user_id, device_name);

-- Commentaires sur les colonnes
COMMENT ON COLUMN user_sessions.device_name IS 'Nom personnalisé du device défini par l''utilisateur (ex: "MacBook de Julien")';
COMMENT ON COLUMN user_sessions.timezone IS 'Fuseau horaire du device au moment de la connexion';
COMMENT ON COLUMN user_sessions.isp IS 'Fournisseur d''accès Internet (ISP) détecté';

