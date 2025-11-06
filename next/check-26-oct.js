// Script pour vérifier spécifiquement le 26 octobre avec UTC+2
// Usage: node check-26-oct.js

require('dotenv').config({ path: '.env.local' })

const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN

async function check26October() {
  console.log('🔍 Vérification spécifique du 26 octobre 2025 (UTC+2)...\n')
  
  if (!DISCORD_TOKEN || !DISCORD_GUILD_ID) {
    console.error('❌ Variables d\'environnement manquantes')
    return
  }
  
  try {
    // Récupérer tous les membres
    console.log('📥 Récupération des membres...')
    const members = await getAllGuildMembers(DISCORD_GUILD_ID)
    console.log(`✅ ${members.length} membres récupérés`)
    
    // Filtrer depuis juillet 2025
    const july2025 = new Date('2025-07-01')
    const recentMembers = members.filter(member => {
      const joinedAt = new Date(member.joined_at)
      return joinedAt >= july2025
    })
    
    console.log(`📅 ${recentMembers.length} membres depuis juillet 2025`)
    
    // Analyser spécifiquement le 26 octobre
    const october26Members = []
    
    recentMembers.forEach(member => {
      const joinedAt = new Date(member.joined_at)
      
      // Convertir en UTC+2
      const utcPlus2 = new Date(joinedAt.getTime() + (2 * 60 * 60 * 1000))
      const joinDate = utcPlus2.toISOString().slice(0, 10)
      
      if (joinDate === '2025-10-26') {
        october26Members.push({
          username: member.user.username,
          joinedAt: joinedAt.toISOString(),
          utcPlus2: utcPlus2.toISOString(),
          roles: member.roles || []
        })
      }
    })
    
    console.log(`\n📅 Membres du 26 octobre 2025 (UTC+2): ${october26Members.length}`)
    
    october26Members.forEach((member, index) => {
      console.log(`${index + 1}. ${member.username}`)
      console.log(`   UTC: ${member.joinedAt}`)
      console.log(`   UTC+2: ${member.utcPlus2}`)
      console.log(`   Rôles: ${member.roles.length}`)
    })
    
    // Vérifier aussi le 25 octobre pour voir s'il y a des membres qui ont rejoint tard
    console.log('\n🔍 Vérification du 25 octobre (pour comparaison):')
    
    const october25Members = []
    recentMembers.forEach(member => {
      const joinedAt = new Date(member.joined_at)
      const utcPlus2 = new Date(joinedAt.getTime() + (2 * 60 * 60 * 1000))
      const joinDate = utcPlus2.toISOString().slice(0, 10)
      
      if (joinDate === '2025-10-25') {
        october25Members.push({
          username: member.user.username,
          joinedAt: joinedAt.toISOString(),
          utcPlus2: utcPlus2.toISOString()
        })
      }
    })
    
    console.log(`📅 Membres du 25 octobre 2025 (UTC+2): ${october25Members.length}`)
    
    // Vérifier les heures de join pour le 25 octobre (pour voir s'il y en a qui ont rejoint tard)
    october25Members.forEach((member, index) => {
      const hour = new Date(member.utcPlus2).getHours()
      if (hour >= 22) { // Après 22h UTC+2
        console.log(`${member.username} - ${member.utcPlus2} (${hour}h UTC+2)`)
      }
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

check26October()
