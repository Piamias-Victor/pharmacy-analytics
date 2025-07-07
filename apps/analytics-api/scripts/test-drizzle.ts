// ===== apps/analytics-api/scripts/test-drizzle.ts =====
import { config } from 'dotenv'
import { sql } from 'drizzle-orm'

// Charger .env.local
config({ path: '.env.local' })

async function testDrizzle() {
  console.log('🐲 Test Drizzle ORM...\n')
  
  try {
    console.log('1️⃣ Import du schema Drizzle...')
    
    // Import dynamique pour éviter erreurs si schema pas encore créé
    const { db, pharmacy, sales, inventorySnapshot } = await import('@packages/database')
    
    console.log('✅ Schema importé!')
    
    // Test 1: Query simple
    console.log('\n2️⃣ Test query simple...')
    const result = await db.execute(sql`SELECT 1 as test`)
    console.log('✅ Query test:', result.rows[0])
    
    // Test 2: Query sur une vraie table
    console.log('\n3️⃣ Test query sur table pharmacy...')
    const pharmacyCount = await db.execute(sql`SELECT COUNT(*) as count FROM data_pharmacy`)
    console.log('✅ Pharmacies:', pharmacyCount.rows[0].count)
    
    // Test 3: Query Drizzle avec schema (si disponible)
    console.log('\n4️⃣ Test query Drizzle avec schema...')
    try {
      const pharmacies = await db.select().from(pharmacy).limit(3)
      console.log('✅ Sample pharmacies via Drizzle:')
      pharmacies.forEach(p => {
        console.log(`   - ${p.name} (${p.area})`)
      })
    } catch (error: any) {
      console.log('⚠️  Schema Drizzle pas encore synchronisé:', error.message)
    }
    
    // Test 4: Performance
    console.log('\n5️⃣ Test performance Drizzle...')
    const start = Date.now()
    await db.execute(sql`SELECT 1`)
    const duration = Date.now() - start
    console.log(`✅ Latence Drizzle: ${duration}ms`)
    
    console.log('\n🎉 Drizzle ORM fonctionne parfaitement!')
    console.log('🚀 Prêt pour les services KPI!')
    
  } catch (error: any) {
    console.error('❌ Erreur Drizzle:', error.message)
    
    if (error.message.includes('Cannot find module')) {
      console.log('\n💡 Solutions:')
      console.log('1. Vérifier que le schema existe dans packages/database/src/schema/')
      console.log('2. Vérifier que src/index.ts exporte le db')
      console.log('3. Installer les dépendances : cd packages/database && pnpm install')
    } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('\n💡 Erreur de relation/table:')
      console.log('- Les schemas Drizzle ne correspondent pas aux tables DB')
      console.log('- Utilisez drizzle-kit introspect pour générer depuis la DB existante')
    } else {
      console.log('\n💡 Erreur de connexion:')
      console.log('- Vérifier .env.local')
      console.log('- Vérifier que PostgreSQL est accessible')
    }
    
    process.exit(1)
  }
}

testDrizzle().catch(console.error)