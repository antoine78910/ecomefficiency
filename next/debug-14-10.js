// Script de debug pour voir exactement qui a rejoint le 14-10
// Usage: node debug-14-10.js

require('dotenv').config({ path: '.env.local' })

const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN

async function debug14October() {
  console.log('🔍 Debug du 14 octobre 2025...\n')
  
  if (!DISCORD_TOKEN || !DISCORD_GUILD_ID) {
    console.error('❌ Variables d\'environnement manquantes')
    return
  }
  
  try {
    // Récupérer tous les membres
    console.log('📥 Récupération des membres...')
    const members = await getAllGuildMembers(DISCORD_GUILD_ID)
    console.log(`✅ ${members.length} membres récupérés`)
    
    // Filtrer ceux du 14-10
    const oct14Members = members.filter(member => {
      const joinedAt = new Date(member.joined_at)
      const joinDate = joinedAt.toISOString().slice(0, 10)
      return joinDate === '2025-10-14'
    })
    
    console.log(`\n📅 Membres du 14 octobre 2025: ${oct14Members.length}`)
    
    oct14Members.forEach((member, index) => {
      const user = member.user
      const roles = member.roles || []
      const roleNames = roles.map(id => {
        // On ne peut pas récupérer les noms des rôles ici, juste les IDs
        return id
      })
      
      console.log(`${index + 1}. ${user.username} (${user.id})`)
      console.log(`   Rôles: ${roleNames.join(', ')}`)
      console.log(`   Rejoint: ${member.joined_at}`)
      console.log('')
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

debug14October()
