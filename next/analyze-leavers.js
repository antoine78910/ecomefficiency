// Script pour analyser les membres qui ont quitté le serveur Discord
// Usage: node analyze-leavers.js

require('dotenv').config({ path: '.env.local' })

const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN

async function analyzeLeavers() {
  console.log('🔍 Analyse des membres qui ont quitté le serveur...\n')
  
  if (!DISCORD_TOKEN || !DISCORD_GUILD_ID) {
    console.error('❌ Variables d\'environnement manquantes')
    return
  }
  
  try {
    // Récupérer tous les membres actuels
    console.log('📥 Récupération des membres actuels...')
    const currentMembers = await getAllGuildMembers(DISCORD_GUILD_ID)
    console.log(`✅ ${currentMembers.length} membres actuels`)
    
    // Analyser les dates de join pour voir les patterns
    const july2025 = new Date('2025-07-01')
    const today = new Date()
    
    const recentMembers = currentMembers.filter(member => {
      const joinedAt = new Date(member.joined_at)
      return joinedAt >= july2025 && joinedAt <= today
    })
    
    console.log(`📅 ${recentMembers.length} membres depuis juillet 2025`)
    
    // Grouper par date (UTC+2)
    const dailyJoins = {}
    const dailyLeaves = {}
    
    recentMembers.forEach(member => {
      const joinedAt = new Date(member.joined_at)
      const utcPlus2 = new Date(joinedAt.getTime() + (2 * 60 * 60 * 1000))
      const joinDate = utcPlus2.toISOString().slice(0, 10)
      
      if (!dailyJoins[joinDate]) {
        dailyJoins[joinDate] = 0
      }
      dailyJoins[joinDate] += 1
    })
    
    // Calculer les membres qui ont quitté
    // On ne peut pas récupérer directement qui a quitté, mais on peut estimer
    // en regardant les patterns de croissance
    
    console.log('\n📊 Analyse des joins et estimation des leaves:')
    console.log('📅 Date | Joins | Estimation Leaves | Net')
    console.log('─'.repeat(50))
    
    const dates = Object.keys(dailyJoins).sort()
    let cumulativeMembers = 0
    
    dates.forEach(date => {
      const joins = dailyJoins[date]
      cumulativeMembers += joins
      
      // Estimation basée sur les patterns typiques de Discord
      // On suppose qu'environ 5-10% des membres quittent par jour
      const estimatedLeaves = Math.round(joins * 0.05) // 5% estimation
      const netGrowth = joins - estimatedLeaves
      
      console.log(`${date} | ${joins.toString().padStart(5)} | ${estimatedLeaves.toString().padStart(15)} | ${netGrowth.toString().padStart(3)}`)
    })
    
    console.log(`\n📈 Total membres analysés: ${cumulativeMembers}`)
    console.log(`📊 Estimation totale des leaves: ${Math.round(cumulativeMembers * 0.05)}`)
    
    // Vérifier les dates spécifiques mentionnées
    console.log('\n🔍 Vérification des dates spécifiques:')
    
    const specificDates = ['2025-09-30', '2025-10-26']
    specificDates.forEach(date => {
      const joins = dailyJoins[date] || 0
      console.log(`${date}: ${joins} membres ont rejoint`)
    })
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

async function getAllGuildMembers(guildId) {
  const members = []
  let after = null
  
  while (true) {
    const url = `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000${after ? `&after=${after}` : ''}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bot ${DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Erreur API Discord: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    members.push(...data)
    
    if (data.length < 1000) break
    after = data[data.length - 1].user.id
  }
  
  return members
}

analyzeLeavers()
