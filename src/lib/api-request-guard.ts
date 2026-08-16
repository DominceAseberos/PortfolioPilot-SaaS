import { NextResponse } from 'next/server'

export interface ApiRequestContext {
  scope: string
  requestId: string
  startedAt: number
}

export interface RateLimitConfig {
  limit: number
  windowMs: number
  identity?: string | null
}

export interface RateLimitDecision {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

interface RateLimitBucket {
  count: number
  resetAt: number
}

type RateLimitStore = Map<string, RateLimitBucket>

declare global {
  var __portfolioPilotRateLimitStore: RateLimitStore | undefined
}

const MAX_BUCKETS = 5_000

function getStore(): RateLimitStore {
  if (!globalThis.__portfolioPilotRateLimitStore) globalThis.__portfolioPilotRateLimitStore = new Map()
  return globalThis.__portfolioPilotRateLimitStore
}

function cleanupExpiredBuckets(store: RateLimitStore, now: number): void {
  if (store.size < MAX_BUCKETS) return
  for (const [key, bucket] of store) if (bucket.resetAt <= now) store.delete(key)
  if (store.size <= MAX_BUCKETS) return
  const overflow = store.size - MAX_BUCKETS
  let removed = 0
  for (const key of store.keys()) {
    store.delete(key)
    removed += 1
    if (removed >= overflow) break
  }
}

function getClientAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown-client'
}

function sanitizeRequestId(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return /^[A-Za-z0-9._:-]{8,96}$/.test(trimmed) ? trimmed : null
}

export function createApiRequestContext(request: Request, scope: string): ApiRequestContext {
  return {
    scope,
    requestId: sanitizeRequestId(request.headers.get('x-request-id')) || crypto.randomUUID(),
    startedAt: performance.now(),
  }
}

export function checkApiRateLimit(
  request: Request,
  context: ApiRequestContext,
  config: RateLimitConfig
): RateLimitDecision {
  const now = Date.now()
  const identity = config.identity?.trim() || getClientAddress(request)
  const key = `${context.scope}:${identity}`
  const store = getStore()
  cleanupExpiredBuckets(store, now)

  let bucket = store.get(key)
  if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + config.windowMs }
  bucket.count += 1
  store.set(key, bucket)

  return {
    allowed: bucket.count <= config.limit,
    limit: config.limit,
    remaining: Math.max(0, config.limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  }
}

export function finalizeApiResponse<T extends Response>(
  response: T,
  context: ApiRequestContext,
  rateLimit?: RateLimitDecision
): T {
  response.headers.set('x-request-id', context.requestId)
  response.headers.set('server-timing', `app;dur=${Math.max(0, performance.now() - context.startedAt).toFixed(1)}`)
  if (rateLimit) {
    response.headers.set('x-ratelimit-limit', String(rateLimit.limit))
    response.headers.set('x-ratelimit-remaining', String(rateLimit.remaining))
    response.headers.set('x-ratelimit-reset', String(Math.ceil(rateLimit.resetAt / 1000)))
    if (!rateLimit.allowed) response.headers.set('retry-after', String(rateLimit.retryAfterSeconds))
  }
  return response
}

export function apiRateLimitResponse(
  context: ApiRequestContext,
  decision: RateLimitDecision
): NextResponse {
  return finalizeApiResponse(NextResponse.json({
    success: false,
    code: 'RATE_LIMITED',
    message: `Too many requests. Please retry in ${decision.retryAfterSeconds} seconds.`,
    error: `Too many requests. Please retry in ${decision.retryAfterSeconds} seconds.`,
    retryAfterSeconds: decision.retryAfterSeconds,
    requestId: context.requestId,
  }, { status: 429 }), context, decision)
}

export function logApiRequestError(
  context: ApiRequestContext,
  error: unknown,
  extra?: Record<string, unknown>
): void {
  console.error(`[${context.scope}] request failed`, {
    requestId: context.requestId,
    error: error instanceof Error ? error.message : String(error),
    ...extra,
  })
}

export function resetApiRateLimitStoreForTests(): void {
  globalThis.__portfolioPilotRateLimitStore?.clear()
}
