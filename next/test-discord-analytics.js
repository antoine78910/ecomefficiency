// Test de l'API discord/analytics originale
// Usage: node test-discord-analytics.js

const API_BASE = 'http://localhost:5000'

async function testDiscordAnalytics() {
  console.log('🧪 Test de l\'API discord/analytics originale...\n')

  try {
    // Test 1: Récupérer les données des 30 derniers jours
    console.log('📊 Test 1: Données des 30 derniers jours')
    const response = await fetch(`${API_BASE}/api/discord/analytics?days=30`)
    const data = await response.json()
    
    if (data.ok) {
      console.log(`✅ ${data.rows.length} entrées récupérées`)
      
      // Grouper par date
      const byDate = {}
      data.rows.forEach(row => {
        if (!byDate[row.date]) {
          byDate[row.date] = {}
        }
        byDate[row.date][row.source] = {
          members: row.members_count,
          subscribers: row.subscribers_count
        }
      })
      
      // Afficher les 10 dernières dates
      const dates = Object.keys(byDate).sort().reverse().slice(0, 10)
      console.log('\n📅 10 dernières dates avec données:')
      dates.forEach(date => {
        const dayData = byDate[date]
        const totalMembers = Object.values(dayData).reduce((sum, item) => sum + item.members, 0)
        const totalSubscribers = Object.values(dayData).reduce((sum, item) => sum + item.subscribers, 0)
        console.log(`  ${date}: ${totalMembers} membres, ${totalSubscribers} abonnés`)
      })
      
      // Afficher les totaux par canal
      console.log('\n📈 Totaux par canal:')
      const totals = {}
      data.rows.forEach(row => {
        if (!totals[row.source]) {
          totals[row.source] = { members: 0, subscribers: 0 }
        }
        totals[row.source].members += row.members_count
        totals[row.source].subscribers += row.subscribers_count
      })
      
      Object.entries(totals).forEach(([source, data]) => {
        const conversion = ((data.subscribers / data.members) * 100).toFixed(1)
        console.log(`  ${source}: ${data.members} membres, ${data.subscribers} abonnés (${conversion}%)`)
      })
      
    } else {
      console.log('❌ Erreur:', data.error)
    }

    // Test 2: Récupérer les totaux tout le temps
    console.log('\n🌍 Test 2: Totaux tout le temps')
    const totalsResponse = await fetch(`${API_BASE}/api/discord/analytics?mode=alltime`)
    const totalsData = await totalsResponse.json()
    
    if (totalsData.ok) {
      console.log('✅ Totaux tout le temps:')
      Object.entries(totalsData.totals).forEach(([source, data]) => {
        const conversion = ((data.subscribers / data.members) * 100).toFixed(1)
        console.log(`  ${source}: ${data.members} membres, ${data.subscribers} abonnés (${conversion}%)`)
      })
    } else {
      console.log('❌ Erreur totaux:', totalsData.error)
    }

    // Test 3: Récupérer les données pour une période spécifique
    console.log('\n📅 Test 3: Données pour une période spécifique')
    const startDate = '2025-10-01'
    const endDate = '2025-10-27'
    const periodResponse = await fetch(`${API_BASE}/api/discord/analytics?start=${startDate}&end=${endDate}`)
    const periodData = await periodResponse.json()
    
    if (periodData.ok) {
      console.log(`✅ Période ${startDate} à ${endDate}: ${periodData.rows.length} entrées`)
      
      // Afficher les dates disponibles
      const dates = [...new Set(periodData.rows.map(r => r.date))].sort().reverse()
      console.log(`📅 Dates disponibles: ${dates.slice(0, 5).join(', ')}${dates.length > 5 ? '...' : ''}`)
    } else {
      console.log('❌ Erreur période:', periodData.error)
    }

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message)
  }
}

// Lancer les tests
testDiscordAnalytics()
