// Script complet pour scraper Discord avec analyse automatique des rôles
// Usage: node discord-scraper.js

// Charger les variables d'environnement depuis .env.local
require('dotenv').config({ path: '.env.local' })

const API_BASE = 'http://localhost:5000'

// Configuration Discord
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN

// Variables globales pour les rôles
let guildRoles = {}

// IDs des rôles payants (Ecom Agents)
const PAYING_ROLE_IDS = [
  '1244916325294542858', // 🕵️ Ecom Agent
]

// IDs des rôles de canal source
const SOURCE_ROLE_MAPPING = {
  '1408078649281876039': 'tiktok',     // TikTok
  '1408078877397487646': 'insta',      // Instagram
  '1408079255014871111': 'google',     // Google
  '1408079300170616852': 'telegram',   // Telegram
  '1408079374410059867': 'discord',    // Discord
  '1408080180991365231': 'twitter',    // Twitter
  '1408079878724648971': 'friend',     // Friend
  '1408079965819244564': 'other',      // Other
}

async function scrapeDiscordData() {
  console.log('🤖 Début du scraping Discord complet...\n')
  
  if (!DISCORD_TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN non configuré dans les variables d\'environnement')
    console.log('💡 Ajoute DISCORD_BOT_TOKEN=ton_token dans ton fichier .env.local')
    return
  }
  
  if (!DISCORD_GUILD_ID) {
    console.error('❌ DISCORD_GUILD_ID non configuré dans les variables d\'environnement')
    console.log('💡 Ajoute DISCORD_GUILD_ID=ton_id_serveur dans ton fichier .env.local')
    return
  }
  
  console.log(`🔑 Token Discord chargé: ${DISCORD_TOKEN.substring(0, 10)}...`)
  console.log(`🏠 Serveur Discord: ${DISCORD_GUILD_ID}`)

  try {
    // 1. Récupérer tous les rôles du serveur
    console.log('🎭 Récupération des rôles du serveur...')
    await loadGuildRoles()
    console.log(`✅ ${Object.keys(guildRoles).length} rôles chargés`)
    
    // 2. Afficher les rôles configurés
    console.log('\n🔍 Rôles configurés:')
    console.log(`💰 ${PAYING_ROLE_IDS.length} rôles payants configurés`)
    console.log(`📱 ${Object.keys(SOURCE_ROLE_MAPPING).length} rôles de canal source configurés`)
    
    // Afficher les détails des rôles
    PAYING_ROLE_IDS.forEach(roleId => {
      const role = guildRoles[roleId]
      if (role) {
        console.log(`  💰 ${role.name} (${roleId})`)
      } else {
        console.log(`  ❌ Rôle payant non trouvé: ${roleId}`)
      }
    })
    
    Object.entries(SOURCE_ROLE_MAPPING).forEach(([roleId, source]) => {
      const role = guildRoles[roleId]
      if (role) {
        console.log(`  📱 ${role.name} -> ${source} (${roleId})`)
      } else {
        console.log(`  ❌ Rôle source non trouvé: ${roleId}`)
      }
    })

    // 3. Récupérer tous les membres du serveur
    console.log('\n📥 Récupération des membres du serveur...')
    const members = await getAllGuildMembers(DISCORD_GUILD_ID)
    console.log(`✅ ${members.length} membres récupérés`)

    // 4. Analyser chaque membre avec les rôles réels
    console.log('\n🔍 Analyse des membres avec leurs rôles...')
    console.log('📅 Filtrage: seuls les membres depuis juillet 2025 seront inclus (UTC+2)')
    const analyzedMembers = []
    let filteredCount = 0
    
    for (let i = 0; i < members.length; i++) {
      const member = members[i]
      const analysis = analyzeMemberWithRealRoles(member)
      if (analysis) {
        analyzedMembers.push(analysis)
      } else {
        filteredCount++
      }
      
      // Progress indicator
      if ((i + 1) % 100 === 0) {
        console.log(`  📊 ${i + 1}/${members.length} membres analysés...`)
      }
    }
    
    console.log(`✅ ${analyzedMembers.length} membres analysés avec succès`)
    console.log(`🚫 ${filteredCount} membres filtrés (avant septembre 2025)`)

    // 5. Grouper par date et canal
    console.log('\n📊 Groupement des données par date et canal...')
    const dailyData = groupByDateAndSource(analyzedMembers)
    
    // 6. Afficher les résultats détaillés
    console.log('\n📈 Résultats du scraping:')
    displayDetailedResults(dailyData)

    // 7. Vérifier le comptage
    console.log('\n🔍 Vérification du comptage...')
    verifyCounting(dailyData, analyzedMembers)

    // 8. Envoyer les données au dashboard
    console.log('\n📤 Envoi des données au dashboard...')
    await sendToDashboard(dailyData)

    console.log('\n🎉 Scraping terminé avec succès!')
    console.log('💾 Les données sont maintenant dans le dashboard /admin')

  } catch (error) {
    console.error('❌ Erreur lors du scraping:', error.message)
  }
}

async function loadGuildRoles() {
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
  
  // Stocker les rôles par ID
  roles.forEach(role => {
    guildRoles[role.id] = {
      id: role.id,
      name: role.name,
      color: role.color,
      position: role.position
    }
  })
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

function analyzeMemberWithRealRoles(member) {
  const user = member.user
  const memberRoles = member.roles || []
  
  // Déterminer la date de join
  const joinedAt = new Date(member.joined_at)
  
  // Filtrer les membres qui ont rejoint avant juillet 2025
  const july2025 = new Date('2025-07-01')
  const today = new Date()
  
  if (joinedAt < july2025) {
    return null // Ignorer les membres d'avant juillet 2025
  }
  
  if (joinedAt > today) {
    return null // Ignorer les membres du futur (au cas où)
  }
  
  // Convertir en UTC+2 pour le comptage des dates
  const utcPlus2 = new Date(joinedAt.getTime() + (2 * 60 * 60 * 1000))
  const joinDate = utcPlus2.toISOString().slice(0, 10)
  
  // Déterminer si c'est un membre payant
  let isPaying = false
  let source = 'other' // Par défaut "other" pour les membres sans rôle de canal
  let sourceRole = null
  
  // Analyser les rôles réels
  for (const roleId of memberRoles) {
    const role = guildRoles[roleId]
    if (!role) continue
    
    // Vérifier si c'est un rôle payant (utilise les IDs configurés)
    if (PAYING_ROLE_IDS.includes(roleId)) {
      isPaying = true
    }
    
    // Vérifier si c'est un rôle de canal source (utilise les IDs configurés)
    if (SOURCE_ROLE_MAPPING[roleId]) {
      source = SOURCE_ROLE_MAPPING[roleId]
      sourceRole = role.name
    }
  }
  
  return {
    userId: user.id,
    username: user.username,
    joinDate: joinDate,
    source: source,
    sourceRole: sourceRole,
    isPaying: isPaying,
    roles: memberRoles.map(id => guildRoles[id]?.name).filter(Boolean)
  }
}

function groupByDateAndSource(members) {
  const dailyData = {}
  
  members.forEach(member => {
    const date = member.joinDate
    const source = member.source // Utilise directement la source (déjà "nouveau" par défaut)
    
    if (!dailyData[date]) {
      dailyData[date] = {}
    }
    
    if (!dailyData[date][source]) {
      dailyData[date][source] = {
        members: 0,
        subscribers: 0,
        membersList: []
      }
    }
    
    dailyData[date][source].members += 1
    dailyData[date][source].membersList.push({
      username: member.username,
      sourceRole: member.sourceRole,
      isPaying: member.isPaying,
      roles: member.roles
    })
    
    if (member.isPaying) {
      dailyData[date][source].subscribers += 1
    }
  })
  
  return dailyData
}

function displayDetailedResults(dailyData) {
  const dates = Object.keys(dailyData).sort().reverse()
  
  console.log(`📅 ${dates.length} jours avec des données:`)
  
  // Afficher les 15 dernières dates
  dates.slice(0, 15).forEach(date => {
    const dayData = dailyData[date]
    const totalMembers = Object.values(dayData).reduce((sum, item) => sum + item.members, 0)
    const totalSubscribers = Object.values(dayData).reduce((sum, item) => sum + item.subscribers, 0)
    
    console.log(`\n📅 ${date}: ${totalMembers} membres, ${totalSubscribers} abonnés`)
    
    Object.entries(dayData).forEach(([source, data]) => {
      const conversion = ((data.subscribers / data.members) * 100).toFixed(1)
      console.log(`  📱 ${source}: ${data.members} membres, ${data.subscribers} abonnés (${conversion}%)`)
      
      // Afficher quelques exemples de membres
      const examples = data.membersList.slice(0, 3)
      examples.forEach(member => {
        const status = member.isPaying ? '💰' : '🆓'
        console.log(`    ${status} ${member.username} (${member.sourceRole || 'no role'})`)
      })
      if (data.membersList.length > 3) {
        console.log(`    ... et ${data.membersList.length - 3} autres`)
      }
    })
  })
  
  // Statistiques globales
  console.log('\n📊 Statistiques globales:')
  const allMembers = Object.values(dailyData).flatMap(day => 
    Object.values(day).flatMap(source => source.membersList)
  )
  
  const totalMembers = allMembers.length
  const totalSubscribers = allMembers.filter(m => m.isPaying).length
  const globalConversion = ((totalSubscribers / totalMembers) * 100).toFixed(1)
  
  console.log(`  👥 Total membres: ${totalMembers}`)
  console.log(`  💰 Total abonnés: ${totalSubscribers}`)
  console.log(`  📈 Conversion globale: ${globalConversion}%`)
  
  // Répartition par canal
  const sourceStats = {}
  allMembers.forEach(member => {
    const source = member.sourceRole || 'other'
    if (!sourceStats[source]) {
      sourceStats[source] = { members: 0, subscribers: 0 }
    }
    sourceStats[source].members += 1
    if (member.isPaying) {
      sourceStats[source].subscribers += 1
    }
  })
  
  console.log('\n📱 Répartition par canal:')
  Object.entries(sourceStats).forEach(([source, stats]) => {
    const conversion = ((stats.subscribers / stats.members) * 100).toFixed(1)
    console.log(`  ${source}: ${stats.members} membres, ${stats.subscribers} abonnés (${conversion}%)`)
  })
}

function verifyCounting(dailyData, analyzedMembers) {
  console.log('📊 Vérification des totaux:')
  
  // Compter tous les membres par date
  const membersByDate = {}
  analyzedMembers.forEach(member => {
    const date = member.joinDate
    if (!membersByDate[date]) {
      membersByDate[date] = { total: 0, paying: 0 }
    }
    membersByDate[date].total += 1
    if (member.isPaying) {
      membersByDate[date].paying += 1
    }
  })
  
  // Vérifier chaque date
  Object.keys(dailyData).sort().forEach(date => {
    const dayData = dailyData[date]
    const totalMembers = Object.values(dayData).reduce((sum, item) => sum + item.members, 0)
    const totalSubscribers = Object.values(dayData).reduce((sum, item) => sum + item.subscribers, 0)
    
    const expected = membersByDate[date]
    if (expected) {
      if (totalMembers !== expected.total) {
        console.log(`❌ ${date}: Compté ${totalMembers}, attendu ${expected.total}`)
      } else {
        console.log(`✅ ${date}: ${totalMembers} membres, ${totalSubscribers} abonnés`)
      }
    }
  })
}

async function sendToDashboard(dailyData) {
  const dates = Object.keys(dailyData).sort()
  const secret = process.env.CREDENTIALS_SECRET || process.env.DISCORD_ANALYTICS_SECRET || 'default-secret'
  
  console.log(`🔑 Utilisation du secret: ${secret.substring(0, 10)}...`)
  
  for (const date of dates) {
    const dayData = dailyData[date]
    const rows = Object.entries(dayData).map(([source, data]) => ({
      date: date,
      source: source,
      members_count: data.members,
      subscribers_count: data.subscribers
    }))
    
    try {
      const response = await fetch(`${API_BASE}/api/discord/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secret}`
        },
        body: JSON.stringify({
          date: date,
          rows: rows
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        console.log(`✅ Données du ${date} envoyées (${rows.length} entrées)`)
      } else {
        console.log(`❌ Erreur pour ${date}: ${response.status} - ${result.error || 'Unknown error'}`)
        
        // Si c'est une erreur 500, on peut essayer de supprimer les données existantes d'abord
        if (response.status === 500) {
          console.log(`🔄 Tentative de suppression des données existantes pour ${date}...`)
          await deleteExistingData(date, secret)
          
          // Réessayer l'insertion
          const retryResponse = await fetch(`${API_BASE}/api/discord/analytics`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${secret}`
            },
            body: JSON.stringify({
              date: date,
              rows: rows
            })
          })
          
          if (retryResponse.ok) {
            console.log(`✅ Données du ${date} envoyées après retry (${rows.length} entrées)`)
          } else {
            console.log(`❌ Erreur persistante pour ${date}: ${retryResponse.status}`)
          }
        }
      }
    } catch (error) {
      console.log(`❌ Erreur réseau pour ${date}:`, error.message)
    }
  }
}

async function deleteExistingData(date, secret) {
  try {
    // Supprimer les données existantes pour cette date
    const response = await fetch(`${API_BASE}/api/discord/analytics?date=${date}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${secret}`
      }
    })
    
    if (response.ok) {
      console.log(`🗑️ Données existantes supprimées pour ${date}`)
    } else {
      console.log(`⚠️ Impossible de supprimer les données pour ${date}`)
    }
  } catch (error) {
    console.log(`⚠️ Erreur lors de la suppression pour ${date}:`, error.message)
  }
}

// Lancer le scraping complet
scrapeDiscordData()