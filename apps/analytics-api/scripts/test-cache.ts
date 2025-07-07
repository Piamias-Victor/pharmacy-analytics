// ===== apps/analytics-api/scripts/test-cache-advanced.ts =====
import { config } from 'dotenv'

config({ path: '.env.local' })

const API_BASE = 'http://localhost:3001/api/v1'

interface TestResult {
  name: string
  duration: number
  cacheStatus: string
  success: boolean
  error?: string
}

async function makeRequest(url: string, method: 'GET' | 'POST' | 'DELETE' = 'GET', body?: any): Promise<TestResult> {
  const start = Date.now()
  
  try {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' }
    }
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body)
    }
    
    const response = await fetch(`${API_BASE}${url}`, options)
    const duration = Date.now() - start
    const cacheStatus = response.headers.get('x-cache-status') || 'UNKNOWN'
    
    if (!response.ok) {
      const errorText = await response.text()
      return {
        name: url,
        duration,
        cacheStatus,
        success: false,
        error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`
      }
    }
    
    const data = await response.json()
    return {
      name: url,
      duration,
      cacheStatus,
      success: data.success !== false
    }
  } catch (error) {
    const duration = Date.now() - start
    return {
      name: url,
      duration,
      cacheStatus: 'ERROR',
      success: false,
      error: error.message
    }
  }
}

async function testCachePerformance() {
  console.log('🧪 Test Cache Performance Avancé\n')
  
  const testUrl = '/kpis/ca?detail=summary&startDate=2024-01-01&endDate=2024-01-31'
  
  console.log('📋 Test sequence:')
  console.log('1. Warm cache')
  console.log('2. First call (MISS)')
  console.log('3. Second call (HIT)')
  console.log('4. Third call (HIT)')
  console.log('5. Invalidate cache')
  console.log('6. Fourth call (MISS again)\n')
  
  const results: TestResult[] = []
  
  // 1. Warm cache d'abord
  console.log('🔥 1. Warming cache...')
  const warmResult = await makeRequest('/kpis/ca?action=warm', 'DELETE')
  results.push({ ...warmResult, name: 'Warm Cache' })
  console.log(`   ${warmResult.success ? '✅' : '❌'} ${warmResult.duration}ms`)
  
  // 2. Premier appel après warm - pourrait être HIT ou MISS
  console.log('\n💨 2. First call after warm...')
  const result1 = await makeRequest(testUrl)
  results.push({ ...result1, name: 'Call 1 (after warm)' })
  console.log(`   ${result1.success ? '✅' : '❌'} ${result1.duration}ms - Cache: ${result1.cacheStatus}`)
  
  // 3. Deuxième appel - devrait être HIT
  console.log('\n🚀 3. Second call (should be HIT)...')
  const result2 = await makeRequest(testUrl)
  results.push({ ...result2, name: 'Call 2 (should hit)' })
  console.log(`   ${result2.success ? '✅' : '❌'} ${result2.duration}ms - Cache: ${result2.cacheStatus}`)
  
  // 4. Troisième appel - devrait aussi être HIT
  console.log('\n⚡ 4. Third call (should be HIT)...')
  const result3 = await makeRequest(testUrl)
  results.push({ ...result3, name: 'Call 3 (should hit)' })
  console.log(`   ${result3.success ? '✅' : '❌'} ${result3.duration}ms - Cache: ${result3.cacheStatus}`)
  
  // 5. Invalidation du cache
  console.log('\n🗑️  5. Invalidating all cache...')
  const invalidateResult = await makeRequest('/kpis/ca?action=invalidate-all', 'DELETE')
  results.push({ ...invalidateResult, name: 'Invalidate Cache' })
  console.log(`   ${invalidateResult.success ? '✅' : '❌'} ${invalidateResult.duration}ms`)
  
  // 6. Quatrième appel après invalidation - devrait être MISS
  console.log('\n💨 6. Fourth call after invalidation (should be MISS)...')
  const result4 = await makeRequest(testUrl)
  results.push({ ...result4, name: 'Call 4 (after invalidation)' })
  console.log(`   ${result4.success ? '✅' : '❌'} ${result4.duration}ms - Cache: ${result4.cacheStatus}`)
  
  // Analyse des résultats
  console.log('\n📊 ANALYSE DES RÉSULTATS')
  console.log('=' .repeat(50))
  
  const cacheHits = results.filter(r => r.cacheStatus === 'HIT')
  const cacheMisses = results.filter(r => r.cacheStatus === 'MISS')
  
  console.log(`🎯 Cache Hits: ${cacheHits.length}`)
  console.log(`💥 Cache Misses: ${cacheMisses.length}`)
  
  if (cacheHits.length > 0 && cacheMisses.length > 0) {
    const avgHitTime = cacheHits.reduce((sum, r) => sum + r.duration, 0) / cacheHits.length
    const avgMissTime = cacheMisses.reduce((sum, r) => sum + r.duration, 0) / cacheMisses.length
    const improvement = Math.round(((avgMissTime - avgHitTime) / avgMissTime) * 100)
    
    console.log(`⚡ Temps moyen Cache HIT: ${Math.round(avgHitTime)}ms`)
    console.log(`💨 Temps moyen Cache MISS: ${Math.round(avgMissTime)}ms`)
    console.log(`🚀 Amélioration: ${improvement}% plus rapide avec cache !`)
    
    if (improvement > 80) {
      console.log('🏆 Cache ultra-performant !')
    } else if (improvement > 50) {
      console.log('✅ Cache performant !')
    } else if (improvement > 20) {
      console.log('⚠️  Cache fonctionnel mais peut être optimisé')
    } else {
      console.log('❌ Cache peu efficace - vérifier la configuration')
    }
  }
  
  // Tableau récapitulatif
  console.log('\n📋 DÉTAIL DES APPELS')
  console.log('=' .repeat(50))
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌'
    const cache = result.cacheStatus.padEnd(7)
    const time = `${result.duration}ms`.padEnd(8)
    console.log(`${index + 1}. ${status} ${cache} ${time} ${result.name}`)
    if (result.error) {
      console.log(`     Error: ${result.error}`)
    }
  })
}

async function testDifferentLevels() {
  console.log('\n\n🎯 Test Cache par Niveau de Détail\n')
  
  const levels = [
    { detail: 'summary', expected: '< 100ms' },
    { detail: 'pharmacy', expected: '< 200ms' },
    { detail: 'product', expected: '< 300ms' }
  ]
  
  for (const level of levels) {
    console.log(`📊 Test niveau: ${level.detail}`)
    
    // Premier appel (MISS)
    const miss = await makeRequest(`/kpis/ca?detail=${level.detail}&startDate=2024-01-01&endDate=2024-01-31`)
    console.log(`   💨 MISS: ${miss.duration}ms`)
    
    // Deuxième appel (HIT)
    const hit = await makeRequest(`/kpis/ca?detail=${level.detail}&startDate=2024-01-01&endDate=2024-01-31`)
    console.log(`   🚀 HIT:  ${hit.duration}ms (${hit.cacheStatus})`)
    
    const improvement = miss.duration > 0 ? Math.round(((miss.duration - hit.duration) / miss.duration) * 100) : 0
    console.log(`   📈 Gain: ${improvement}%\n`)
  }
}

async function testCacheStats() {
  console.log('\n📊 Stats du Cache\n')
  
  const stats = await makeRequest('/kpis/ca?action=stats', 'DELETE')
  if (stats.success) {
    console.log('✅ Configuration cache active')
    console.log('🔧 Provider: Upstash Redis + Memory')
    console.log('⏰ TTL Summary: 1h')
    console.log('⏰ TTL Pharmacy: 30min')
    console.log('⏰ TTL Product: 15min')
  } else {
    console.log('❌ Impossible de récupérer les stats cache')
  }
}

// Execution
async function runAllCacheTests() {
  try {
    await testCachePerformance()
    await testDifferentLevels()
    await testCacheStats()
    
    console.log('\n🎉 Tests cache terminés !')
    console.log('\n💡 Commandes de gestion cache disponibles:')
    console.log('• DELETE /api/v1/kpis/ca?action=warm')
    console.log('• DELETE /api/v1/kpis/ca?action=invalidate-all')
    console.log('• DELETE /api/v1/kpis/ca?action=stats')
    
  } catch (error) {
    console.error('❌ Erreur pendant les tests:', error)
  }
}

runAllCacheTests().catch(console.error)