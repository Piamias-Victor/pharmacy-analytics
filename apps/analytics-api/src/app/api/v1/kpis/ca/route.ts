// ===== apps/analytics-api/src/app/api/v1/kpis/ca/route.ts (AVEC CACHE) =====
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { CAApiParamsSchema, type CAResponse, type APIResponse } from '@/types/kpis'
import { flexibleKpiCAService } from '@/services/kpi-ca.service'

// ==========================================
// UTILITAIRES DE RÉPONSE (inchangés)
// ==========================================

function createSuccessResponse<T>(data: T): APIResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString()
    }
  }
}

function createErrorResponse(message: string, code?: string, details?: unknown): APIResponse {
  return {
    success: false,
    error: message,
    code,
    details,
    meta: {
      timestamp: new Date().toISOString()
    }
  }
}

function parseSearchParams(searchParams: URLSearchParams): any {
  const params: any = {}
  
  if (searchParams.get('startDate')) params.startDate = searchParams.get('startDate')
  if (searchParams.get('endDate')) params.endDate = searchParams.get('endDate')
  if (searchParams.get('detail')) params.detail = searchParams.get('detail')
  if (searchParams.get('limit')) params.limit = parseInt(searchParams.get('limit')!)
  if (searchParams.get('cursor')) params.cursor = searchParams.get('cursor')
  
  const pharmacyIds = searchParams.getAll('pharmacyIds[]').length > 0 
    ? searchParams.getAll('pharmacyIds[]')
    : searchParams.get('pharmacyIds')?.split(',').filter(Boolean)
  if (pharmacyIds?.length) params.pharmacyIds = pharmacyIds
  
  const ean13s = searchParams.getAll('ean13s[]').length > 0
    ? searchParams.getAll('ean13s[]') 
    : searchParams.get('ean13s')?.split(',').filter(Boolean)
  if (ean13s?.length) params.ean13s = ean13s
  
  return params
}

// ==========================================
// HANDLER GET AVEC CACHE INTELLIGENT
// ==========================================

export async function GET(request: NextRequest): Promise<NextResponse<APIResponse<CAResponse>>> {
  const startTime = performance.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    console.log(`🔍 [${requestId}] KPI CA API called:`, request.url)
    
    // 1. Parse et validation des paramètres
    const searchParams = request.nextUrl.searchParams
    const rawParams = parseSearchParams(searchParams)
    const validatedParams = CAApiParamsSchema.parse(rawParams)
    
    console.log(`📊 [${requestId}] Params:`, {
      detail: validatedParams.detail,
      period: validatedParams.startDate ? `${validatedParams.startDate} → ${validatedParams.endDate}` : 'default',
      pharmacies: validatedParams.pharmacyIds ? `${validatedParams.pharmacyIds.length} selected` : 'all',
      products: validatedParams.ean13s ? `${validatedParams.ean13s.length} EAN13s` : 'all'
    })
    
    // 2. Appel du service avec cache intelligent
    const result = await flexibleKpiCAService.calculateCA(validatedParams)
    
    // 3. Logs de performance détaillés
    const totalTime = Math.round(performance.now() - startTime)
    const fromCache = result.meta.performance.fromCache
    const cacheKey = result.meta.cache.key
    
    console.log(`${fromCache ? '🚀' : '💨'} [${requestId}] ${fromCache ? 'Cache HIT' : 'Cache MISS'} in ${totalTime}ms`)
    console.log(`📋 [${requestId}] Cache key: ${cacheKey.substring(0, 80)}...`)
    
    if (!fromCache && totalTime > 5000) {
      console.warn(`🐌 [${requestId}] Slow query detected: ${totalTime}ms - consider optimization`)
    }
    
    // 4. Réponse avec headers optimisés
    const response = NextResponse.json(createSuccessResponse(result))
    
    // Headers de cache adaptatifs selon si c'est un cache hit ou miss
    const cacheTTL = result.meta.cache.ttl
    if (fromCache) {
      // Cache hit - headers pour client
      response.headers.set('Cache-Control', `public, max-age=60, s-maxage=60`)
    } else {
      // Cache miss - headers normaux
      response.headers.set('Cache-Control', `public, max-age=${cacheTTL}, s-maxage=${cacheTTL}, stale-while-revalidate=3600`)
    }
    
    // Headers de debug et monitoring
    response.headers.set('X-Cache-Status', fromCache ? 'HIT' : 'MISS')
    response.headers.set('X-Query-Time', `${totalTime}ms`)
    response.headers.set('X-Detail-Level', validatedParams.detail)
    response.headers.set('X-Request-ID', requestId)
    response.headers.set('X-Cache-TTL', cacheTTL.toString())
    response.headers.set('X-Cache-Key', cacheKey.substring(0, 100)) // Pour debug
    
    // Header pour performance monitoring
    if (result.totalCA) {
      response.headers.set('X-Total-CA', result.totalCA.toString())
    }
    
    return response
    
  } catch (error) {
    const totalTime = Math.round(performance.now() - startTime)
    console.error(`❌ [${requestId}] KPI CA API Error (${totalTime}ms):`, error)
    
    if (error instanceof z.ZodError) {
      const details = error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        received: e.received
      }))
      
      console.log(`📋 [${requestId}] Validation errors:`, details)
      
      return NextResponse.json(
        createErrorResponse('Paramètres invalides', 'VALIDATION_ERROR', details),
        { status: 400 }
      )
    }
    
    if (error instanceof Error) {
      const errorMap: Record<string, { status: number; code: string }> = {
        'PharmacyNotFoundError': { status: 404, code: 'PHARMACY_NOT_FOUND' },
        'InvalidDateRangeError': { status: 400, code: 'INVALID_DATE_RANGE' },
        'NoDataFoundError': { status: 404, code: 'NO_DATA_FOUND' }
      }
      
      const errorInfo = errorMap[error.constructor.name]
      if (errorInfo) {
        return NextResponse.json(
          createErrorResponse(error.message, errorInfo.code),
          { status: errorInfo.status }
        )
      }
    }
    
    const response = NextResponse.json(
      createErrorResponse('Erreur serveur interne', 'INTERNAL_ERROR'),
      { status: 500 }
    )
    
    response.headers.set('X-Query-Time', `${totalTime}ms`)
    response.headers.set('X-Request-ID', requestId)
    
    return response
  }
}

// ==========================================
// HANDLER POST POUR REQUÊTES COMPLEXES
// ==========================================

export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<CAResponse>>> {
  const startTime = performance.now()
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    console.log(`🔍 [${requestId}] KPI CA POST called`)
    
    const body = await request.json()
    console.log(`📊 [${requestId}] POST body:`, {
      ...body,
      ean13s: body.ean13s ? `${body.ean13s.length} EAN13s` : undefined,
      pharmacyIds: body.pharmacyIds ? `${body.pharmacyIds.length} pharmacies` : undefined
    })
    
    const validatedParams = CAApiParamsSchema.parse(body)
    const result = await flexibleKpiCAService.calculateCA(validatedParams)
    
    const totalTime = Math.round(performance.now() - startTime)
    const fromCache = result.meta.performance.fromCache
    
    console.log(`${fromCache ? '🚀' : '💨'} [${requestId}] POST ${fromCache ? 'cached' : 'calculated'} in ${totalTime}ms`)
    
    const response = NextResponse.json(createSuccessResponse(result))
    response.headers.set('X-Cache-Status', fromCache ? 'HIT' : 'MISS')
    response.headers.set('X-Query-Time', `${totalTime}ms`)
    response.headers.set('X-Detail-Level', validatedParams.detail)
    response.headers.set('X-Request-ID', requestId)
    
    return response
    
  } catch (error) {
    const totalTime = Math.round(performance.now() - startTime)
    console.error(`❌ [${requestId}] KPI CA POST Error:`, error)
    
    if (error instanceof z.ZodError) {
      const details = error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
      
      return NextResponse.json(
        createErrorResponse('Paramètres invalides', 'VALIDATION_ERROR', details),
        { status: 400 }
      )
    }
    
    const response = NextResponse.json(
      createErrorResponse('Erreur serveur interne', 'INTERNAL_ERROR'),
      { status: 500 }
    )
    
    response.headers.set('X-Query-Time', `${totalTime}ms`)
    response.headers.set('X-Request-ID', requestId)
    
    return response
  }
}

// ==========================================
// HANDLER DELETE - GESTION DU CACHE
// ==========================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = Math.random().toString(36).substring(7)
  
  try {
    const { searchParams } = request.nextUrl
    const action = searchParams.get('action')
    const pharmacyId = searchParams.get('pharmacyId')
    
    console.log(`🗑️  [${requestId}] Cache management action: ${action}`)
    
    if (action === 'invalidate' && pharmacyId) {
      await flexibleKpiCAService.invalidatePharmacyCache(pharmacyId)
      return NextResponse.json({ 
        success: true, 
        message: `Cache invalidated for pharmacy ${pharmacyId}`,
        meta: { requestId, timestamp: new Date().toISOString() }
      })
    }
    
    if (action === 'invalidate-all') {
      await flexibleKpiCAService.invalidateAllCache()
      return NextResponse.json({ 
        success: true, 
        message: 'All CA cache invalidated',
        meta: { requestId, timestamp: new Date().toISOString() }
      })
    }
    
    if (action === 'warm') {
      console.log(`🔥 [${requestId}] Starting cache warming...`)
      await flexibleKpiCAService.warmCache()
      return NextResponse.json({ 
        success: true, 
        message: 'Cache warming completed successfully',
        meta: { requestId, timestamp: new Date().toISOString() }
      })
    }
    
    if (action === 'stats') {
      // Retourner des stats basiques sur le cache
      return NextResponse.json({ 
        success: true, 
        data: {
          cacheProvider: 'Upstash Redis + Memory',
          ttlSettings: {
            summary: '1h',
            pharmacy: '30min', 
            product: '15min',
            full: '10min'
          },
          endpoints: {
            'GET /kpis/ca': 'Main CA endpoint with cache',
            'POST /kpis/ca': 'Complex queries with cache',
            'DELETE /kpis/ca?action=warm': 'Warm common queries',
            'DELETE /kpis/ca?action=invalidate-all': 'Clear all cache',
            'DELETE /kpis/ca?action=invalidate&pharmacyId=uuid': 'Clear pharmacy cache'
          }
        },
        meta: { requestId, timestamp: new Date().toISOString() }
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid cache action. Use: warm, invalidate, invalidate-all, stats',
      meta: { requestId, timestamp: new Date().toISOString() }
    }, { status: 400 })
    
  } catch (error) {
    console.error(`❌ [${requestId}] Cache management error:`, error)
    return NextResponse.json({ 
      success: false, 
      error: 'Cache management failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      meta: { requestId, timestamp: new Date().toISOString() }
    }, { status: 500 })
  }
}

// ==========================================
// METADATA NEXT.JS
// ==========================================

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30 // 30s timeout max