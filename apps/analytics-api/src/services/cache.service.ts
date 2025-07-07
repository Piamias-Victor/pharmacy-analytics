// ===== apps/analytics-api/src/services/cache.service.ts =====
import { Redis } from '@upstash/redis'

export class CacheService {
  private redis: Redis
  private memoryCache = new Map<string, { data: any; expiry: number }>()

  constructor() {
    this.redis = new Redis({
      url: process.env.REDIS_URL!,
      token: process.env.REDIS_TOKEN!
    })
  }

  /**
   * Get from cache (Memory first, then Redis)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // L1: Memory cache (ultra rapide)
      const memCached = this.memoryCache.get(key)
      if (memCached && memCached.expiry > Date.now()) {
        console.log('🚀 Cache hit (memory)', key.substring(0, 50))
        return memCached.data
      }

      // L2: Redis cache
      const redisCached = await this.redis.get(key)
      if (redisCached) {
        console.log('⚡ Cache hit (redis)', key.substring(0, 50))
        
        // Repopulate memory cache
        this.memoryCache.set(key, {
          data: redisCached,
          expiry: Date.now() + (5 * 60 * 1000) // 5min in memory
        })
        
        return redisCached as T
      }

      console.log('❌ Cache miss', key.substring(0, 50))
      return null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }

  /**
   * Set cache (Both memory and Redis)
   */
  async set<T>(key: string, data: T, ttlSeconds: number = 3600): Promise<void> {
    try {
      // Set Redis cache
      await this.redis.setex(key, ttlSeconds, JSON.stringify(data))
      
      // Set memory cache (max 5min)
      const memoryTTL = Math.min(ttlSeconds, 300)
      this.memoryCache.set(key, {
        data,
        expiry: Date.now() + (memoryTTL * 1000)
      })

      console.log(`💾 Cache set: ${key.substring(0, 50)} (TTL: ${ttlSeconds}s)`)
    } catch (error) {
      console.error('Cache set error:', error)
    }
  }

  /**
   * Invalidate cache pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Clear memory cache
      for (const [key] of this.memoryCache) {
        if (key.includes(pattern.replace('*', ''))) {
          this.memoryCache.delete(key)
        }
      }

      // Note: Upstash Redis ne supporte pas KEYS/SCAN
      // On utilisera des tags pour l'invalidation
      console.log(`🗑️  Cache pattern invalidated: ${pattern}`)
    } catch (error) {
      console.error('Cache invalidation error:', error)
    }
  }

  /**
   * Generate cache key for KPI CA
   */
  generateCAKey(params: any): string {
    const parts = [
      'ca',
      params.detail || 'summary',
      params.startDate || 'all',
      params.endDate || 'all',
      params.pharmacyIds?.length ? `ph:${params.pharmacyIds.length}` : 'ph:all',
      params.ean13s?.length ? `ean:${params.ean13s.length}` : 'ean:all',
      params.limit || '',
      params.cursor || ''
    ].filter(Boolean)
    
    return `kpi:${parts.join(':')}`
  }

  /**
   * Get TTL by detail level
   */
  getTTL(detail: string): number {
    const ttls = {
      summary: 3600,    // 1h - très stable
      pharmacy: 1800,   // 30min - moyennement stable
      product: 900,     // 15min - change plus souvent
      full: 600         // 10min - lourd, cache court
    }
    return ttls[detail as keyof typeof ttls] || 3600
  }
}

// Singleton instance
export const cacheService = new CacheService()
