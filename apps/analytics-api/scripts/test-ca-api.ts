// ===== apps/analytics-api/scripts/test-ca-api.ts =====
import { config } from 'dotenv'

// Charger .env.local
config({ path: '.env.local' })

const API_BASE = 'http://localhost:3001/api/v1'

interface TestCase {
  name: string
  url: string
  expectedTime?: number
  description: string
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Summary Global',
    url: '/kpis/ca?detail=summary',
    expectedTime: 100,
    description: 'CA total toutes pharmacies - ultra rapide'
  },
  {
    name: 'Summary Période',
    url: '/kpis/ca?detail=summary&startDate=2024-01-01&endDate=2024-01-31',
    expectedTime: 100,
    description: 'CA janvier 2024 - toutes pharmacies'
  },
  {
    name: 'Par Pharmacie',
    url: '/kpis/ca?detail=pharmacy&startDate=2024-01-01&endDate=2024-01-31',
    expectedTime: 200,
    description: 'CA détaillé par pharmacie - janvier 2024'
  },
  {
    name: 'Top Produits',
    url: '/kpis/ca?detail=product&limit=10',
    expectedTime: 300,
    description: 'Top 10 produits par CA - 12 derniers mois'
  },
  {
    name: 'Pharmacies Spécifiques',
    url: '/kpis/ca?detail=pharmacy&pharmacyIds[]=action-pharma-id',
    expectedTime: 150,
    description: 'CA pour pharmacies spécifiques'
  },
  {
    name: 'Rapport Complet',
    url: '/kpis/ca?detail=full&startDate=2024-01-01&endDate=2024-01-31',
    expectedTime: 500,
    description: 'Rapport complet - ATTENTION: lourd'
  }
]

async function testAPI() {
  console.log('🧪 Test API KPI CA Flexible\n')
  
  console.log('📋 Cas de test:')
  TEST_CASES.forEach((test, i) => {
    console.log(`${i + 1}. ${test.name} - ${test.description}`)
  })
  console.log('')
  
  for (const [index, testCase] of TEST_CASES.entries()) {
    console.log(`\n🔍 Test ${index + 1}: ${testCase.name}`)
    console.log(`📍 URL: ${testCase.url}`)
    
    const start = Date.now()
    
    try {
      const response = await fetch(`${API_BASE}${testCase.url}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const duration = Date.now() - start
      
      if (!response.ok) {
        console.log(`❌ HTTP ${response.status}: ${response.statusText}`)
        const errorText = await response.text()
        console.log(`   Détail: ${errorText.substring(0, 200)}...`)
        continue
      }
      
      const data = await response.json()
      
      // Vérifier la structure de réponse
      if (!data.success) {
        console.log(`❌ API Error: ${data.error}`)
        if (data.details) console.log(`   Détails:`, data.details)
        continue
      }
      
      // Analyser la réponse selon le type
      const result = data.data
      console.log(`✅ Succès en ${duration}ms`)
      
      // Performance check
      if (testCase.expectedTime && duration > testCase.expectedTime * 2) {
        console.log(`⚠️  Performance: ${duration}ms > ${testCase.expectedTime * 2}ms attendu`)
      } else if (testCase.expectedTime && duration <= testCase.expectedTime) {
        console.log(`🚀 Performance excellente: ${duration}ms <= ${testCase.expectedTime}ms`)
      }
      
      // Analyser le contenu selon le détail
      if (result.totalCA) {
        console.log(`💰 CA Total: ${result.totalCA.toLocaleString()}€`)
      }
      
      if (result.counts) {
        console.log(`📊 Données: ${result.counts.pharmacies} pharmacies, ${result.counts.products} produits, ${result.counts.transactions} ventes`)
      }
      
      if (result.byPharmacy) {
        console.log(`🏥 Top 3 pharmacies:`)
        result.byPharmacy.slice(0, 3).forEach((p: any, i: number) => {
          console.log(`   ${i + 1}. ${p.name} - ${p.ca.toLocaleString()}€ (${p.percentage}%)`)
        })
      }
      
      if (result.byProduct) {
        console.log(`📦 Top 3 produits:`)
        result.byProduct.slice(0, 3).forEach((p: any, i: number) => {
          console.log(`   ${i + 1}. ${p.name} - ${p.ca.toLocaleString()}€`)
        })
      }
      
      if (result.pagination) {
        console.log(`📄 Pagination: ${result.pagination.hasMore ? 'Plus de données' : 'Fin'}, cursor: ${result.pagination.cursor || 'N/A'}`)
      }
      
      // Métadonnées
      if (result.meta) {
        console.log(`⚡ Performance: ${result.meta.performance.queryTime}ms (${result.meta.performance.queryComplexity})`)
        console.log(`💾 Cache: TTL ${result.meta.cache.ttl}s`)
      }
      
      // Headers de réponse
      const cacheControl = response.headers.get('cache-control')
      const queryTime = response.headers.get('x-query-time')
      if (cacheControl) console.log(`📦 Cache headers: ${cacheControl}`)
      if (queryTime) console.log(`⏱️  Query time header: ${queryTime}`)
      
    } catch (error) {
      const duration = Date.now() - start
      console.log(`❌ Erreur réseau après ${duration}ms:`, error.message)
    }
  }
  
  console.log('\n🎉 Tests terminés!')
  console.log('\n💡 Pour tester avec vos vraies données:')
  console.log('1. Récupérez des UUIDs de pharmacies réelles')
  console.log('2. Récupérez des EAN13 de produits réels')
  console.log('3. Adaptez les URLs de test ci-dessus')
}

// Test spécial POST avec beaucoup d'EAN13
async function testPOSTWithManyEAN13() {
  console.log('\n🧪 Test POST avec nombreux EAN13...')
  
  // Exemple avec 100 EAN13 fictifs
  const manyEAN13s = Array.from({ length: 100 }, (_, i) => 
    `123456789012${i.toString().padStart(1, '0')}`
  )
  
  const body = {
    detail: 'product',
    ean13s: manyEAN13s,
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    limit: 20
  }
  
  const start = Date.now()
  
  try {
    const response = await fetch(`${API_BASE}/kpis/ca`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    
    const duration = Date.now() - start
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ POST avec ${manyEAN13s.length} EAN13 en ${duration}ms`)
      if (data.success) {
        console.log(`💰 Résultat: ${data.data.byProduct?.length || 0} produits trouvés`)
      }
    } else {
      console.log(`❌ POST failed: ${response.status}`)
    }
  } catch (error) {
    console.log(`❌ POST error:`, error.message)
  }
}

// Execution
async function runAllTests() {
  await testAPI()
  await testPOSTWithManyEAN13()
}

runAllTests().catch(console.error)