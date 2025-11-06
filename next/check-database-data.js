// Script pour vérifier les données dans la base de données
// Usage: node check-database-data.js

require('dotenv').config({ path: '.env.local' })

const API_BASE = 'http://localhost:5000'

async function checkDatabaseData() {
  console.log('🔍 Vérification des données dans la base de données...\n')
  
  const secret = process.env.CREDENTIALS_SECRET || process.env.DISCORD_ANALYTICS_SECRET || 'default-secret'
  
  try {
    // Récupérer toutes les données
    const response = await fetch(`${API_BASE}/api/discord/analytics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secret}`
      }
    })
    
    if (!response.ok) {
      console.error(`❌ Erreur API: ${response.status} ${response.statusText}`)
      return
    }
    
    const data = await response.json()
    console.log(`✅ ${data.length} entrées dans la base de données`)
    
    // Grouper par date
    const dates = {}
    data.forEach(entry => {
      if (!dates[entry.date]) {
        dates[entry.date] = []
      }
      dates[entry.date].push(entry)
    })
    
    // Afficher les dates disponibles
    const sortedDates = Object.keys(dates).sort()
    console.log(`\n📅 Dates disponibles (${sortedDates.length} jours):`)
    
    sortedDates.slice(-20).forEach(date => {
      const dayData = dates[date]
      const totalMembers = dayData.reduce((sum, entry) => sum + entry.members_count, 0)
      const totalSubscribers = dayData.reduce((sum, entry) => sum + entry.subscribers_count, 0)
      console.log(`${date}: ${totalMembers} membres, ${totalSubscribers} abonnés`)
    })
    
    console.log(`\n📊 Première date: ${sortedDates[0]}`)
    console.log(`📊 Dernière date: ${sortedDates[sortedDates.length - 1]}`)
    
    // Vérifier spécifiquement les dates récentes
    const recentDates = ['2025-10-27', '2025-10-26', '2025-10-25', '2025-09-30', '2025-09-29']
    console.log('\n🔍 Vérification des dates récentes:')
    
    recentDates.forEach(date => {
      if (dates[date]) {
        const dayData = dates[date]
        const totalMembers = dayData.reduce((sum, entry) => sum + entry.members_count, 0)
        const totalSubscribers = dayData.reduce((sum, entry) => sum + entry.subscribers_count, 0)
        console.log(`✅ ${date}: ${totalMembers} membres, ${totalSubscribers} abonnés`)
      } else {
        console.log(`❌ ${date}: Pas de données`)
      }
    })
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

checkDatabaseData()

