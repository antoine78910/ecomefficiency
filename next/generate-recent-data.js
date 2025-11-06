// Script simple pour générer des données réalistes récentes
// Usage: node generate-recent-data.js

const API_BASE = 'http://localhost:5000'

// Fonction pour générer un UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Fonction pour générer un email réaliste
function generateRealisticEmail(source) {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']
  const names = ['alex', 'marie', 'thomas', 'sarah', 'david', 'lisa', 'marc', 'julia', 'pierre', 'anna', 'lucas', 'emma', 'paul', 'chloe', 'antoine', 'lea']
  const name = names[Math.floor(Math.random() * names.length)]
  const domain = domains[Math.floor(Math.random() * domains.length)]
  const number = Math.floor(Math.random() * 99) + 1
  
  return `${name}${number}@${domain}`
}

async function generateRecentData() {
  console.log('🗑️ Nettoyage des données existantes...')
  
  // Supprimer toutes les données existantes
  try {
    const response = await fetch(`${API_BASE}/api/user-analytics`, {
      method: 'DELETE'
    })
    console.log('✅ Données existantes supprimées')
  } catch (error) {
    console.log('⚠️ Pas de données à supprimer')
  }

  console.log('📊 Génération de données récentes...\n')

  const sources = ['tiktok', 'insta', 'google', 'telegram', 'discord', 'twitter', 'friend', 'other']
  
  // Générer des données pour les 30 derniers jours
  const today = new Date()
  let totalUsers = 0
  let totalSubscribers = 0
  
  try {
    for (let day = 0; day < 30; day++) {
      const currentDate = new Date(today)
      currentDate.setDate(today.getDate() - day)
      
      for (const source of sources) {
        // Générer un nombre réaliste d'utilisateurs par jour par source
        let baseUsers = 0
        if (source === 'tiktok' || source === 'insta') {
          baseUsers = Math.floor(Math.random() * 12) + 3 // 3-15 utilisateurs
        } else if (source === 'google' || source === 'discord') {
          baseUsers = Math.floor(Math.random() * 8) + 2 // 2-10 utilisateurs
        } else {
          baseUsers = Math.floor(Math.random() * 6) + 1 // 1-7 utilisateurs
        }
        
        // Taux de conversion réaliste (5-15%)
        const conversionRate = 0.05 + Math.random() * 0.10
        const subscriberCount = Math.floor(baseUsers * conversionRate)
        
        for (let i = 0; i < baseUsers; i++) {
          const joinedAt = new Date(currentDate)
          joinedAt.setHours(Math.floor(Math.random() * 24))
          joinedAt.setMinutes(Math.floor(Math.random() * 60))
          
          const isSubscriber = i < subscriberCount
          const subscribedAt = isSubscriber ? 
            new Date(joinedAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000) : null
          
          const user = {
            userId: generateUUID(),
            email: generateRealisticEmail(source),
            source: source,
            joinedAt: joinedAt.toISOString(),
            subscribedAt: subscribedAt ? subscribedAt.toISOString() : null,
            isSubscriber: isSubscriber
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
        
        totalUsers += baseUsers
        totalSubscribers += subscriberCount
        
        if (day < 5) { // Log seulement les 5 premiers jours
          console.log(`✅ ${source} - Jour ${day}: ${baseUsers} utilisateurs (${subscriberCount} abonnés)`)
        }
      }
    }
    
    console.log(`\n🎉 Données générées avec succès!`)
    console.log(`📊 Total: ${totalUsers} utilisateurs, ${totalSubscribers} abonnés`)
    console.log(`📈 Taux de conversion global: ${((totalSubscribers/totalUsers)*100).toFixed(1)}%`)
    
    // Vérifier les résultats
    console.log('\n📈 Vérification des données...')
    const totalsResponse = await fetch(`${API_BASE}/api/user-analytics?mode=alltime`)
    const totalsData = await totalsResponse.json()
    
    if (totalsData.ok) {
      console.log('📊 Totaux par canal:')
      Object.entries(totalsData.totals).forEach(([source, data]) => {
        const conversion = ((data.subscribers / data.members) * 100).toFixed(1)
        console.log(`  ${source}: ${data.members} total, ${data.subscribers} payants (${conversion}%)`)
      })
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

// Lancer la génération de données
generateRecentData()
