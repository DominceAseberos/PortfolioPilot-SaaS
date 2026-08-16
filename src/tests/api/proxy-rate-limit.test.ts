jest.mock('next/server', () => {
  const createHeaders = () => {
    const values = new Map<string, string>()
    return {
      set: (name: string, value: string) => values.set(name.toLowerCase(), value),
      get: (name: string) => values.get(name.toLowerCase()) ?? null,
    }
  }
  return {
    NextResponse: {
      next: jest.fn(() => ({ status: 200, headers: createHeaders() })),
      json: jest.fn((body: unknown, init?: { status?: number }) => ({
        status: init?.status ?? 200,
        body,
        headers: createHeaders(),
      })),
    },
  }
})

import { proxy } from '@/proxy'
import { resetApiRateLimitStoreForTests } from '@/lib/api-request-guard'

type ProxyResponse = {
  status: number
  body?: Record<string, unknown>
  headers: { get: (name: string) => string | null }
}

function apiRequest(path: string, guestId = 'guest-user-123'): Parameters<typeof proxy>[0] {
  return {
    nextUrl: { pathname: path },
    headers: new Headers({ 'x-forwarded-for': '203.0.113.4' }),
    cookies: {
      get: (name: string) => name === 'portfolio_guest_id' ? { value: guestId } : undefined,
    },
  } as unknown as Parameters<typeof proxy>[0]
}

describe('API proxy resilience guard', () => {
  beforeEach(() => {
    resetApiRateLimitStoreForTests()
    jest.clearAllMocks()
  })

  it('allows requests under the route budget and adds observability headers', () => {
    const response = proxy(apiRequest('/api/reviews/resume')) as unknown as ProxyResponse

    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toBeTruthy()
    expect(response.headers.get('server-timing')).toMatch(/^app;dur=/)
    expect(response.headers.get('x-ratelimit-limit')).toBe('8')
    expect(response.headers.get('x-ratelimit-remaining')).toBe('7')
  })

  it('blocks the ninth resume analysis request before the route executes', () => {
    let response: ProxyResponse | null = null
    for (let index = 0; index < 9; index += 1) {
      response = proxy(apiRequest('/api/reviews/resume')) as unknown as ProxyResponse
    }

    expect(response?.status).toBe(429)
    expect(response?.body?.code).toBe('RATE_LIMITED')
    expect(response?.headers.get('retry-after')).toBeTruthy()
    expect(response?.headers.get('x-request-id')).toBeTruthy()
  })

  it('keeps separate guest identities and route scopes independent', () => {
    for (let index = 0; index < 8; index += 1) {
      proxy(apiRequest('/api/reviews/resume', 'guest-user-123'))
    }

    const otherGuest = proxy(apiRequest('/api/reviews/resume', 'guest-user-456')) as unknown as ProxyResponse
    const otherRoute = proxy(apiRequest('/api/resume/improve', 'guest-user-123')) as unknown as ProxyResponse

    expect(otherGuest.status).toBe(200)
    expect(otherRoute.status).toBe(200)
  })

  it('does not rate limit inexpensive API routes', () => {
    for (let index = 0; index < 30; index += 1) {
      const response = proxy(apiRequest('/api/user/claim-credits')) as unknown as ProxyResponse
      expect(response.status).toBe(200)
      expect(response.headers.get('x-ratelimit-limit')).toBeNull()
    }
  })
})
