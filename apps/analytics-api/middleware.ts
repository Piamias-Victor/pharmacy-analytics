import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const startTime = Date.now()
  
  // Get client IP (Next.js way)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
  
  // Simple logging (will be replaced with Pino when service is implemented)
  console.log('API Request', {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip
  })

  // Headers CORS pour développement
  const response = NextResponse.next()
  
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  // Headers de sécurité
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Log du temps de réponse
  const responseTime = Date.now() - startTime
  response.headers.set('X-Response-Time', `${responseTime}ms`)

  return response
}

export const config = {
  matcher: [
    '/api/:path*'
  ]
}