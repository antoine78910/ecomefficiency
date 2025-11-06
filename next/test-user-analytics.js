// Script de test pour l'API user-analytics
// Usage: node test-user-analytics.js

const API_BASE = 'http://localhost:5000'

async function testAPI() {
  console.log('🧪 Test de l\'API user-analytics...\n')

  try {
    // Test 1: Récupérer les données des 7 derniers jours
    console.log('📊 Test 1: Données des 7 derniers jours')
    const weekResponse = await fetch(`${API_BASE}/api/user-analytics?days=7`)
    const weekData = await weekResponse.json()
    console.log('✅ Réponse:', JSON.stringify(weekData, null, 2))
    console.log('')

    // Test 2: Récupérer les totaux pour une période spécifique
    console.log('📈 Test 2: Totaux pour une période spécifique')
    const today = new Date().toISOString().slice(0, 10)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const totalsResponse = await fetch(`${API_BASE}/api/user-analytics?mode=totals&start=${weekAgo}&end=${today}`)
    const totalsData = await totalsResponse.json()
    console.log('✅ Réponse:', JSON.stringify(totalsData, null, 2))
    console.log('')

    // Test 3: Récupérer tous les totaux
    console.log('🌍 Test 3: Totaux tout le temps')
    const allTimeResponse = await fetch(`${API_BASE}/api/user-analytics?mode=alltime`)
    const allTimeData = await allTimeResponse.json()
    console.log('✅ Réponse:', JSON.stringify(allTimeData, null, 2))
    console.log('')

    // Test 4: Ajouter un utilisateur de test
    console.log('➕ Test 4: Ajouter un utilisateur de test')
    const testUser = {
      userId: 'test-user-' + Date.now(),
      email: 'test@example.com',
      source: 'google',
      joinedAt: new Date().toISOString(),
      isSubscriber: false
    }
    
    const addResponse = await fetch(`${API_BASE}/api/user-analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    })
    const addData = await addResponse.json()
    console.log('✅ Utilisateur ajouté:', JSON.stringify(addData, null, 2))
    console.log('')

    console.log('🎉 Tous les tests sont terminés!')

  } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

// Lancer les tests
testAPI()
