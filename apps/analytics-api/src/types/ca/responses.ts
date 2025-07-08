// ===== apps/analytics-api/src/types/ca/responses.ts =====
// Toutes les interfaces de réponse CA

import { 
  BaseKPIResponse, 
  ResponseMeta, 
  PaginationMeta, 
  BasePeriod, 
  BaseCounts, 
  BaseAverages 
} from '../common'

// ==========================================
// RÉPONSE CA SUMMARY (niveau agrégé)
// ==========================================

export interface CASummaryResponse extends BaseKPIResponse {
  totalCA: number
  period: BasePeriod
  counts: BaseCounts
  averages: {
    dailyCA: number
    transactionValue: number
  }
  meta: ResponseMeta
}

// ==========================================
// RÉPONSE CA PAR PHARMACIE
// ==========================================

export interface CAPharmacyResponse {
  totalCA: number
  period: BasePeriod
  byPharmacy: Array<{
    pharmacyId: string
    name: string
    area: string
    ca: number
    percentage: number
    transactionCount: number
    averageTransactionValue: number
    rank: number
    evolution?: {
      previousPeriod: number
      growthPercentage: number
      trend: 'up' | 'down' | 'stable'
    }
  }>
  meta: ResponseMeta
}

// ==========================================
// RÉPONSE CA PAR PRODUIT
// ==========================================

export interface CAProductResponse {
  totalCA: number
  period: BasePeriod
  byProduct: Array<{
    ean13: string
    name: string
    category: string
    laboratory?: string
    ca: number
    quantity: number
    averagePrice: number
    percentage: number
    margin?: {
      gross: number
      net: number
      percentage: number
    }
    evolution?: {
      previousPeriod: number
      growthPercentage: number
      trend: 'up' | 'down' | 'stable'
    }
  }>
  pagination: PaginationMeta
  meta: ResponseMeta
}

// ==========================================
// RÉPONSE CA COMPLÈTE (tous niveaux)
// ==========================================

export interface CAFullResponse extends CASummaryResponse {
  byPharmacy: CAPharmacyResponse['byPharmacy']
  byProduct: CAProductResponse['byProduct']
  
  // Analyses supplémentaires
  summary: {
    topCategory: {
      name: string
      ca: number
      percentage: number
    }
    topPharmacy: {
      id: string
      name: string
      ca: number
      percentage: number
    }
    growth: {
      direction: 'up' | 'down' | 'stable'
      percentage: number
      period: string
    }
    insights: Array<{
      type: 'opportunity' | 'warning' | 'info'
      message: string
      impact: 'high' | 'medium' | 'low'
      value?: number
    }>
  }
  
  // Données temporelles détaillées
  temporal: {
    dailyBreakdown: Array<{
      date: string
      ca: number
      transactionCount: number
      averageBasket: number
    }>
    weeklyTrends: Array<{
      week: string
      ca: number
      growth: number
    }>
    monthlyComparison: Array<{
      month: string
      current: number
      previous: number
      growth: number
    }>
  }
  
  pagination: PaginationMeta
}

// ==========================================
// RÉPONSE CA ÉVOLUTION TEMPORELLE
// ==========================================

export interface CAEvolutionResponse {
  period: BasePeriod
  evolution: Array<{
    date: string
    ca: number
    cumulativeCA: number
    dayOfWeek: number
    isWeekend: boolean
    isHoliday?: boolean
  }>
  
  trends: {
    overall: {
      trend: 'increasing' | 'decreasing' | 'stable'
      slope: number
      rSquared: number
    }
    weekly: {
      bestDay: string
      worstDay: string
      weekendImpact: number
    }
    monthly: {
      seasonalityIndex: number
      peakMonth: string
      lowMonth: string
    }
  }
  
  forecasting: {
    next30Days: Array<{
      date: string
      predicted: number
      confidence: number
    }>
    accuracy: {
      mape: number        // Mean Absolute Percentage Error
      rmse: number        // Root Mean Square Error
      lastUpdate: string
    }
  }
  
  meta: ResponseMeta
}

// ==========================================
// UNION TYPE POUR TOUTES LES RÉPONSES CA
// ==========================================

export type CAResponse = 
  | CASummaryResponse 
  | CAPharmacyResponse 
  | CAProductResponse 
  | CAFullResponse
  | CAEvolutionResponse

// ==========================================
// TYPES POUR AGRÉGATIONS SPÉCIALES
// ==========================================

export interface CAComparison {
  current: {
    value: number
    period: BasePeriod
  }
  comparison: {
    value: number
    period: BasePeriod
    type: 'previous_period' | 'same_period_last_year'
  }
  analysis: {
    absoluteDifference: number
    percentageDifference: number
    trend: 'improvement' | 'decline' | 'stable'
    significance: 'high' | 'medium' | 'low'
  }
}

export interface CAInsight {
  id: string
  type: 'performance' | 'opportunity' | 'risk' | 'anomaly'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: {
    financial: number
    category: 'revenue' | 'cost' | 'margin'
  }
  actionable: boolean
  recommendations?: string[]
  metadata: {
    confidence: number
    dataPoints: number
    lastCalculated: string
  }
}

// ==========================================
// TYPES POUR EXPORTS/RAPPORTS
// ==========================================

export interface CAReportData {
  metadata: {
    title: string
    generatedAt: string
    period: BasePeriod
    author: string
    version: string
  }
  
  executive: {
    totalCA: number
    growth: number
    keyInsights: CAInsight[]
    recommendations: string[]
  }
  
  detailed: {
    summary: CASummaryResponse
    byPharmacy: CAPharmacyResponse['byPharmacy']
    byProduct: CAProductResponse['byProduct']
    evolution: CAEvolutionResponse['evolution']
  }
  
  appendices: {
    methodology: string
    dataQuality: {
      completeness: number
      accuracy: number
      timeliness: number
    }
    definitions: Record<string, string>
  }
}