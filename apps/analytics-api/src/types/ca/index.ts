// ===== apps/analytics-api/src/types/ca/index.ts =====
// Barrel exports pour faciliter les imports CA

import { CAResponse, CASummaryResponse, CAPharmacyResponse, CAProductResponse, CAFullResponse } from '../kpis'
import { CAEvolutionResponse } from './responses'

// ==========================================
// EXPORTS PARAMS
// ==========================================

export * from './params'
export type {
  CAApiParams,
  CAApiParamsExtended,
  NormalizedCAParams
} from './params'

export {
  CAApiParamsSchema,
  validateCAParams,
  normalizeCAParams,
  CA_DEFAULTS,
  CA_VALIDATION_RULES
} from './params'

// ==========================================
// EXPORTS RESPONSES
// ==========================================

export * from './responses'
export type {
  CASummaryResponse,
  CAPharmacyResponse,
  CAProductResponse,
  CAFullResponse,
  CAEvolutionResponse,
  CAResponse,
  CAComparison,
  CAInsight,
  CAReportData
} from './responses'

// ==========================================
// CONSTANTES CA SPÉCIFIQUES
// ==========================================

export const CA_TYPES = {
  SUMMARY: 'summary',
  PHARMACY: 'pharmacy', 
  PRODUCT: 'product',
  FULL: 'full',
  EVOLUTION: 'evolution'
} as const

export const CA_METRICS = {
  TOTAL_CA: 'total_ca',
  AVERAGE_DAILY_CA: 'average_daily_ca',
  TRANSACTION_VALUE: 'transaction_value',
  GROWTH_RATE: 'growth_rate'
} as const

// ==========================================
// TYPE GUARDS
// ==========================================

export function isCASummaryResponse(response: CAResponse): response is CASummaryResponse {
  return 'totalCA' in response && 'averages' in response && !('byPharmacy' in response)
}

export function isCAPharmacyResponse(response: CAResponse): response is CAPharmacyResponse {
  return 'byPharmacy' in response && !('byProduct' in response)
}

export function isCAProductResponse(response: CAResponse): response is CAProductResponse {
  return 'byProduct' in response && 'pagination' in response && !('byPharmacy' in response)
}

export function isCAFullResponse(response: CAResponse): response is CAFullResponse {
  return 'byPharmacy' in response && 'byProduct' in response && 'summary' in response
}

export function isCAEvolutionResponse(response: CAResponse): response is CAEvolutionResponse {
  return 'evolution' in response && 'trends' in response && 'forecasting' in response
}