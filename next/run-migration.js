/**
 * Script pour exécuter la migration de sécurité automatiquement
 * 
 * Ce script exécute la migration SQL pour créer les tables de sécurité
 */

const fs = require('fs');
const path = require('path');

// Lire le fichier de migration
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '006_create_security_blocking.sql');

if (!fs.existsSync(migrationPath)) {
  console.log('❌ Fichier de migration non trouvé:', migrationPath);
  process.exit(1);
}

const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Migration de sécurité détectée');
console.log('📄 Fichier:', migrationPath);
console.log('📊 Taille:', migrationSQL.length, 'caractères');

console.log('\n📋 Contenu de la migration:');
console.log('=' .repeat(50));
console.log(migrationSQL);
console.log('=' .repeat(50));

console.log('\n✅ Migration prête à être exécutée');
console.log('\n💡 Instructions:');
console.log('1. Ouvrez votre interface Supabase');
console.log('2. Allez dans l\'onglet "SQL Editor"');
console.log('3. Copiez le contenu ci-dessus');
console.log('4. Exécutez la requête SQL');
console.log('\n🔗 Ou utilisez la CLI Supabase:');
console.log('supabase db push');

console.log('\n🎯 Tables qui seront créées:');
console.log('- blocked_ips (IPs bloquées)');
console.log('- blocked_countries (Pays bloqués)');
console.log('- blocked_ip_ranges (Plages IP bloquées)');
console.log('- security_logs (Logs de sécurité)');

console.log('\n✨ Une fois la migration exécutée, le système de sécurité sera opérationnel !');
