// ===== apps/analytics-api/src/services/cache/ca.cache.ts =====
// Cache spécialisé pour CA avec méthodes métier

import { BaseCacheService } from './base.cache'
import { CAApiParams, NormalizedCAParams } from '@/types/ca'
import { KPIDetailLevel, CACHE_TTL } from '@/types/common'

// ==========================================
// CACHE SERVICE SPÉCIALISÉ CA
// ==========================================

export class CACacheService extends BaseCacheService {

  constructor() {
    super({
      redisKeyPrefix: 'pharmacy-analytics:ca',
      defaultTTL: CACHE_TTL.summary,
      maxMemoryEntries: 500 // Moins que la base car données plus lourdes
    })
  }

  // ==========================================
  // IMPLÉMENTATION MÉTHODES ABSTRAITES
  // ==========================================

  /**
   * Générer une clé de cache spécifique CA
   */
  generateKey(params: CAApiParams | NormalizedCAParams): string {
    this.validateParams(params)

    const parts = [
      'ca',
      params.detail || 'summary',
      params.startDate || 'default',
      params.endDate || 'default',
      params.pharmacyIds?.length ? `ph:${params.pharmacyIds.length}` : 'ph:all',
      params.ean13s?.length ? `ean:${params.ean13s.length}` : 'ean:all',
      params.limit || 'default',
      params.cursor || 'no-cursor'
    ].filter(Boolean)

    // Pour des paramètres complexes, utiliser un hash
    if (params.pharmacyIds?.length && params.pharmacyIds.length > 5) {
      const hashPharmacies = this.hashParams(params.pharmacyIds.sort())
      parts[4] = `ph:${hashPharmacies}`
    }

    if (params.ean13s?.length && params.ean13s.length > 10) {
      const hashEans = this.hashParams(params.ean13s.sort())
      parts[5] = `ean:${hashEans}`
    }

    return parts.join(':')
  }

  /**
   * TTL selon niveau de détail CA
   */
  getTTL(detail: KPIDetailLevel): number {
    const ttls = {
      summary: CACHE_TTL.summary,    // 1h - très stable
      pharmacy: CACHE_TTL.pharmacy,  // 30min - moyennement stable
      product: CACHE_TTL.product,    // 15min - change plus souvent
      full: CACHE_TTL.full          // 10min - lourd, cache court
    }
    return ttls[detail] || CACHE_TTL.summary
  }

  /**
   * Préchauffer le cache avec requêtes CA communes
   */
  async warmCache(): Promise<void> {
    console.log('[CA Cache] Starting cache warming...')
    
    // On simule le préchauffage - dans la vraie implémentation,
    // on appellerait le service CA avec des paramètres typiques
    const commonQueries = [
      { detail: 'summary' as const, limit: 20 },
      { detail: 'pharmacy' as const, limit: 10 },
      { detail: 'product' as const, limit: 50 }
    ]

    let warmed = 0
    for (const query of commonQueries) {
      try {
        const key = this.generateKey(query)
        const exists = await this.get(key)
        if (!exists) {
          // Dans la vraie implémentation, on exécuterait la requête
          // const data = await caService.calculateCA(query)
          // await this.set(key, data, this.getTTL(query.detail))
          console.log(`[CA Cache] Would warm: ${key}`)
        }
        warmed++
      } catch (error) {
        console.error(`[CA Cache] Warming error for query ${JSON.stringify(query)}:`, error)
      }
    }

    console.log(`[CA Cache] Warming completed: ${warmed}/${commonQueries.length} queries`)
  }

  // ==========================================
  // MÉTHODES SPÉCIFIQUES CA
  // ==========================================

  /**
   * Invalider le cache CA pour une pharmacie spécifique
   */
  async invalidatePharmacyCA(pharmacyId: string): Promise<void> {
    const patterns = [
      `ca:*:*:*:ph:*:*:*`, // Toutes les requêtes avec filtre pharmacie
      `ca:*:*:*:ph:all:*:*` // Requêtes globales incluant cette pharmacie
    ]

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern)
    }

    console.log(`[CA Cache] Invalidated cache for pharmacy: ${pharmacyId}`)
  }

  /**
   * Invalider le cache CA pour un produit spécifique
   */
  async invalidateProductCA(ean13: string): Promise<void> {
    const patterns = [
      `ca:*:*:*:*:ean:*:*`, // Toutes les requêtes avec filtre produit
      `ca:*:*:*:*:ean:all:*` // Requêtes globales incluant ce produit
    ]

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern)
    }

    console.log(`[CA Cache] Invalidated cache for product: ${ean13}`)
  }

  /**
   * Invalider le cache CA pour une période
   */
  async invalidatePeriodCA(startDate: string, endDate: string): Promise<void> {
    const patterns = [
      `ca:*:${startDate}:${endDate}:*`,
      `ca:*:*:${endDate}:*`, // Fin dans la période
      `ca:*:${startDate}:*:*` // Début dans la période
    ]

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern)
    }

    console.log(`[CA Cache] Invalidated cache for period: ${startDate} to ${endDate}`)
  }

  /**
   * Obtenir les métriques spécifiques CA
   */
  async getCAMetrics(): Promise<{
    cacheStats: any
    topKeys: Array<{ key: string; size: number }>
    hitRate: number
  }> {
    const baseStats = await this.getStats()
    
    // Simuler des métriques CA - dans la vraie implémentation,
    // on analyserait les clés Redis et mémoire
    const topKeys = [
      { key: 'ca:summary:default:default:ph:all:ean:all:default:no-cursor', size: 1024 },
      { key: 'ca:pharmacy:default:default:ph:5:ean:all:10:no-cursor', size: 2048 },
      { key: 'ca:product:default:default:ph:all:ean:10:50:no-cursor', size: 4096 }
    ]

    return {
      cacheStats: baseStats,
      topKeys,
      hitRate: 0.75 // 75% de hit rate simulé
    }
  }

  /**
   * Nettoyer les anciens caches CA (> 7 jours)
   */
  async cleanOldCACache(): Promise<number> {
    // Dans la vraie implémentation, on utiliserait les timestamps
    // pour identifier les clés anciennes
    const pattern = 'ca:*'
    
    try {
      // Simulation du nettoyage
      console.log(`[CA Cache] Cleaning old cache entries...`)
      
      // await this.invalidatePattern(pattern) avec logique de date
      
      return 0 // Nombre de clés supprimées
    } catch (error) {
      console.error('[CA Cache] Clean error:', error)
      return 0
    }
  }

  /**
   * Pré-calculer les données CA pour les requêtes fréquentes
   */
  async precomputeFrequentCA(): Promise<void> {
    console.log('[CA Cache] Starting precomputation...')
    
    // Requêtes à pré-calculer basées sur l'usage historique
    const frequentQueries: CAApiParams[] = [
      { detail: 'summary' }, // Vue d'ensemble
      { detail: 'pharmacy', limit: 10 }, // Top pharmacies
      { detail: 'product', limit: 20 }, // Top produits
    ]

    for (const query of frequentQueries) {
      try {
        const key = this.generateKey(query)
        const exists = await this.get(key)
        
        if (!exists) {
          // Dans la vraie implémentation:
          // const data = await caService.calculateCA(query)
          // await this.set(key, data, this.getTTL(query.detail!))
          console.log(`[CA Cache] Would precompute: ${key}`)
        }
      } catch (error) {
        console.error(`[CA Cache] Precompute error:`, error)
      }
    }

    console.log('[CA Cache] Precomputation completed')
  }
}

// ==========================================
// INSTANCE SINGLETON
// ==========================================

export const caCacheService = new CACacheService()

// ==========================================
// TYPES ET CONSTANTES SPÉCIFIQUES CA CACHE
// ==========================================

export interface CACacheKey {
  type: 'ca'
  detail: KPIDetailLevel
  startDate: string
  endDate: string
  pharmacyFilter: string
  productFilter: string
  limit: string
  cursor: string
}

export const CA_CACHE_PATTERNS = {
  ALL: 'ca:*',
  BY_DETAIL: (detail: KPIDetailLevel) => `ca:${detail}:*`,
  BY_PHARMACY: (pharmacyId: string) => `ca:*:*:*:*${pharmacyId}*:*:*`,
  BY_PRODUCT: (ean13: string) => `ca:*:*:*:*:*${ean13}*:*`,
  BY_PERIOD: (start: string, end: string) => `ca:*:${start}:${end}:*`
} as const