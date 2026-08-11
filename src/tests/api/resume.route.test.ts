jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/features/credits/repositories/credit.repository', () => ({
  creditRepository: {
    getUserCredits: jest.fn(),
    deductCredits: jest.fn(),
    addCreditsAdmin: jest.fn(),
  },
}))

jest.mock('@/features/resume/services/resume.service', () => ({
  resumeService: {
    analyze: jest.fn(),
  },
}))

jest.mock('@/config/pricing', () => ({
  getAnalysisCost: jest.fn(() => 1),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

import { POST } from '@/app/api/reviews/resume/route'
import { createClient } from '@/lib/supabase/server'
import { creditRepository } from '@/features/credits/repositories/credit.repository'
import { resumeService } from '@/features/resume/services/resume.service'
import { ResumePdfExtractionError } from '@/features/resume/services/resume-scanned-pdf.service'

const arrayBufferFrom = (value: string) => Uint8Array.from(Buffer.from(value)).buffer
const pdfArrayBuffer = () => arrayBufferFrom('%PDF-1.4\n')

function requestWithPdf() {
  const file = {
    name: 'resume.pdf',
    type: 'application/pdf',
    size: 9,
    arrayBuffer: async () => pdfArrayBuffer(),
  }
  return {
    formData: async () => ({ get: () => file }),
  } as unknown as Parameters<typeof POST>[0]
}

describe('/api/reviews/resume credit safety', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(createClient).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    } as never)
    jest.mocked(creditRepository.getUserCredits).mockResolvedValue(5)
    jest.mocked(creditRepository.deductCredits).mockResolvedValue(true)
    jest.mocked(creditRepository.addCreditsAdmin).mockResolvedValue(undefined)
  })

  it('refunds the deducted credit when a scanned PDF fails analysis', async () => {
    jest.mocked(resumeService.analyze).mockRejectedValue(
      new ResumePdfExtractionError('SCANNED_PDF', 'scanned', 1, 1)
    )

    const response = await POST(requestWithPdf())
    const json = await response.json()

    expect(response.status).toBe(422)
    expect(json.success).toBe(false)
    expect(json.message).toMatch(/credit was refunded/i)
    expect(creditRepository.deductCredits).toHaveBeenCalledWith('user-1', 1)
    expect(creditRepository.addCreditsAdmin).toHaveBeenCalledWith('user-1', 1)
  })

  it('does not claim a refund when the refund operation fails', async () => {
    jest.mocked(resumeService.analyze).mockRejectedValue(
      new ResumePdfExtractionError('SCANNED_PDF', 'scanned', 1, 1)
    )
    jest.mocked(creditRepository.addCreditsAdmin).mockRejectedValue(new Error('refund failed'))

    const response = await POST(requestWithPdf())
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.message).toMatch(/refund could not be confirmed/i)
    expect(json.message).not.toMatch(/credit was refunded/i)
  })

  it('does not deduct a credit when the file is not actually a PDF', async () => {
    const file = {
      name: 'resume.pdf',
      type: 'application/pdf',
      size: 4,
      arrayBuffer: async () => arrayBufferFrom('NOPE'),
    }
    const response = await POST({
      formData: async () => ({ get: () => file }),
    } as unknown as Parameters<typeof POST>[0])

    expect(response.status).toBe(400)
    expect(creditRepository.deductCredits).not.toHaveBeenCalled()
    expect(resumeService.analyze).not.toHaveBeenCalled()
  })
})
