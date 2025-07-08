// ===== apps/analytics-api/src/services/cache/base.cache.ts =====
// Cache abstrait avec méthodes communes pour tous les KPIs

import { Redis } from '@upstash/redis'
import { KPIDetailLevel } from '@/types/common'

// ==========================================
// CONFIGURATION CACHE
// ==========================================

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

interface CacheConfig {
  enableRedis: boolean
  enableMemory: boolean
  defaultTTL: number
  maxMemoryEntries: number
  redisKeyPrefix: string
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enableRedis: !!REDIS_URL && !!REDIS_TOKEN,
  enableMemory: true,
  defaultTTL: 3600,
  maxMemoryEntries: 1000,
  redisKeyPrefix: 'pharmacy-analytics'
}

// ==========================================
// CLASSE CACHE ABSTRAITE
// ==========================================

export abstract class BaseCacheService {
  protected redis: Redis | null = null
  protected memoryCache = new Map<string, { data: unknown; expiresAt: number }>()
  protected config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config }
    
    if (this.config.enableRedis && REDIS_URL && REDIS_TOKEN) {
      this.redis = new Redis({
        url: REDIS_URL,
        token: REDIS_TOKEN
      })
    }
  }

  // ==========================================
  // MÉTHODES PUBLIQUES GÉNÉRIQUES
  // ==========================================

  /**
   * Récupérer une valeur du cache (Redis puis Memory fallback)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.buildFullKey(key)

      // 1. Essayer Redis d'abord
      if (this.redis) {
        const redisValue = await this.redis.get(fullKey)
        if (redisValue !== null) {
          return redisValue as T
        }
      }

      // 2. Fallback sur Memory cache
      if (this.config.enableMemory) {
        const memoryEntry = this.memoryCache.get(fullKey)
        if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
          return memoryEntry.data as T
        }
        
        // Nettoyer entrée expirée
        if (memoryEntry) {
          this.memoryCache.delete(fullKey)
        }
      }

      return null
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      return null
    }
  }

  /**
   * Stocker une valeur dans le cache (Redis + Memory)
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const fullKey = this.buildFullKey(key)
      const finalTTL = ttl || this.config.defaultTTL

      // 1. Stocker dans Redis
      if (this.redis) {
        await this.redis.setex(fullKey, finalTTL, JSON.stringify(data))
      }

      // 2. Stocker dans Memory cache
      if (this.config.enableMemory) {
        // Vérifier la limite de mémoire
        if (this.memoryCache.size >= this.config.maxMemoryEntries) {
          this.evictOldestMemoryEntries()
        }

        this.memoryCache.set(fullKey, {
          data,
          expiresAt: Date.now() + (finalTTL * 1000)
        })
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
    }
  }

  /**
   * Invalider un pattern de clés
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const fullPattern = this.buildFullKey(pattern)

      // 1. Invalider dans Redis
      if (this.redis) {
        const keys = await this.redis.keys(fullPattern)
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      }

      // 2. Invalider dans Memory cache
      if (this.config.enableMemory) {
        const regex = new RegExp(fullPattern.replace('*', '.*'))
        const keysToDelete: string[] = []
        
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            keysToDelete.push(key)
          }
        }
        
        keysToDelete.forEach(key => this.memoryCache.delete(key))
      }
    } catch (error) {
      console.error(`Cache invalidate pattern error for ${pattern}:`, error)
    }
  }

  /**
   * Vider complètement le cache
   */
  async clear(): Promise<void> {
    try {
      // 1. Vider Redis (seulement nos clés)
      if (this.redis) {
        const pattern = `${this.config.redisKeyPrefix}:*`
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      }

      // 2. Vider Memory cache
      if (this.config.enableMemory) {
        this.memoryCache.clear()
      }
    } catch (error) {
      console.error('Cache clear error:', error)
    }
  }

  /**
   * Statistiques du cache
   */
  async getStats(): Promise<{
    redis: { connected: boolean; keyCount?: number }
    memory: { entryCount: number; sizeEstimate: string }
    config: CacheConfig
  }> {
    const stats = {
      redis: { connected: false },
      memory: { 
        entryCount: this.memoryCache.size,
        sizeEstimate: `~${Math.round(this.memoryCache.size * 0.5)} KB`
      },
      config: this.config
    }

    if (this.redis) {
      try {
        const pattern = `${this.config.redisKeyPrefix}:*`
        const keys = await this.redis.keys(pattern)
        stats.redis = { 
          connected: true, 
          keyCount: keys.length 
        }
      } catch (error) {
        console.error('Redis stats error:', error)
      }
    }

    return stats
  }

  // ==========================================
  // MÉTHODES ABSTRAITES À IMPLÉMENTER
  // ==========================================

  /**
   * Générer une clé de cache spécifique au KPI
   */
  abstract generateKey(params: any): string

  /**
   * Obtenir le TTL spécifique selon le niveau de détail
   */
  abstract getTTL(detail: KPIDetailLevel): number

  /**
   * Préchauffer le cache avec des requêtes communes
   */
  abstract warmCache(): Promise<void>

  // ==========================================
  // MÉTHODES PROTÉGÉES UTILITAIRES
  // ==========================================

  /**
   * Construire la clé complète avec préfixe
   */
  protected buildFullKey(key: string): string {
    return `${this.config.redisKeyPrefix}:${key}`
  }

  /**
   * Éviction des entrées les plus anciennes en mémoire
   */
  protected evictOldestMemoryEntries(): void {
    const entries = Array.from(this.memoryCache.entries())
    const sortedEntries = entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt)
    
    // Supprimer 25% des entrées les plus anciennes
    const toRemove = Math.floor(this.config.maxMemoryEntries * 0.25)
    for (let i = 0; i < toRemove && i < sortedEntries.length; i++) {
      this.memoryCache.delete(sortedEntries[i][0])
    }
  }

  /**
   * Nettoyer les entrées expirées en mémoire
   */
  protected cleanExpiredMemoryEntries(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.memoryCache.delete(key))
  }

  /**
   * Logger pour debug cache
   */
  protected logCacheOperation(operation: string, key: string, hit: boolean = false): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Cache ${operation}] ${key} - ${hit ? 'HIT' : 'MISS'}`)
    }
  }

  /**
   * Valider les paramètres avant génération de clé
   */
  protected validateParams(params: any): void {
    if (!params || typeof params !== 'object') {
      throw new Error('Cache params must be a valid object')
    }
  }

  /**
   * Hacher les paramètres complexes pour créer des clés courtes
   */
  protected hashParams(params: any): string {
    const str = JSON.stringify(params, Object.keys(params).sort())
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Exécuter une opération avec cache automatique
   */
  protected async executeWithCache<T>(
    operation: () => Promise<T>,
    cacheKey: string,
    ttl?: number
  ): Promise<{ data: T; fromCache: boolean }> {
    // 1. Vérifier le cache
    const cached = await this.get<T>(cacheKey)
    if (cached !== null) {
      this.logCacheOperation('GET', cacheKey, true)
      return { data: cached, fromCache: true }
    }

    // 2. Exécuter l'opération
    this.logCacheOperation('GET', cacheKey, false)
    const data = await operation()

    // 3. Mettre en cache
    await this.set(cacheKey, data, ttl)
    this.logCacheOperation('SET', cacheKey)

    return { data, fromCache: false }
  }
}

// ==========================================
// TYPES POUR CONFIGURATION CACHE
// ==========================================

export interface CacheOperationResult<T> {
  data: T
  fromCache: boolean
  key: string
  ttl: number
}

export interface CacheMetrics {
  hitRate: number
  missRate: number
  totalOperations: number
  avgResponseTime: number
  memoryUsage: number
  redisConnected: boolean
}

// ==========================================
// FACTORY POUR CRÉER DES CACHES SPÉCIALISÉS
// ==========================================

export function createCacheService<T extends BaseCacheService>(
  CacheClass: new (config?: Partial<CacheConfig>) => T,
  config?: Partial<CacheConfig>
): T {
  return new CacheClass(config)
}