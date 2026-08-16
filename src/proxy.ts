import { NextRequest, NextResponse } from 'next/server'
import {
  apiRateLimitResponse,
  checkApiRateLimit,
  createApiRequestContext,
  finalizeApiResponse,
} from '@/lib/api-request-guard'

const EXPENSIVE_API_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  '/api/resume/improve': { limit: 12, windowMs: 60_000 },
  '/api/resume/optimize': { limit: 15, windowMs: 60_000 },
  '/api/resume/verify-pdf': { limit: 20, windowMs: 60_000 },
  '/api/reviews/ai-summary': { limit: 8, windowMs: 60_000 },
  '/api/reviews/github': { limit: 10, windowMs: 60_000 },
  '/api/reviews/portfolio': { limit: 8, windowMs: 60_000 },
  '/api/reviews/resume': { limit: 8, windowMs: 60_000 },
  '/api/reviews/validate-resume': { limit: 20, windowMs: 60_000 },
}

function getStableClientIdentity(request: NextRequest): string | undefined {
  const guestId = request.cookies.get('portfolio_guest_id')?.value?.trim()
  if (guestId && /^[A-Za-z0-9_-]{8,128}$/.test(guestId)) return `guest:${guestId}`
  return undefined
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const requestContext = createApiRequestContext(request, path)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestContext.requestId)

  const limitConfig = EXPENSIVE_API_LIMITS[path]
  if (!limitConfig) {
    return finalizeApiResponse(
      NextResponse.next({ request: { headers: requestHeaders } }),
      requestContext
    )
  }

  const decision = checkApiRateLimit(request, requestContext, {
    ...limitConfig,
    identity: getStableClientIdentity(request),
  })

  if (!decision.allowed) return apiRateLimitResponse(requestContext, decision)

  return finalizeApiResponse(
    NextResponse.next({ request: { headers: requestHeaders } }),
    requestContext,
    decision
  )
}

export const config = {
  matcher: ['/api/:path*'],
}
