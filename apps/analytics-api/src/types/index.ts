// ===== apps/analytics-api/src/types/index.ts =====
// Exports globaux organisés par domaine

import { KPIType, KPIDetailLevel, ValidationKPIError } from './common'
import { KPI_LIMITS, ResponseMeta, APISuccessResponse, APIErrorResponse } from './kpis'

// ==========================================
// EXPORTS TYPES COMMUNS
// ==========================================

export * from './common'
export type {
  ResponseMeta,
  APIResponse,
  APIErrorResponse,
  APISuccessResponse,
  PaginationMeta,
  PerformanceMeta,
  BasePeriod,
  BaseCounts,
  BaseAverages,
  BaseKPIParams,
  BaseKPIResponse,
  KPIDetailLevel,
  KPIType,
  DateRange,
  SortOrder,
  SortBy
} from './common'

export {
  KPI_LIMITS,
  CACHE_TTL,
  ValidationKPIError,
  DatabaseKPIError,
  CacheKPIError
} from './common'

// ==========================================
// EXPORTS NAMESPACE CA
// ==========================================

export * as CA from './ca'

// Exports directs pour faciliter l'usage
export type {
  CAApiParams,
  CAApiParamsExtended,
  NormalizedCAParams,
  CASummaryResponse,
  CAPharmacyResponse,
  CAProductResponse,
  CAFullResponse,
  CAEvolutionResponse,
  CAResponse,
  CAComparison,
  CAInsight,
  CAReportData
} from './ca'

export {
  CAApiParamsSchema,
  validateCAParams,
  normalizeCAParams,
  CA_DEFAULTS,
  CA_VALIDATION_RULES,
  CA_TYPES,
  CA_METRICS,
  isCASummaryResponse,
  isCAPharmacyResponse,
  isCAProductResponse,
  isCAFullResponse,
  isCAEvolutionResponse
} from './ca'

// ==========================================
// EXPORTS NAMESPACE MARGE (PRÉPARÉ)
// ==========================================

// export * as Marge from './marge'
// 
// export type {
//   MargeApiParams,
//   MargeResponse,
//   MargeSummaryResponse
// } from './marge'

// ==========================================
// UNION TYPES GLOBAUX
// ==========================================

export type AllKPIParams = CA.CAApiParams // | Marge.MargeApiParams

export type AllKPIResponses = CA.CAResponse // | Marge.MargeResponse

// ==========================================
// CONSTANTES GLOBALES
// ==========================================

export const SUPPORTED_KPI_TYPES = ['ca'] as const // ['ca', 'marge', 'stock', 'evolution']

export const API_VERSIONS = {
  CURRENT: 'v1',
  SUPPORTED: ['v1'],
  DEPRECATED: []
} as const

export const DEFAULT_PAGINATION = {
  LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_CURSOR: null
} as const

// ==========================================
// TYPE GUARDS GLOBAUX
// ==========================================

export function isValidKPIType(type: string): type is KPIType {
  return ['ca', 'marge', 'stock', 'evolution'].includes(type)
}

export function isValidDetailLevel(detail: string): detail is KPIDetailLevel {
  return ['summary', 'pharmacy', 'product', 'full'].includes(detail)
}

// ==========================================
// UTILITAIRES DE VALIDATION
// ==========================================

export function validatePagination(params: { limit?: number; cursor?: string }) {
  if (params.limit && (params.limit < 1 || params.limit > KPI_LIMITS.MAX_LIMIT)) {
    throw new ValidationKPIError(
      `Limit must be between 1 and ${KPI_LIMITS.MAX_LIMIT}`,
      'limit'
    )
  }
  
  if (params.cursor && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.cursor)) {
    throw new ValidationKPIError('Invalid cursor format', 'cursor')
  }
}

export function validateDateRange(params: { startDate?: string; endDate?: string }) {
  if (params.startDate && params.endDate) {
    const start = new Date(params.startDate)
    const end = new Date(params.endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationKPIError('Invalid date format', 'dateRange')
    }
    
    if (end <= start) {
      throw new ValidationKPIError('End date must be after start date', 'endDate')
    }
    
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > KPI_LIMITS.MAX_DATE_RANGE_DAYS) {
      throw new ValidationKPIError(
        `Date range cannot exceed ${KPI_LIMITS.MAX_DATE_RANGE_DAYS} days`,
        'dateRange'
      )
    }
  }
}

// ==========================================
// HELPERS POUR RÉPONSES API
// ==========================================

export function createSuccessResponse<T>(
  data: T,
  meta?: Partial<ResponseMeta>
): APISuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  }
}

export function createErrorResponse(
  error: string | Error,
  code?: string,
  details?: unknown
): APIErrorResponse {
  return {
    success: false,
    error: error instanceof Error ? error.message : error,
    code,
    details,
    meta: {
      timestamp: new Date().toISOString()
    }
  }
}

// ==========================================
// EXPORTS POUR BACKWARD COMPATIBILITY
// ==========================================

// Note: Ces exports permettent une migration douce depuis l'ancien types/kpis.ts
// À supprimer après migration complète

export type {
  CAApiParams as CAKpiParams,
  CASummaryResponse as CAKpiSummaryResponse,
  CAPharmacyResponse as CAKpiPharmacyResponse,
  CAProductResponse as CAKpiProductResponse
} from './ca'