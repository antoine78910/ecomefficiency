-- Script de migration des données discord_analytics vers user_analytics
-- Ce script génère des données de test basées sur les données existantes

-- D'abord, vérifier s'il y a des données dans discord_analytics
DO $$
DECLARE
    row_count INTEGER;
    source_record RECORD;
    total_members INTEGER;
    total_subscribers INTEGER;
    i INTEGER;
    random_date TIMESTAMP;
    random_user_id UUID;
BEGIN
    -- Compter les enregistrements existants
    SELECT COUNT(*) INTO row_count FROM discord_analytics;
    
    RAISE NOTICE 'Found % records in discord_analytics', row_count;
    
    -- Si pas de données, créer des données de test
    IF row_count = 0 THEN
        RAISE NOTICE 'No data found, creating sample data...';
        
        -- Créer des données de test pour les 30 derniers jours
        FOR i IN 1..30 LOOP
            random_date := NOW() - (i * INTERVAL '1 day');
            
            -- Générer des utilisateurs pour chaque source
            FOR source_record IN SELECT unnest(ARRAY['tiktok', 'insta', 'google', 'telegram', 'discord', 'twitter', 'friend', 'other']) AS source LOOP
                -- Générer entre 1 et 10 utilisateurs par jour par source
                total_members := floor(random() * 10) + 1;
                total_subscribers := floor(total_members * (0.05 + random() * 0.15)); -- 5-20% de conversion
                
                -- Insérer les utilisateurs individuels
                FOR j IN 1..total_members LOOP
                    random_user_id := gen_random_uuid();
                    
                    INSERT INTO user_analytics (
                        user_id,
                        email,
                        source,
                        joined_at,
                        subscribed_at,
                        is_subscriber
                    ) VALUES (
                        random_user_id,
                        'user' || j || '@example.com',
                        source_record.source,
                        random_date + (random() * INTERVAL '1 day'),
                        CASE 
                            WHEN j <= total_subscribers THEN random_date + (random() * INTERVAL '1 day') + INTERVAL '1 hour'
                            ELSE NULL
                        END,
                        j <= total_subscribers
                    );
                END LOOP;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE 'Sample data created successfully';
    ELSE
        RAISE NOTICE 'Data already exists in user_analytics';
    END IF;
END $$;

-- Vérifier les résultats
SELECT 
    source,
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_subscriber THEN 1 END) as subscribers,
    ROUND(COUNT(CASE WHEN is_subscriber THEN 1 END)::numeric / COUNT(*) * 100, 2) as conversion_rate
FROM user_analytics 
GROUP BY source 
ORDER BY total_users DESC;
