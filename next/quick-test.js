// Script de test rapide pour vérifier les données
// Usage: node quick-test.js

const API_BASE = 'http://localhost:5000'

async function quickTest() {
  console.log('🧪 Test rapide des données...\n')

  try {
    // Test 1: Vérifier les totaux
    console.log('📊 Test 1: Totaux tout le temps')
    const totalsResponse = await fetch(`${API_BASE}/api/user-analytics?mode=alltime`)
    const totalsData = await totalsResponse.json()
    
    if (totalsData.ok) {
      console.log('✅ Totaux récupérés:')
      Object.entries(totalsData.totals).forEach(([source, data]) => {
        const conversion = ((data.subscribers / data.members) * 100).toFixed(1)
        console.log(`  ${source}: ${data.members} total, ${data.subscribers} payants (${conversion}%)`)
      })
    } else {
      console.log('❌ Erreur totaux:', totalsData.error)
    }

    // Test 2: Vérifier les données des 7 derniers jours
    console.log('\n📅 Test 2: Données des 7 derniers jours')
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 7)
    const startStr = startDate.toISOString().slice(0, 10)
    const endStr = endDate.toISOString().slice(0, 10)

    const rangeResponse = await fetch(`${API_BASE}/api/user-analytics?start=${startStr}&end=${endStr}`)
    const rangeData = await rangeResponse.json()
    
    if (rangeData.ok) {
      console.log(`✅ Données des 7 derniers jours (${rangeData.rows.length} entrées):`)
      const dailyTotals = {}
      rangeData.rows.forEach(row => {
        if (!dailyTotals[row.date]) {
          dailyTotals[row.date] = { total: 0, payants: 0 }
        }
        dailyTotals[row.date].total += row.members_count
        dailyTotals[row.date].payants += row.subscribers_count
      })
      
      Object.entries(dailyTotals).forEach(([date, data]) => {
        const conversion = ((data.payants / data.total) * 100).toFixed(1)
        console.log(`  ${date}: ${data.total} total, ${data.payants} payants (${conversion}%)`)
      })
    } else {
      console.log('❌ Erreur données 7 jours:', rangeData.error)
    }

    // Test 3: Vérifier les totaux par période
    console.log('\n📈 Test 3: Totaux par période')
    const periodTotalsResponse = await fetch(`${API_BASE}/api/user-analytics?mode=totals&start=${startStr}&end=${endStr}`)
    const periodTotalsData = await periodTotalsResponse.json()
    
    if (periodTotalsData.ok) {
      console.log('✅ Totaux par période:')
      Object.entries(periodTotalsData.totals).forEach(([source, data]) => {
        const conversion = ((data.subscribers / data.members) * 100).toFixed(1)
        console.log(`  ${source}: ${data.members} total, ${data.subscribers} payants (${conversion}%)`)
      })
    } else {
      console.log('❌ Erreur totaux période:', periodTotalsData.error)
    }

    console.log('\n🎉 Tests terminés!')

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message)
  }
}

// Lancer les tests
quickTest()
