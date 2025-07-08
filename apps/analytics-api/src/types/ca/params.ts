// ===== apps/analytics-api/src/types/ca/params.ts =====
// Types spécifiques CA uniquement + validation Zod

import { z } from 'zod'
import { BaseKPIParams, KPI_LIMITS } from '../common'

// ==========================================
// VALIDATION ZOD POUR PARAMÈTRES CA
// ==========================================

export const CAApiParamsSchema = z.object({
  // Filtres pharmacies
  pharmacyIds: z.array(z.string().uuid('ID pharmacie invalide'))
    .max(KPI_LIMITS.MAX_PHARMACY_PER_REQUEST, `Maximum ${KPI_LIMITS.MAX_PHARMACY_PER_REQUEST} pharmacies`)
    .optional(),
  
  // Filtres produits
  ean13s: z.array(z.string().length(13, 'EAN13 doit faire 13 caractères'))
    .max(KPI_LIMITS.MAX_EAN13_PER_REQUEST, `Maximum ${KPI_LIMITS.MAX_EAN13_PER_REQUEST} produits`)
    .optional(),
  
  // Période
  startDate: z.string()
    .datetime('Format date début invalide (ISO 8601)')
    .optional(),
  
  endDate: z.string()
    .datetime('Format date fin invalide (ISO 8601)')
    .optional(),
  
  // Niveau de détail
  detail: z.enum(['summary', 'pharmacy', 'product', 'full'], {
    errorMap: () => ({ message: 'Detail doit être: summary, pharmacy, product ou full' })
  }).default('summary'),
  
  // Pagination
  limit: z.number()
    .int('Limit doit être un entier')
    .min(1, 'Limit minimum: 1')
    .max(KPI_LIMITS.MAX_LIMIT, `Limit maximum: ${KPI_LIMITS.MAX_LIMIT}`)
    .default(KPI_LIMITS.DEFAULT_LIMIT),
  
  cursor: z.string()
    .uuid('Cursor doit être un UUID valide')
    .optional()
})
.refine(
  (data) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff <= KPI_LIMITS.MAX_DATE_RANGE_DAYS
    }
    return true
  },
  {
    message: `Période maximum: ${KPI_LIMITS.MAX_DATE_RANGE_DAYS} jours`,
    path: ['endDate']
  }
)
.refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.endDate) > new Date(data.startDate)
    }
    return true
  },
  {
    message: 'Date fin doit être postérieure à date début',
    path: ['endDate']
  }
)

// ==========================================
// TYPES TYPESCRIPT DÉRIVÉS DE ZOD
// ==========================================

export type CAApiParams = z.infer<typeof CAApiParamsSchema>

// Extension avec types métier spécifiques CA
export interface CAApiParamsExtended extends CAApiParams {
  // Filtres avancés spécifiques CA
  categoryIds?: string[]
  laboratoryIds?: string[]
  priceRange?: {
    min: number
    max: number
  }
  
  // Options de calcul CA
  includeTax?: boolean
  includeDiscounts?: boolean
  currencyCode?: 'EUR' | 'USD'
  
  // Agrégation temporelle
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  
  // Comparaison
  compareWithPreviousPeriod?: boolean
  compareWithSamePeriodLastYear?: boolean
}

// ==========================================
// TYPES POUR NORMALISATION PARAMÈTRES
// ==========================================

export interface NormalizedCAParams extends Required<Pick<CAApiParams, 'detail' | 'limit'>> {
  pharmacyIds?: string[]
  ean13s?: string[]
  startDate: string  // Toujours défini après normalisation
  endDate: string    // Toujours défini après normalisation
  cursor?: string
}

// ==========================================
// CONSTANTES SPÉCIFIQUES CA
// ==========================================

export const CA_DEFAULTS = {
  PERIOD_DAYS: 365,          // 1 an par défaut
  CURRENCY: 'EUR',
  INCLUDE_TAX: true,
  INCLUDE_DISCOUNTS: true,
  GROUP_BY: 'day'
} as const

export const CA_VALIDATION_RULES = {
  MIN_AMOUNT: 0,
  MAX_AMOUNT: 1000000,       // 1M€ max par transaction
  SUPPORTED_CURRENCIES: ['EUR', 'USD'] as const,
  SUPPORTED_PERIODS: ['day', 'week', 'month', 'quarter', 'year'] as const
} as const

// ==========================================
// FONCTIONS UTILITAIRES VALIDATION
// ==========================================

export function validateCAParams(params: unknown): CAApiParams {
  return CAApiParamsSchema.parse(params)
}

export function normalizeCAParams(params: CAApiParams): NormalizedCAParams {
  const now = new Date()
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  
  return {
    ...params,
    startDate: params.startDate || oneYearAgo.toISOString().split('T')[0],
    endDate: params.endDate || now.toISOString().split('T')[0],
    detail: params.detail || 'summary',
    limit: params.limit || KPI_LIMITS.DEFAULT_LIMIT
  }
}