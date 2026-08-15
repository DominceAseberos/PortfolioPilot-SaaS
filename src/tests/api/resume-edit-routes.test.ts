jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/features/ai/services/ai.service', () => ({
  generateImprovedResumeContent: jest.fn(),
  optimizeResumeContentForLayout: jest.fn(),
}))

jest.mock('@/features/resume/services/resume-diff.service', () => ({
  diffResumeSections: jest.fn(() => []),
}))

jest.mock('@/features/resume/services/resume-provenance.service', () => ({
  decorateEnhancedResumeProvenance: jest.fn((_: unknown, sections: unknown) => sections),
}))

jest.mock('@/features/resume/services/resume-layout.service', () => ({
  analyzeResumePreflight: jest.fn(() => ({ fit: 'tight', estimatedPages: 2, score: 60, reasons: [] })),
}))

import { TextEncoder as NodeTextEncoder } from 'util'
import { POST as improvePOST } from '@/app/api/resume/improve/route'
import { POST as optimizePOST } from '@/app/api/resume/optimize/route'
import { POST as verifyPOST } from '@/app/api/resume/verify-pdf/route'
import { createClient } from '@/lib/supabase/server'
import {
  generateImprovedResumeContent,
  optimizeResumeContentForLayout,
} from '@/features/ai/services/ai.service'

Object.defineProperty(globalThis, 'TextEncoder', { configurable: true, value: NodeTextEncoder })

type RouteResponse = { status: number; json: () => Promise<Record<string, unknown>> }

function requestWithJson(body: unknown, declaredLength?: number): Request {
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  return {
    headers: {
      get: (name: string) => name.toLowerCase() === 'content-length' && declaredLength !== undefined
        ? String(declaredLength)
        : null,
    },
    text: async () => raw,
  } as unknown as Request
}

function declaredOnlyRequest(declaredLength: number): Request {
  return {
    headers: {
      get: (name: string) => name.toLowerCase() === 'content-length'
        ? String(declaredLength)
        : null,
    },
    formData: jest.fn(),
  } as unknown as Request
}

describe('resume edit API resource limits', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    } as never)
  })

  it('rejects an oversized improve request before invoking AI', async () => {
    const response = await improvePOST(
      requestWithJson({}, 1_000_001)
    ) as unknown as RouteResponse
    const body = await response.json()

    expect(response.status).toBe(413)
    expect(body.error).toMatch(/too large/i)
    expect(generateImprovedResumeContent).not.toHaveBeenCalled()
  })

  it('rejects an excessive section count before invoking improve AI', async () => {
    const response = await improvePOST(
      requestWithJson({
        originalSections: Array.from({ length: 61 }, (_, index) => ({
          title: `Section ${index}`,
          type: 'text',
          text: 'Content',
          acceptsAIImprovements: true,
        })),
      })
    ) as unknown as RouteResponse
    const body = await response.json()

    expect(response.status).toBe(413)
    expect(body.error).toMatch(/too many sections/i)
    expect(generateImprovedResumeContent).not.toHaveBeenCalled()
  })

  it('rejects an excessive optimize section count before layout AI', async () => {
    const response = await optimizePOST(
      requestWithJson({
        templateId: 'classic',
        data: {
          name: 'Jane Example',
          sections: Array.from({ length: 61 }, (_, index) => ({
            title: `Section ${index}`,
            type: 'text',
            text: 'Content',
            acceptsAIImprovements: true,
          })),
        },
      })
    ) as unknown as RouteResponse
    const body = await response.json()

    expect(response.status).toBe(413)
    expect(body.error).toMatch(/too many sections/i)
    expect(optimizeResumeContentForLayout).not.toHaveBeenCalled()
  })

  it('rejects an oversized verification request before parsing multipart data', async () => {
    const request = declaredOnlyRequest(8 * 1024 * 1024 + 1)
    const response = await verifyPOST(request) as unknown as RouteResponse
    const body = await response.json()

    expect(response.status).toBe(413)
    expect(body.error).toMatch(/too large/i)
    expect(request.formData).not.toHaveBeenCalled()
  })
})
