/**
 * Script pour redémarrer le serveur avec nettoyage du cache
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Redémarrage du serveur Next.js...');

// Nettoyer le cache Next.js
const nextCachePath = path.join(__dirname, '.next');
if (fs.existsSync(nextCachePath)) {
  console.log('🧹 Nettoyage du cache Next.js...');
  try {
    fs.rmSync(nextCachePath, { recursive: true, force: true });
    console.log('✅ Cache nettoyé');
  } catch (error) {
    console.log('⚠️ Erreur lors du nettoyage du cache:', error.message);
  }
}

// Nettoyer le cache node_modules/.cache
const nodeModulesCache = path.join(__dirname, 'node_modules', '.cache');
if (fs.existsSync(nodeModulesCache)) {
  console.log('🧹 Nettoyage du cache node_modules...');
  try {
    fs.rmSync(nodeModulesCache, { recursive: true, force: true });
    console.log('✅ Cache node_modules nettoyé');
  } catch (error) {
    console.log('⚠️ Erreur lors du nettoyage du cache node_modules:', error.message);
  }
}

console.log('\n🚀 Démarrage du serveur...');
console.log('💡 Utilisez Ctrl+C pour arrêter le serveur');

// Démarrer le serveur
const server = exec('npm run dev', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Erreur lors du démarrage:', error);
    return;
  }
  if (stderr) {
    console.error('⚠️ Avertissements:', stderr);
  }
  console.log('📊 Sortie:', stdout);
});

server.stdout.on('data', (data) => {
  console.log(data.toString());
});

server.stderr.on('data', (data) => {
  console.error(data.toString());
});

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur...');
  server.kill();
  process.exit(0);
});
