jest.mock('@/features/ai/services/ai.service', () => ({
  analyzePortfolioWithAI: jest.fn().mockResolvedValue(null),
}))

import { PortfolioService } from '@/features/reviews/services/portfolio.service'
import { URLValidationService } from '@/features/reviews/services/validation.service'

function mockResponse({
  body,
  status = 200,
  url = 'https://portfolio.example/',
  headers = {},
}: {
  body: string
  status?: number
  url?: string
  headers?: Record<string, string>
}): Response {
  const normalized = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]))
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: {
      get: (name: string) => normalized.get(name.toLowerCase()) ?? null,
    },
    text: async () => body,
  } as unknown as Response
}

const portfolioHtml = `<!doctype html>
<html lang="en">
<head>
  <title>Jordan Lee — Product Designer Portfolio</title>
  <meta name="description" content="Product designer portfolio with selected projects, experience, and contact information.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <nav>Work Contact</nav>
  <main>
    <h1>Jordan Lee</h1>
    <h2>Projects</h2>
    <h2>Experience</h2>
    <p>Portfolio case studies and selected work.</p>
    <p>Product design experience and outcomes.</p>
    <p>Contact me for project opportunities.</p>
  </main>
</body>
</html>`

describe('portfolio crawler resilience', () => {
  const originalFetch = global.fetch
  const originalScrapingAntKey = process.env.SCRAPINGANT_API_KEY

  afterEach(() => {
    global.fetch = originalFetch
    if (originalScrapingAntKey === undefined) delete process.env.SCRAPINGANT_API_KEY
    else process.env.SCRAPINGANT_API_KEY = originalScrapingAntKey
    jest.restoreAllMocks()
  })

  it('falls back to a direct fetch when ScrapingAnt is rate limited', async () => {
    process.env.SCRAPINGANT_API_KEY = 'test-key'
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(mockResponse({ body: 'rate limited', status: 429, url: 'https://api.scrapingant.com/' }))
      .mockResolvedValueOnce(mockResponse({
        body: portfolioHtml,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }))
    global.fetch = fetchMock as unknown as typeof fetch

    const result = await new PortfolioService().analyze('https://portfolio.example')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('api.scrapingant.com')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://portfolio.example')
    expect(result.details?.checks?.length).toBeGreaterThan(0)
    expect(result.weaknesses).not.toContain('Could not access the provided URL')
  })

  it('marks an otherwise valid site as non-embeddable when X-Frame-Options denies frames', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse({
      body: portfolioHtml,
      url: 'https://portfolio.example/',
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-frame-options': 'DENY',
      },
    })) as unknown as typeof fetch

    const result = await new URLValidationService().validatePortfolioUrl('https://portfolio.example')

    expect(result.isValid).toBe(true)
    expect(result.preview).toEqual(expect.objectContaining({
      embedAllowed: false,
      finalUrl: 'https://portfolio.example/',
      title: 'Jordan Lee — Product Designer Portfolio',
    }))
    expect(result.preview?.blockedBy).toMatch(/X-Frame-Options/i)
  })

  it('accepts reachable HTML even when it has no hardcoded portfolio vocabulary', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse({
      body: '<!doctype html><html><head><title>Ana Cruz</title></head><body><main><h1>Ana Cruz</h1><p>Mga piling gawa.</p></main></body></html>',
      url: 'https://ana.example/',
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })) as unknown as typeof fetch

    const result = await new URLValidationService().validatePortfolioUrl('https://ana.example')

    expect(result.isValid).toBe(true)
    expect(result.preview).toEqual(expect.objectContaining({
      embedAllowed: true,
      finalUrl: 'https://ana.example/',
      title: 'Ana Cruz',
    }))
  })

  it('uses the same fallback for CSP frame-ancestors restrictions', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse({
      body: portfolioHtml,
      url: 'https://secure.example/',
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'content-security-policy': "default-src 'self'; frame-ancestors 'self'",
      },
    })) as unknown as typeof fetch

    const result = await new URLValidationService().validatePortfolioUrl('https://secure.example')

    expect(result.isValid).toBe(true)
    expect(result.preview?.embedAllowed).toBe(false)
    expect(result.preview?.blockedBy).toMatch(/Content-Security-Policy/i)
  })
})
