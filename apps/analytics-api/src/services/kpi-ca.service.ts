// ===== apps/analytics-api/src/services/kpi-ca.service.ts (MISE À JOUR AVEC CACHE) =====
import { eq, and, gte, lte, sum, count, sql, desc, asc, inArray } from 'drizzle-orm'
import { db, pharmacy, sales, inventorySnapshot, internalProduct, globalProduct } from '@packages/database'
import { cacheService } from './cache.service'

// ==========================================
// TYPES DE PARAMÈTRES (inchangés)
// ==========================================
export interface CAApiParams {
  pharmacyIds?: string[]
  ean13s?: string[]
  startDate?: string  // ISO string
  endDate?: string    // ISO string
  detail?: 'summary' | 'pharmacy' | 'product' | 'full'
  limit?: number
  cursor?: string
}

export interface CASummaryResponse {
  totalCA: number
  period: { start: string; end: string; days: number }
  counts: { pharmacies: number; products: number; transactions: number }
  averages: { dailyCA: number; transactionValue: number }
  meta: ResponseMeta
}

export interface CAPharmacyResponse {
  totalCA: number
  period: { start: string; end: string; days: number }
  byPharmacy: Array<{
    pharmacyId: string
    name: string
    area: string
    ca: number
    percentage: number
    transactionCount: number
    rank: number
  }>
  meta: ResponseMeta
}

export interface CAProductResponse {
  totalCA: number
  period: { start: string; end: string; days: number }
  byProduct: Array<{
    ean13: string
    name: string
    category: string
    ca: number
    quantity: number
    averagePrice: number
    percentage: number
  }>
  pagination: { cursor?: string; hasMore: boolean; total: number; limit: number }
  meta: ResponseMeta
}

interface ResponseMeta {
  calculatedAt: string
  dataSource: 'real_time' | 'cached'
  performance: { queryTime: number; fromCache: boolean; queryComplexity: string }
  cache: { ttl: number; key: string }
}

// ==========================================
// SERVICE KPI CA AVEC CACHE INTELLIGENT
// ==========================================
export class FlexibleKpiCAService {
  
  /**
   * Point d'entrée principal avec cache intelligent
   */
  async calculateCA(params: CAApiParams): Promise<CASummaryResponse | CAPharmacyResponse | CAProductResponse> {
    const startTime = performance.now()
    
    // 1. Normaliser les paramètres
    const normalizedParams = await this.normalizeParams(params)
    
    // 2. Générer la clé de cache
    const cacheKey = cacheService.generateCAKey(normalizedParams)
    
    // 3. Essayer le cache d'abord
    const cached = await cacheService.get(cacheKey)
    if (cached) {
      const totalTime = Math.round(performance.now() - startTime)
      console.log(`🚀 Cache HIT: ${cacheKey.substring(0, 60)} in ${totalTime}ms`)
      
      // Mettre à jour les méta-données pour refléter le cache hit
      return {
        ...cached,
        meta: {
          ...cached.meta,
          performance: {
            ...cached.meta.performance,
            queryTime: totalTime,
            fromCache: true
          },
          dataSource: 'cached'
        }
      }
    }
    
    // 4. Cache MISS - Calculer normalement
    console.log(`💨 Cache MISS: ${cacheKey.substring(0, 60)} - calculating...`)
    
    let result: any
    let complexity: string
    
    switch (normalizedParams.detail) {
      case 'summary':
        result = await this.calculateSummary(normalizedParams)
        complexity = 'simple'
        break
      case 'pharmacy':
        result = await this.calculateByPharmacy(normalizedParams)
        complexity = 'medium'
        break
      case 'product':
        result = await this.calculateByProduct(normalizedParams)
        complexity = 'medium'
        break
      case 'full':
        result = await this.calculateFull(normalizedParams)
        complexity = 'complex'
        break
      default:
        result = await this.calculateSummary(normalizedParams)
        complexity = 'simple'
    }
    
    // 5. Ajouter metadata
    const queryTime = Math.round(performance.now() - startTime)
    result.meta = {
      calculatedAt: new Date().toISOString(),
      dataSource: 'real_time',
      performance: { queryTime, fromCache: false, queryComplexity: complexity },
      cache: { ttl: this.getCacheTTL(normalizedParams.detail), key: cacheKey }
    }
    
    // 6. Sauvegarder en cache
    const ttl = cacheService.getTTL(normalizedParams.detail || 'summary')
    await cacheService.set(cacheKey, result, ttl)
    
    console.log(`💾 Calculated and cached: ${cacheKey.substring(0, 60)} in ${queryTime}ms (TTL: ${ttl}s)`)
    
    return result
  }
  
  // ==========================================
  // SUMMARY - Ultra rapide (inchangé)
  // ==========================================
  private async calculateSummary(params: CAApiParams): Promise<CASummaryResponse> {
    const result = await db
      .select({
        totalCA: sum(sql`${sales.quantity} * ${inventorySnapshot.priceWithTax}`).mapWith(Number),
        pharmacyCount: count(sql`DISTINCT ${pharmacy.id}`).mapWith(Number),
        productCount: count(sql`DISTINCT ${internalProduct.id}`).mapWith(Number),
        transactionCount: count(sales.id).mapWith(Number)
      })
      .from(sales)
      .innerJoin(inventorySnapshot, and(
        eq(sales.productId, inventorySnapshot.id),
        eq(sales.date, inventorySnapshot.date)
      ))
      .innerJoin(internalProduct, eq(inventorySnapshot.productId, internalProduct.id))
      .innerJoin(pharmacy, eq(internalProduct.pharmacyId, pharmacy.id))
      .leftJoin(globalProduct, eq(internalProduct.code13RefId, globalProduct.code13Ref))
      .where(and(
        gte(sales.date, params.startDate!),
        lte(sales.date, params.endDate!),
        params.pharmacyIds?.length ? inArray(pharmacy.id, params.pharmacyIds) : undefined,
        params.ean13s?.length ? inArray(globalProduct.code13Ref, params.ean13s) : undefined
      ))
    
    const data = result[0] || { totalCA: 0, pharmacyCount: 0, productCount: 0, transactionCount: 0 }
    const days = this.calculateDays(params.startDate!, params.endDate!)
    
    return {
      totalCA: Math.round((data.totalCA || 0) * 100) / 100,
      period: { start: params.startDate!, end: params.endDate!, days },
      counts: {
        pharmacies: data.pharmacyCount || 0,
        products: data.productCount || 0,
        transactions: data.transactionCount || 0
      },
      averages: {
        dailyCA: days > 0 ? Math.round(((data.totalCA || 0) / days) * 100) / 100 : 0,
        transactionValue: (data.transactionCount || 0) > 0 ? 
          Math.round(((data.totalCA || 0) / (data.transactionCount || 1)) * 100) / 100 : 0
      },
      meta: {} as ResponseMeta
    }
  }
  
  // ==========================================
  // BY PHARMACY - Détail par pharmacie (inchangé)
  // ==========================================
  private async calculateByPharmacy(params: CAApiParams): Promise<CAPharmacyResponse> {
    const results = await db
      .select({
        pharmacyId: pharmacy.id,
        name: pharmacy.name,
        area: pharmacy.area,
        ca: sum(sql`${sales.quantity} * ${inventorySnapshot.priceWithTax}`).mapWith(Number),
        transactionCount: count(sales.id).mapWith(Number)
      })
      .from(sales)
      .innerJoin(inventorySnapshot, and(
        eq(sales.productId, inventorySnapshot.id),
        eq(sales.date, inventorySnapshot.date)
      ))
      .innerJoin(internalProduct, eq(inventorySnapshot.productId, internalProduct.id))
      .innerJoin(pharmacy, eq(internalProduct.pharmacyId, pharmacy.id))
      .leftJoin(globalProduct, eq(internalProduct.code13RefId, globalProduct.code13Ref))
      .where(and(
        gte(sales.date, params.startDate!),
        lte(sales.date, params.endDate!),
        params.pharmacyIds?.length ? inArray(pharmacy.id, params.pharmacyIds) : undefined,
        params.ean13s?.length ? inArray(globalProduct.code13Ref, params.ean13s) : undefined
      ))
      .groupBy(pharmacy.id, pharmacy.name, pharmacy.area)
      .orderBy(desc(sum(sql`${sales.quantity} * ${inventorySnapshot.priceWithTax}`)))
    
    const totalCA = results.reduce((sum, r) => sum + (r.ca || 0), 0)
    const days = this.calculateDays(params.startDate!, params.endDate!)
    
    return {
      totalCA: Math.round(totalCA * 100) / 100,
      period: { start: params.startDate!, end: params.endDate!, days },
      byPharmacy: results.map((r, index) => ({
        pharmacyId: r.pharmacyId,
        name: r.name || 'Pharmacie inconnue',
        area: r.area || 'Zone inconnue',
        ca: Math.round((r.ca || 0) * 100) / 100,
        percentage: totalCA > 0 ? Math.round(((r.ca || 0) / totalCA) * 100 * 100) / 100 : 0,
        transactionCount: r.transactionCount || 0,
        rank: index + 1
      })),
      meta: {} as ResponseMeta
    }
  }
  
  // ==========================================
  // BY PRODUCT - Détail par produit avec pagination (inchangé)
  // ==========================================
  private async calculateByProduct(params: CAApiParams): Promise<CAProductResponse> {
    const limit = params.limit || 20
    
    let query = db
      .select({
        ean13: globalProduct.code13Ref,
        name: globalProduct.name,
        category: globalProduct.category,
        ca: sum(sql`${sales.quantity} * ${inventorySnapshot.priceWithTax}`).mapWith(Number),
        quantity: sum(sales.quantity).mapWith(Number),
        averagePrice: sql`AVG(${inventorySnapshot.priceWithTax})`.mapWith(Number)
      })
      .from(sales)
      .innerJoin(inventorySnapshot, and(
        eq(sales.productId, inventorySnapshot.id),
        eq(sales.date, inventorySnapshot.date)
      ))
      .innerJoin(internalProduct, eq(inventorySnapshot.productId, internalProduct.id))
      .innerJoin(pharmacy, eq(internalProduct.pharmacyId, pharmacy.id))
      .innerJoin(globalProduct, eq(internalProduct.code13RefId, globalProduct.code13Ref))
      .where(and(
        gte(sales.date, params.startDate!),
        lte(sales.date, params.endDate!),
        params.pharmacyIds?.length ? inArray(pharmacy.id, params.pharmacyIds) : undefined,
        params.ean13s?.length ? inArray(globalProduct.code13Ref, params.ean13s) : undefined,
        params.cursor ? sql`${globalProduct.code13Ref} > ${params.cursor}` : undefined
      ))
      .groupBy(globalProduct.code13Ref, globalProduct.name, globalProduct.category)
      .orderBy(desc(sum(sql`${sales.quantity} * ${inventorySnapshot.priceWithTax}`)))
      .limit(limit + 1)
    
    const results = await query
    const hasMore = results.length > limit
    const data = hasMore ? results.slice(0, -1) : results
    const nextCursor = hasMore ? results[results.length - 2].ean13 : undefined
    
    const totalCA = data.reduce((sum, r) => sum + (r.ca || 0), 0)
    const days = this.calculateDays(params.startDate!, params.endDate!)
    
    return {
      totalCA: Math.round(totalCA * 100) / 100,
      period: { start: params.startDate!, end: params.endDate!, days },
      byProduct: data.map(r => ({
        ean13: r.ean13 || '',
        name: r.name || 'Produit inconnu',
        category: r.category || 'Non classé',
        ca: Math.round((r.ca || 0) * 100) / 100,
        quantity: r.quantity || 0,
        averagePrice: Math.round((r.averagePrice || 0) * 100) / 100,
        percentage: totalCA > 0 ? Math.round(((r.ca || 0) / totalCA) * 100 * 100) / 100 : 0
      })),
      pagination: { cursor: nextCursor, hasMore, total: -1, limit },
      meta: {} as ResponseMeta
    }
  }
  
  // ==========================================
  // FULL - Toutes les données (inchangé)
  // ==========================================
  private async calculateFull(params: CAApiParams): Promise<any> {
    const [summary, pharmacies, topProducts] = await Promise.all([
      this.calculateSummary(params),
      this.calculateByPharmacy(params),
      this.calculateByProduct({ ...params, limit: 50 })
    ])
    
    return {
      ...summary,
      byPharmacy: pharmacies.byPharmacy,
      byProduct: topProducts.byProduct,
      meta: {} as ResponseMeta
    }
  }
  
  // ==========================================
  // MÉTHODES CACHE & INVALIDATION
  // ==========================================
  
  /**
   * Invalider le cache pour une pharmacie spécifique
   */
  async invalidatePharmacyCache(pharmacyId: string): Promise<void> {
    await cacheService.invalidatePattern(`*ph:${pharmacyId}*`)
    console.log(`🗑️  Cache invalidated for pharmacy: ${pharmacyId}`)
  }
  
  /**
   * Invalider tout le cache CA
   */
  async invalidateAllCache(): Promise<void> {
    await cacheService.invalidatePattern('kpi:ca:*')
    console.log(`🗑️  All CA cache invalidated`)
  }
  
  /**
   * Warm cache avec les requêtes les plus communes
   */
  async warmCache(): Promise<void> {
    console.log('🔥 Warming CA cache with common queries...')
    
    const commonQueries: CAApiParams[] = [
      // Global summary - le plus demandé
      { detail: 'summary' },
      
      // Summary année en cours
      { detail: 'summary', startDate: '2024-01-01', endDate: '2024-12-31' },
      
      // Mois en cours par pharmacie
      { 
        detail: 'pharmacy', 
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      },
      
      // Top produits derniers 30 jours
      { 
        detail: 'product', 
        limit: 20,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      }
    ]
    
    let warmed = 0
    for (const query of commonQueries) {
      try {
        await this.calculateCA(query)
        warmed++
        console.log(`✅ Warmed query ${warmed}/${commonQueries.length}: ${query.detail}`)
      } catch (error) {
        console.log(`❌ Failed to warm query: ${query.detail} - ${error.message}`)
      }
    }
    
    console.log(`🔥 Cache warming complete! ${warmed}/${commonQueries.length} queries warmed`)
  }
  
  // ==========================================
  // MÉTHODES UTILITAIRES (inchangées)
  // ==========================================
  
  private async normalizeParams(params: CAApiParams): Promise<CAApiParams> {
    if (!params.startDate || !params.endDate) {
      const today = new Date()
      const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      
      return {
        ...params,
        startDate: params.startDate || oneYearAgo.toISOString().split('T')[0],
        endDate: params.endDate || today.toISOString().split('T')[0],
        detail: params.detail || 'summary'
      }
    }
    
    return { ...params, detail: params.detail || 'summary' }
  }
  
  private calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }
  
  private getCacheTTL(detail: string): number {
    const ttls = { summary: 3600, pharmacy: 1800, product: 900, full: 600 }
    return ttls[detail as keyof typeof ttls] || 3600
  }
  
  private generateCacheKey(params: CAApiParams): string {
    const key = [
      'ca',
      params.detail,
      params.startDate,
      params.endDate,
      params.pharmacyIds?.sort().join(',') || 'all',
      params.ean13s?.length || 'all',
      params.cursor || ''
    ].join(':')
    
    return `kpi:${key}`
  }
}

// Instance singleton
export const flexibleKpiCAService = new FlexibleKpiCAService()