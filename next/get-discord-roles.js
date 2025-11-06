// Script pour récupérer les IDs des rôles du serveur Discord
// Usage: node get-discord-roles.js

const DISCORD_GUILD_ID = '1285115530763829270'
const DISCORD_TOKEN = process.env.local.DISCORD_BOT_TOKEN

async function getDiscordRoles() {
  console.log('🔍 Récupération des rôles du serveur Discord...\n')
  
  if (!DISCORD_TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN non configuré dans les variables d\'environnement')
    console.log('💡 Ajoute DISCORD_BOT_TOKEN=ton_token dans ton fichier .env')
    return
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`, {
      headers: {
        'Authorization': `Bot ${DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Erreur API Discord: ${response.status} ${response.statusText}`)
    }
    
    const roles = await response.json()
    
    console.log(`✅ ${roles.length} rôles trouvés:\n`)
    
    // Grouper par type de rôle
    const payingRoles = []
    const sourceRoles = []
    const otherRoles = []
    
    roles.forEach(role => {
      const roleInfo = {
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        members: role.member_count || 0
      }
      
      const name = role.name.toLowerCase()
      
      if (name.includes('ecom') || name.includes('agent') || name.includes('premium') || 
          name.includes('vip') || name.includes('pro') || name.includes('payant')) {
        payingRoles.push(roleInfo)
      } else if (name.includes('tiktok') || name.includes('instagram') || name.includes('insta') ||
                 name.includes('google') || name.includes('telegram') || name.includes('discord') ||
                 name.includes('twitter') || name.includes('friend') || name.includes('other')) {
        sourceRoles.push(roleInfo)
      } else {
        otherRoles.push(roleInfo)
      }
    })
    
    console.log('💰 Rôles payants potentiels:')
    payingRoles.forEach(role => {
      console.log(`  ${role.name}: ${role.id} (${role.members} membres)`)
    })
    
    console.log('\n📱 Rôles de canal source potentiels:')
    sourceRoles.forEach(role => {
      console.log(`  ${role.name}: ${role.id} (${role.members} membres)`)
    })
    
    console.log('\n🔧 Autres rôles:')
    otherRoles.slice(0, 10).forEach(role => {
      console.log(`  ${role.name}: ${role.id} (${role.members} membres)`)
    })
    
    if (otherRoles.length > 10) {
      console.log(`  ... et ${otherRoles.length - 10} autres rôles`)
    }
    
    console.log('\n📋 Configuration suggérée pour discord-scraper.js:')
    console.log('const PAYING_ROLE_IDS = [')
    payingRoles.forEach(role => {
      console.log(`  '${role.id}', // ${role.name}`)
    })
    console.log(']')
    
    console.log('\nconst SOURCE_ROLE_MAPPING = {')
    sourceRoles.forEach(role => {
      const source = role.name.toLowerCase().includes('tiktok') ? 'tiktok' :
                    role.name.toLowerCase().includes('instagram') || role.name.toLowerCase().includes('insta') ? 'insta' :
                    role.name.toLowerCase().includes('google') ? 'google' :
                    role.name.toLowerCase().includes('telegram') ? 'telegram' :
                    role.name.toLowerCase().includes('discord') ? 'discord' :
                    role.name.toLowerCase().includes('twitter') ? 'twitter' :
                    role.name.toLowerCase().includes('friend') ? 'friend' : 'other'
      console.log(`  '${role.id}': '${source}', // ${role.name}`)
    })
    console.log('}')
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des rôles:', error.message)
  }
}

// Lancer la récupération des rôles
getDiscordRoles()
