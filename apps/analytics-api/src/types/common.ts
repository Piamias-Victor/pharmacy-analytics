// ===== apps/analytics-api/src/types/common.ts =====
// Types génériques réutilisables par TOUS les KPIs

// ==========================================
// INTERFACES DE RÉPONSE API COMMUNES
// ==========================================

export interface ResponseMeta {
  calculatedAt: string
  dataSource: 'real_time' | 'cached'
  performance: { 
    queryTime: number
    fromCache: boolean
    queryComplexity: string 
  }
  cache: { 
    ttl: number
    key: string 
  }
}

export interface APIResponse<T = unknown> {
  success: boolean
  data: T
  meta?: ResponseMeta
  error?: string
  code?: string
  details?: unknown
}

export interface APIErrorResponse {
  success: false
  error: string
  code?: string
  details?: unknown
  meta: {
    timestamp: string
    requestId?: string
  }
}

export interface APISuccessResponse<T = unknown> {
  success: true
  data: T
  meta?: {
    timestamp: string
    requestId?: string
  }
}

// ==========================================
// MÉTADONNÉES PAGINATION & PERFORMANCE
// ==========================================

export interface PaginationMeta {
  cursor?: string
  hasMore: boolean
  total: number
  limit: number
}

export interface PerformanceMeta {
  queryTime: number
  fromCache: boolean
  queryComplexity?: 'simple' | 'medium' | 'complex'
  memoryUsage?: number
  rows?: number
}

// ==========================================
// TYPES DE BASE POUR TOUTES LES APIS
// ==========================================

export interface BasePeriod {
  start: string
  end: string
  days: number
}

export interface BaseCounts {
  pharmacies: number
  products: number
  transactions: number
}

export interface BaseAverages {
  dailyValue: number
  transactionValue: number
}

// ==========================================
// CONSTANTES GLOBALES KPI
// ==========================================

export const KPI_LIMITS = {
  MAX_EAN13_PER_REQUEST: 1000,
  MAX_PHARMACY_PER_REQUEST: 100,
  MAX_DATE_RANGE_DAYS: 365,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
} as const

export const CACHE_TTL = {
  summary: 3600,    // 1h - très stable
  pharmacy: 1800,   // 30min - moyennement stable
  product: 900,     // 15min - change plus souvent
  full: 600         // 10min - lourd, cache court
} as const

// ==========================================
// TYPES UTILITAIRES
// ==========================================

export type KPIDetailLevel = 'summary' | 'pharmacy' | 'product' | 'full'

export type KPIType = 'ca' | 'marge' | 'stock' | 'evolution'

export type DateRange = {
  startDate?: string
  endDate?: string
}

export type SortOrder = 'asc' | 'desc'

export type SortBy = 'value' | 'name' | 'date' | 'percentage'

// ==========================================
// INTERFACES DE BASE POUR PARAMÈTRES
// ==========================================

export interface BaseKPIParams extends DateRange {
  pharmacyIds?: string[]
  detail?: KPIDetailLevel
  limit?: number
  cursor?: string
}

// ==========================================
// INTERFACES DE BASE POUR RÉPONSES
// ==========================================

export interface BaseKPIResponse {
  totalValue: number
  period: BasePeriod
  counts: BaseCounts
  averages: BaseAverages
  meta: ResponseMeta
}

// ==========================================
// TYPES D'ERREURS MÉTIER
// ==========================================

export class ValidationKPIError extends Error {
  constructor(message: string, public field: string) {
    super(message)
    this.name = 'ValidationKPIError'
  }
}

export class DatabaseKPIError extends Error {
  constructor(message: string, public query: string) {
    super(message)
    this.name = 'DatabaseKPIError'
  }
}

export class CacheKPIError extends Error {
  constructor(message: string, public cacheKey: string) {
    super(message)
    this.name = 'CacheKPIError'
  }
}