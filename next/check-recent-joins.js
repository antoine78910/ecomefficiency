// Script pour vérifier les dates de join les plus récentes
// Usage: node check-recent-joins.js

require('dotenv').config({ path: '.env.local' })

const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN

async function checkRecentJoins() {
  console.log('🔍 Vérification des dates de join les plus récentes...\n')
  
  if (!DISCORD_TOKEN || !DISCORD_GUILD_ID) {
    console.error('❌ Variables d\'environnement manquantes')
    return
  }
  
  try {
    // Récupérer tous les membres
    console.log('📥 Récupération des membres...')
    const members = await getAllGuildMembers(DISCORD_GUILD_ID)
    console.log(`✅ ${members.length} membres récupérés`)
    
    // Filtrer depuis septembre 2025
    const september2025 = new Date('2025-09-01')
    const recentMembers = members.filter(member => {
      const joinedAt = new Date(member.joined_at)
      return joinedAt >= september2025
    })
    
    console.log(`📅 ${recentMembers.length} membres depuis septembre 2025`)
    
    // Trier par date de join (plus récent en premier)
    recentMembers.sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at))
    
    console.log('\n📅 Les 20 dernières dates de join:')
    
    const uniqueDates = []
    recentMembers.forEach(member => {
      const joinDate = new Date(member.joined_at).toISOString().slice(0, 10)
      if (!uniqueDates.includes(joinDate)) {
        uniqueDates.push(joinDate)
      }
    })
    
    uniqueDates.slice(0, 20).forEach((date, index) => {
      const membersOnDate = recentMembers.filter(m => 
        new Date(m.joined_at).toISOString().slice(0, 10) === date
      )
      console.log(`${index + 1}. ${date}: ${membersOnDate.length} membres`)
    })
    
    console.log(`\n📊 Total de ${uniqueDates.length} jours avec des données depuis septembre 2025`)
    
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

checkRecentJoins()
