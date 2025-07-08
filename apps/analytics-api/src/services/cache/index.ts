// ===== apps/analytics-api/src/services/cache/index.ts =====
// Exports centralisés pour tous les services cache

// ==========================================
// EXPORTS BASE CACHE
// ==========================================

export * from './base.cache'
export {
  BaseCacheService,
  createCacheService
} from './base.cache'
export type {
  CacheOperationResult,
  CacheMetrics
} from './base.cache'

// ==========================================
// EXPORTS CA CACHE
// ==========================================

export * from './ca.cache'
export {
  CACacheService,
  caCacheService,
  CA_CACHE_PATTERNS
} from './ca.cache'
export type {
  CACacheKey
} from './ca.cache'

// ==========================================
// EXPORTS MARGE CACHE (PRÉPARÉ POUR FUTUR)
// ==========================================

// export * from './marge.cache'
// export {
//   MargeCacheService,
//   margeCacheService,
//   MARGE_CACHE_PATTERNS
// } from './marge.cache'

// ==========================================
// FACTORY FUNCTIONS
// ==========================================

export function createCACache() {
  return new CACacheService()
}

// export function createMargeCache() {
//   return new MargeCacheService()
// }

// ==========================================
// CACHE REGISTRY (POUR GESTION CENTRALISÉE)
// ==========================================

export const cacheRegistry = {
  ca: caCacheService,
  // marge: margeCacheService, // À ajouter plus tard
} as const

export type CacheType = keyof typeof cacheRegistry

/**
 * Obtenir un service cache par type
 */
export function getCacheService(type: CacheType) {
  return cacheRegistry[type]
}

/**
 * Invalider tous les caches
 */
export async function invalidateAllCaches(): Promise<void> {
  const promises = Object.values(cacheRegistry).map(cache => cache.clear())
  await Promise.all(promises)
  console.log('[Cache Registry] All caches invalidated')
}

/**
 * Obtenir les stats de tous les caches
 */
export async function getAllCacheStats() {
  const stats: Record<string, any> = {}
  
  for (const [type, cache] of Object.entries(cacheRegistry)) {
    try {
      stats[type] = await cache.getStats()
    } catch (error) {
      stats[type] = { error: error.message }
    }
  }
  
  return stats
}

/**
 * Préchauffer tous les caches
 */
export async function warmAllCaches(): Promise<void> {
  console.log('[Cache Registry] Starting global cache warming...')
  
  const promises = Object.entries(cacheRegistry).map(async ([type, cache]) => {
    try {
      await cache.warmCache()
      console.log(`[Cache Registry] ${type} cache warmed successfully`)
    } catch (error) {
      console.error(`[Cache Registry] Failed to warm ${type} cache:`, error)
    }
  })
  
  await Promise.all(promises)
  console.log('[Cache Registry] Global cache warming completed')
}