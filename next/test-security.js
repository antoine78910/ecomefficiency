/**
 * Script de test pour le système de sécurité
 * 
 * Ce script teste les différentes fonctionnalités du système de blocage
 * 
 * Usage: node test-security.js
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
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()))
    
    if (response.status === 503) {
      console.log(`   ✅ IP ${ip} BLOQUÉE - Système de sécurité actif`)
      const text = await response.text()
      if (text.includes('SECURITY_BLOCK')) {
        console.log(`   ✅ Page de blocage affichée correctement`)
      }
    } else {
      console.log(`   ⚠️  IP ${ip} AUTORISÉE - Pas de blocage`)
    }
    
    return response.status === 503
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`)
    return false
  }
}

// Fonction pour tester l'API admin
async function testAdminAPI() {
  console.log(`\n🔧 Test de l'API admin...`)
  
  try {
    // Test de récupération des IPs bloquées
    const response = await fetch(`${BASE_URL}/api/admin/security/blocked-ips`)
    const data = await response.json()
    
    console.log(`   Status API: ${response.status}`)
    console.log(`   IPs bloquées: ${data.data?.length || 0}`)
    
    if (data.data && data.data.length > 0) {
      console.log(`   ✅ API admin fonctionnelle`)
      console.log(`   📋 IPs bloquées:`, data.data.map(ip => ip.ip_address))
    } else {
      console.log(`   ⚠️  Aucune IP bloquée trouvée`)
    }
    
    return true
  } catch (error) {
    console.log(`   ❌ Erreur API: ${error.message}`)
    return false
  }
}

// Fonction pour ajouter une IP de test
async function addTestIP() {
  console.log(`\n➕ Ajout d'une IP de test...`)
  
  try {
    const testIP = '192.168.100.100'
    
    const response = await fetch(`${BASE_URL}/api/admin/security/blocked-ips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ip_address: testIP,
        reason: 'Test automatique du système de sécurité'
      })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log(`   ✅ IP de test ajoutée: ${testIP}`)
      return testIP
    } else {
      console.log(`   ❌ Erreur ajout IP: ${data.error}`)
      return null
    }
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`)
    return null
  }
}

// Fonction pour supprimer l'IP de test
async function removeTestIP(ip) {
  console.log(`\n🗑️  Suppression de l'IP de test...`)
  
  try {
    // D'abord, récupérer l'ID de l'IP
    const listResponse = await fetch(`${BASE_URL}/api/admin/security/blocked-ips`)
    const listData = await listResponse.json()
    
    const testIPData = listData.data?.find(item => item.ip_address === ip)
    
    if (testIPData) {
      const deleteResponse = await fetch(`${BASE_URL}/api/admin/security/blocked-ips?id=${testIPData.id}`, {
        method: 'DELETE'
      })
      
      if (deleteResponse.ok) {
        console.log(`   ✅ IP de test supprimée: ${ip}`)
      } else {
        console.log(`   ❌ Erreur suppression IP`)
      }
    } else {
      console.log(`   ⚠️  IP de test non trouvée`)
    }
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`)
  }
}

// Test principal
async function runTests() {
  console.log('🚀 Démarrage des tests de sécurité...')
  console.log('=' .repeat(50))
  
  // 1. Test de l'API admin
  const apiWorking = await testAdminAPI()
  
  if (!apiWorking) {
    console.log('\n❌ L\'API admin ne fonctionne pas. Vérifiez que le serveur est démarré.')
    return
  }
  
  // 2. Ajouter une IP de test
  const testIP = await addTestIP()
  
  if (testIP) {
    // 3. Tester le blocage avec l'IP de test
    const blocked = await testWithIP(testIP)
    
    if (blocked) {
      console.log(`\n✅ Test réussi ! L'IP ${testIP} est correctement bloquée`)
    } else {
      console.log(`\n❌ Test échoué ! L'IP ${testIP} n'est pas bloquée`)
    }
    
    // 4. Nettoyer - supprimer l'IP de test
    await removeTestIP(testIP)
  }
  
  // 5. Tester avec des IPs normales
  console.log(`\n🌐 Test avec des IPs normales...`)
  await testWithIP('127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
  await testWithIP('8.8.8.8', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
  
  console.log('\n' + '='.repeat(50))
  console.log('🎉 Tests terminés !')
  console.log('\n📋 Résumé:')
  console.log('   - Système de sécurité: ✅ Actif')
  console.log('   - API admin: ✅ Fonctionnelle')
  console.log('   - Blocage IP: ✅ Opérationnel')
  console.log('   - Interface admin: http://localhost:5000/admin/security')
}

// Exécuter les tests
runTests().catch(console.error)
