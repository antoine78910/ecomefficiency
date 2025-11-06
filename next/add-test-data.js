// Script pour ajouter des données de test à user_analytics
// Usage: node add-test-data.js

const API_BASE = 'http://localhost:5000'

// Fonction pour générer un UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

async function addTestData() {
  console.log('📊 Ajout de données de test...\n')

  const sources = ['tiktok', 'insta', 'google', 'telegram', 'discord', 'twitter', 'friend', 'other']
  
  try {
    // Générer des données pour les 30 derniers jours
    for (let day = 0; day < 30; day++) {
      const date = new Date()
      date.setDate(date.getDate() - day)
      
      for (const source of sources) {
        // Générer entre 1 et 8 utilisateurs par jour par source
        const userCount = Math.floor(Math.random() * 8) + 1
        const subscriberCount = Math.floor(userCount * (0.05 + Math.random() * 0.15)) // 5-20% de conversion
        
        for (let i = 0; i < userCount; i++) {
          const joinedAt = new Date(date)
          joinedAt.setHours(Math.floor(Math.random() * 24))
          joinedAt.setMinutes(Math.floor(Math.random() * 60))
          
          const user = {
            userId: generateUUID(),
            email: `user${i}@${source}.com`,
            source: source,
            joinedAt: joinedAt.toISOString(),
            subscribedAt: i < subscriberCount ? new Date(joinedAt.getTime() + 3600000).toISOString() : null,
            isSubscriber: i < subscriberCount
          }
          
          const response = await fetch(`${API_BASE}/api/user-analytics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
          })
          
          const result = await response.json()
          if (!result.ok) {
            console.error(`❌ Erreur pour ${source} jour ${day} utilisateur ${i}:`, result.error)
          }
        }
        
        console.log(`✅ ${source} - Jour ${day}: ${userCount} utilisateurs (${subscriberCount} abonnés)`)
      }
    }
    
    console.log('\n🎉 Données de test ajoutées!')
    
    // Vérifier les résultats
    console.log('\n📈 Vérification des données...')
    const totalsResponse = await fetch(`${API_BASE}/api/user-analytics?mode=alltime`)
    const totalsData = await totalsResponse.json()
    console.log('Totaux:', JSON.stringify(totalsData, null, 2))

  } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

// Lancer l'ajout de données
addTestData()
