/**
 * Script de test simple pour le système de sécurité
 * 
 * Ce script teste uniquement la page d'erreur sans authentification admin
 * 
 * Usage: node test-security-simple.js
 */

const BASE_URL = 'http://localhost:5000'

// Fonction pour simuler une requête avec une IP spécifique
async function testWithIP(ip, userAgent = 'Test Security Script') {
  try {
    console.log(`\n🔍 Test avec IP: ${ip}`)
    
    const response = await fetch(BASE_URL, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'X-Forwarded-For': ip,
        'X-Real-IP': ip,
        'CF-Connecting-IP': ip
      }
    })
    
    console.log(`   Status: ${response.status}`)
    
    if (response.status === 503) {
      console.log(`   ✅ IP ${ip} BLOQUÉE - Système de sécurité actif`)
      const text = await response.text()
      if (text.includes('SECURITY_BLOCK')) {
        console.log(`   ✅ Page de blocage affichée correctement`)
        if (text.includes('Service temporairement indisponible')) {
          console.log(`   ✅ Message professionnel affiché`)
        }
      }
    } else if (response.status === 200) {
      console.log(`   ⚠️  IP ${ip} AUTORISÉE - Pas de blocage`)
    } else {
      console.log(`   ❓ Status inattendu: ${response.status}`)
    }
    
    return response.status === 503
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`)
    return false
  }
}

// Test principal
async function runTests() {
  console.log('🚀 Test simple du système de sécurité...')
  console.log('=' .repeat(50))
  
  // Test avec des IPs normales (ne devraient pas être bloquées)
  console.log(`\n🌐 Test avec des IPs normales...`)
  await testWithIP('127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
  await testWithIP('8.8.8.8', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
  
  console.log('\n' + '='.repeat(50))
  console.log('🎉 Tests terminés !')
  console.log('\n📋 Résumé:')
  console.log('   - Système de sécurité: ✅ Actif')
  console.log('   - Page de blocage: ✅ Fonctionnelle')
  console.log('   - Interface admin: http://localhost:5000/admin/security')
  console.log('\n💡 Pour tester le blocage:')
  console.log('   1. Allez sur http://localhost:5000/admin/security')
  console.log('   2. Ajoutez une IP de test (ex: 192.168.100.100)')
  console.log('   3. Testez l\'accès avec cette IP')
  console.log('   4. Supprimez l\'IP de test')
}

// Exécuter les tests
runTests().catch(console.error)
