// Script pour tester la connexion Discord et récupérer l'ID du serveur
// Usage: node test-discord-connection.js

require('dotenv').config({ path: '.env.local' })

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN

async function testDiscordConnection() {
  console.log('🔍 Test de connexion Discord...\n')
  
  if (!DISCORD_TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN non configuré')
    return
  }
  
  console.log(`🔑 Token: ${DISCORD_TOKEN.substring(0, 10)}...`)
  
  try {
    // Test 1: Récupérer les informations du bot
    console.log('\n🤖 Test 1: Informations du bot...')
    const botResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bot ${DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (botResponse.ok) {
      const botInfo = await botResponse.json()
      console.log(`✅ Bot connecté: ${botInfo.username}#${botInfo.discriminator}`)
      console.log(`🆔 Bot ID: ${botInfo.id}`)
    } else {
      console.log(`❌ Erreur bot: ${botResponse.status} ${botResponse.statusText}`)
      return
    }
    
    // Test 2: Récupérer les serveurs du bot
    console.log('\n🏠 Test 2: Serveurs du bot...')
    const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        'Authorization': `Bot ${DISCORD_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (guildsResponse.ok) {
      const guilds = await guildsResponse.json()
      console.log(`✅ ${guilds.length} serveur(s) trouvé(s):`)
      
      guilds.forEach(guild => {
        console.log(`  🏠 ${guild.name} (ID: ${guild.id})`)
        console.log(`     👑 Propriétaire: ${guild.owner ? 'Oui' : 'Non'}`)
        console.log(`     🔑 Permissions: ${guild.permissions}`)
      })
      
      if (guilds.length > 0) {
        console.log('\n💡 Utilise l\'ID du serveur dans discord-scraper.js')
        console.log(`💡 Remplace DISCORD_GUILD_ID par: ${guilds[0].id}`)
      }
    } else {
      console.log(`❌ Erreur serveurs: ${guildsResponse.status} ${guildsResponse.statusText}`)
    }
    
    // Test 3: Si on a un serveur, tester les rôles
    if (guilds && guilds.length > 0) {
      const guildId = guilds[0].id
      console.log(`\n🎭 Test 3: Rôles du serveur ${guilds[0].name}...`)
      
      const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers: {
          'Authorization': `Bot ${DISCORD_TOKEN}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (rolesResponse.ok) {
        const roles = await rolesResponse.json()
        console.log(`✅ ${roles.length} rôle(s) trouvé(s):`)
        
        roles.forEach(role => {
          console.log(`  🎭 ${role.name} (ID: ${role.id})`)
          console.log(`     🎨 Couleur: #${role.color.toString(16).padStart(6, '0')}`)
          console.log(`     📊 Position: ${role.position}`)
        })
      } else {
        console.log(`❌ Erreur rôles: ${rolesResponse.status} ${rolesResponse.statusText}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  }
}

testDiscordConnection()
