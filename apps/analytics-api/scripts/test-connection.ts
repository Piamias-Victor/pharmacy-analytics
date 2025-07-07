// ===== apps/analytics-api/scripts/test-connection.ts (AVEC CONFIG QUI MARCHE) =====
import { config } from 'dotenv'
import { Pool } from 'pg'

// Charger explicitement .env.local
config({ path: '.env.local' })

console.log('🔍 Vérification variables d\'environnement...\n')

// Vérifier DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL non définie')
  process.exit(1)
}

console.log('✅ Variables d\'environnement OK')
console.log('📊 Configuration:')
console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`)
console.log(`   Database: ${process.env.DB_NAME}`)
console.log(`   User: ${process.env.DB_USER}`)

// Test connexion avec VOTRE configuration qui marche
async function testConnection() {
  console.log('\n🔌 Test connexion PostgreSQL...')
  
  try {
    // Configuration identique à votre projet qui fonctionne
    const pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      ssl: {
        rejectUnauthorized: false // Votre config qui marche
      }
    })
    
    // Gestion erreurs pool (comme dans votre code)
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
    })
    
    console.log('⏳ Connexion en cours...')
    const client = await pool.connect()
    console.log('✅ Connexion réussie!')
    
    // Test version PostgreSQL
    console.log('\n📊 Informations serveur:')
    const versionResult = await client.query('SELECT version()')
    console.log('✅ Version:', versionResult.rows[0].version.split(' ')[1])
    
    // Test des tables existantes
    console.log('\n📋 Vérification des tables existantes...')
    const tablesResult = await client.query(`
      SELECT tablename, schemaname 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE 'data_%'
      ORDER BY tablename
    `)
    
    if (tablesResult.rows.length > 0) {
      console.log('✅ Tables trouvées:')
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.schemaname}.${row.tablename}`)
      })
      
      // Test comptage des données principales
      console.log('\n📊 Comptage des données:')
      const mainTables = ['data_pharmacy', 'data_sales', 'data_inventorysnapshot', 'data_internalproduct']
      
      for (const table of mainTables) {
        try {
          const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`)
          const count = parseInt(countResult.rows[0].count)
          console.log(`✅ ${table}: ${count.toLocaleString()} lignes`)
        } catch (error: any) {
          console.log(`⚠️  ${table}: ${error.message}`)
        }
      }
      
      // Sample des données pharmacy pour validation
      console.log('\n🏥 Sample pharmacies:')
      try {
        const sampleResult = await client.query(`
          SELECT id, name, ca, area 
          FROM data_pharmacy 
          ORDER BY name 
          LIMIT 5
        `)
        sampleResult.rows.forEach(row => {
          console.log(`   - ${row.name} (${row.area}) - CA: ${row.ca}€`)
        })
      } catch (error: any) {
        console.log(`⚠️  Erreur sample: ${error.message}`)
      }
      
    } else {
      console.log('⚠️  Aucune table "data_*" trouvée')
      
      // Vérifier toutes les tables
      const allTablesResult = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
        LIMIT 10
      `)
      
      if (allTablesResult.rows.length > 0) {
        console.log('\n📋 Tables publiques existantes:')
        allTablesResult.rows.forEach(row => {
          console.log(`   - ${row.tablename}`)
        })
      }
    }
    
    // Test performance
    console.log('\n⚡ Test performance:')
    const start = Date.now()
    await client.query('SELECT 1')
    const duration = Date.now() - start
    console.log(`✅ Latence: ${duration}ms`)
    
    client.release()
    await pool.end()
    
    console.log('\n🎉 Connexion PostgreSQL validée!')
    console.log('🚀 Prêt pour Drizzle ORM!')
    
  } catch (error: any) {
    console.error('❌ Erreur connexion:', error.message)
    console.log('📊 Code erreur:', error.code)
    process.exit(1)
  }
}

testConnection().catch(console.error)