// Script pour tester l'API directement
// Usage: node test-api-direct.js

require('dotenv').config({ path: '.env.local' })

const API_BASE = 'http://localhost:5000'

async function testApiDirect() {
  console.log('🔍 Test direct de l\'API...\n')
  
  const secret = process.env.CREDENTIALS_SECRET || process.env.DISCORD_ANALYTICS_SECRET || 'default-secret'
  console.log(`🔑 Secret utilisé: ${secret.substring(0, 10)}...`)
  
  try {
    console.log('📡 Appel GET vers /api/discord/analytics...')
    
    const response = await fetch(`${API_BASE}/api/discord/analytics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json'
      }
    })
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ Erreur: ${errorText}`)
      return
    }
    
    const data = await response.json()
    console.log(`✅ Données reçues:`, typeof data, Array.isArray(data) ? data.length : 'N/A')
    
    if (Array.isArray(data)) {
      console.log(`📊 ${data.length} entrées dans la base de données`)
      
      if (data.length > 0) {
        // Afficher les premières et dernières dates
        const dates = data.map(entry => entry.date).sort()
        console.log(`📅 Première date: ${dates[0]}`)
        console.log(`📅 Dernière date: ${dates[dates.length - 1]}`)
        
        // Afficher les 5 dernières entrées
        console.log('\n📋 5 dernières entrées:')
        data.slice(-5).forEach(entry => {
          console.log(`${entry.date} | ${entry.source} | ${entry.members_count} membres | ${entry.subscribers_count} abonnés`)
        })
      }
    } else {
      console.log('📊 Données reçues:', data)
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

testApiDirect()

