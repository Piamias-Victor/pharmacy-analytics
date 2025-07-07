// ===== apps/analytics-api/src/types/kpis.ts =====
import { z } from 'zod'

// ==========================================
// SCHEMAS ZOD POUR VALIDATION API
// ==========================================

export const CAApiParamsSchema = z.object({
  // Filtres de données
  pharmacyIds: z.array(z.string().uuid()).optional(),
  ean13s: z.array(z.string().length(13)).optional(), 
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  
  // Niveau de détail
  detail: z.enum(['summary', 'pharmacy', 'product', 'full']).default('summary'),
  
  // Pagination (pour detail=product)
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) >= new Date(data.startDate)
    }
    return true
  },
  { message: 'Date fin doit être >= date début', path: ['endDate'] }
).refine(
  (data) => {
    // Limiter les EAN13 pour éviter les requêtes trop lourdes
    if (data.ean13s && data.ean13s.length > 1000) {
      return false
    }
    return true
  },
  { message: 'Maximum 1000 EAN13 par requête', path: ['ean13s'] }
)

// ==========================================
// TYPES TYPESCRIPT INFÉRÉS
// ==========================================

export type CAApiParams = z.infer<typeof CAApiParamsSchema>

// ==========================================
// TYPES DE RÉPONSE
// ==========================================

export interface ResponseMeta {
  calculatedAt: string
  dataSource: 'real_time' | 'cached'
  performance: {
    queryTime: number
    fromCache: boolean
    queryComplexity: 'simple' | 'medium' | 'complex'
  }
  cache: {
    ttl: number
    key: string
  }
}

export interface CASummaryResponse {
  totalCA: number
  period: {
    start: string
    end: string
    days: number
  }
  counts: {
    pharmacies: number
    products: number
    transactions: number
  }
  averages: {
    dailyCA: number
    transactionValue: number
  }
  meta: ResponseMeta
}

export interface CAPharmacyResponse {
  totalCA: number
  period: {
    start: string
    end: string
    days: number
  }
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
  period: {
    start: string
    end: string
    days: number
  }
  byProduct: Array<{
    ean13: string
    name: string
    category: string
    ca: number
    quantity: number
    averagePrice: number
    percentage: number
  }>
  pagination: {
    cursor?: string
    hasMore: boolean
    total: number
    limit: number
  }
  meta: ResponseMeta
}

export interface CAFullResponse extends CASummaryResponse {
  byPharmacy: CAPharmacyResponse['byPharmacy']
  byProduct: CAProductResponse['byProduct']
  summary: {
    topCategory: string
    topPharmacy: string
    growth: {
      direction: 'up' | 'down' | 'stable'
      percentage: number
    }
  }
}

// Union type pour toutes les réponses possibles
export type CAResponse = CASummaryResponse | CAPharmacyResponse | CAProductResponse | CAFullResponse

// ==========================================
// TYPES D'ERREURS API
// ==========================================

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

export type APIResponse<T = unknown> = APISuccessResponse<T> | APIErrorResponse

// ==========================================
// CONSTANTES
// ==========================================

export const KPI_LIMITS = {
  MAX_EAN13_PER_REQUEST: 1000,
  MAX_PHARMACY_PER_REQUEST: 100,
  MAX_DATE_RANGE_DAYS: 365,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
} as const

export const CACHE_TTL = {
  summary: 3600,    // 1h
  pharmacy: 1800,   // 30min
  product: 900,     // 15min
  full: 600         // 10min
} as const