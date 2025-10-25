/**
 * Script automatique pour exécuter la migration de sécurité
 * 
 * Ce script tente d'exécuter la migration via l'API Supabase
 */

const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Migration automatique de sécurité');
console.log('=' .repeat(50));

// Vérifier la configuration
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.log('❌ Variables d\'environnement manquantes');
  console.log('📋 Vérifiez que ces variables sont définies dans .env.local:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=...');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=...');
  console.log('\n💡 Créez le fichier .env.local avec vos variables Supabase');
  process.exit(1);
}

console.log('✅ Configuration Supabase détectée');
console.log('🔗 URL:', SUPABASE_URL);
console.log('🔑 Service Key:', SUPABASE_SERVICE_KEY.substring(0, 20) + '...');

// Lire le fichier de migration
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '006_create_security_blocking.sql');

if (!fs.existsSync(migrationPath)) {
  console.log('❌ Fichier de migration non trouvé:', migrationPath);
  process.exit(1);
}

const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('\n📄 Migration SQL chargée');
console.log('📊 Taille:', migrationSQL.length, 'caractères');

// Fonction pour exécuter la migration via l'API Supabase
async function executeMigration() {
  try {
    console.log('\n🔄 Exécution de la migration...');
    
    // Créer le client Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Exécuter la migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.log('⚠️ Erreur lors de l\'exécution:', error.message);
      console.log('💡 Essayez d\'exécuter manuellement via l\'interface Supabase');
      return false;
    }
    
    console.log('✅ Migration exécutée avec succès');
    return true;
    
  } catch (error) {
    console.log('❌ Erreur lors de l\'exécution automatique:', error.message);
    console.log('💡 Exécution manuelle requise');
    return false;
  }
}

// Fonction alternative - exécution manuelle
function showManualInstructions() {
  console.log('\n📋 Instructions d\'exécution manuelle:');
  console.log('=' .repeat(50));
  console.log('1. Ouvrez votre interface Supabase');
  console.log('2. Allez dans l\'onglet "SQL Editor"');
  console.log('3. Copiez le contenu ci-dessous:');
  console.log('\n' + '=' .repeat(50));
  console.log(migrationSQL);
  console.log('=' .repeat(50));
  console.log('\n4. Exécutez la requête SQL');
  console.log('5. Vérifiez que les tables sont créées');
}

// Essayer l'exécution automatique
executeMigration().then(success => {
  if (!success) {
    showManualInstructions();
  } else {
    console.log('\n🎉 Migration terminée !');
    console.log('✅ Tables créées:');
    console.log('   - blocked_ips');
    console.log('   - blocked_countries');
    console.log('   - blocked_ip_ranges');
    console.log('   - security_logs');
    console.log('\n🚀 Le système de sécurité est maintenant opérationnel !');
  }
}).catch(error => {
  console.log('❌ Erreur:', error.message);
  showManualInstructions();
});
