/**
 * Script de test pour vérifier la géolocalisation
 */

require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function testGeolocation() {
  console.log('🧪 Test de géolocalisation\n')
  
  // Tester différentes IPs
  const testIPs = [
    '127.0.0.1',              // localhost
    '203.150.43.106',         // IP publique de test (Thaïlande)
    '8.8.8.8'                 // Google DNS (US)
  ]
  
  for (const ip of testIPs) {
    console.log(`\n🔍 Test avec IP: ${ip}`)
    
    try {
      const response = await fetch(`https://ipapi.co/${ip}/json/`)
      const data = await response.json()
      
      if (data.error) {
        console.log('❌ Erreur:', data.reason)
      } else {
        console.log('✅ Pays:', data.country_name, `(${data.country_code})`)
        console.log('   Ville:', data.city || 'N/A')
      }
    } catch (error) {
      console.log('❌ Erreur réseau:', error.message)
    }
  }
  
  console.log('\n\n📋 Vérification de la base de données')
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('❌ Variables d\'environnement Supabase non configurées')
    return
  }
  
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    
    const { data: countries, error } = await supabase
      .from('blocked_countries')
      .select('*')
    
    if (error) {
      console.log('❌ Erreur DB:', error.message)
    } else {
      console.log('✅ Pays bloqués trouvés:', countries.length)
      countries.forEach(c => {
        console.log(`   - ${c.country_name} (${c.country_code}) - Actif: ${c.is_active}`)
      })
    }
  } catch (error) {
    console.log('❌ Erreur:', error.message)
  }
}

testGeolocation()
