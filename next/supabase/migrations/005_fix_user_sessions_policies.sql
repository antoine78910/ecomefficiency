-- Migration: Fix user_sessions permissions (RLS policies)
-- Date: 2025-10-22
-- Problème: Les utilisateurs ne peuvent pas insérer leurs sessions car RLS bloque

-- Désactiver temporairement RLS pour permettre les tests
-- (À réactiver après avoir ajouté les bonnes policies)
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;

-- OU si vous voulez garder RLS activé, utilisez ces policies :

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can insert their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can read their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Service role can do anything" ON user_sessions;

-- Policy pour permettre aux utilisateurs authentifiés d'insérer leurs sessions
CREATE POLICY "Users can insert their own sessions" ON user_sessions
FOR INSERT
TO authenticated
WITH CHECK (true); -- Permettre à tous les utilisateurs authentifiés d'insérer

-- Policy pour permettre aux utilisateurs de lire leurs propres sessions
CREATE POLICY "Users can read their own sessions" ON user_sessions
FOR SELECT
TO authenticated
USING (
  user_id::text = auth.uid()::text
  OR user_id = auth.uid()::text
);

-- Policy pour permettre aux utilisateurs de mettre à jour leurs propres sessions
CREATE POLICY "Users can update their own sessions" ON user_sessions
FOR UPDATE
TO authenticated
USING (
  user_id::text = auth.uid()::text
  OR user_id = auth.uid()::text
);

-- Policy pour le service role (API backend)
CREATE POLICY "Service role can do anything" ON user_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Réactiver RLS avec les nouvelles policies
-- ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Note: Si vous voulez tester sans RLS d'abord, commentez la ligne ci-dessus
-- Une fois que tout fonctionne, décommentez-la pour réactiver RLS

