jest.mock('@/features/resume/services/resume.service', () => ({
  resumeService: {
    extractText: jest.fn(),
    validateResumeContent: jest.fn(),
  },
}))

jest.mock('@/features/resume/services/resume-link-extraction.service', () => ({
  resumeLinkExtractionService: {
    validate: jest.fn(),
  },
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

import { POST } from '@/app/api/reviews/validate-resume/route'
import { resumeService } from '@/features/resume/services/resume.service'
import { resumeLinkExtractionService } from '@/features/resume/services/resume-link-extraction.service'
import { ResumePdfExtractionError } from '@/features/resume/services/resume-scanned-pdf.service'

const arrayBufferFrom = (value: string) => Uint8Array.from(Buffer.from(value)).buffer
const pdfArrayBuffer = () => arrayBufferFrom('%PDF-1.4\n')

describe('/api/reviews/validate-resume', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns detected link validation metadata for valid resumes', async () => {
    jest.mocked(resumeService.extractText).mockResolvedValue(`
      Jane Dev
      Experience 2022 Present
      Education Bachelor Computer Science
      Skills TypeScript React Node
      jane@example.com
      https://github.com/jane-dev
      https://janedev.dev
    `)
    jest.mocked(resumeService.validateResumeContent).mockReturnValue({ isValid: true })
    jest.mocked(resumeLinkExtractionService.validate).mockResolvedValue({
      github: [
        {
          url: 'https://github.com/jane-dev',
          normalized: 'https://github.com/jane-dev',
          username: 'jane-dev',
          isValid: true,
        },
      ],
      linkedin: [],
      portfolioCandidates: [
        {
          url: 'https://janedev.dev',
          normalized: 'https://janedev.dev',
          isValid: true,
        },
      ],
    })

    const file = {
      type: 'application/pdf',
      size: 9,
      arrayBuffer: async () => pdfArrayBuffer(),
    }

    const response = await POST({
      formData: async () => ({ get: () => file }),
    } as unknown as Request)
    const json = await response.json()

    expect(json.success).toBe(true)
    expect(json.data.detectedLinks.github[0].username).toBe('jane-dev')
    expect(json.data.detectedLinks.portfolioCandidates[0].normalized).toBe('https://janedev.dev')
  })

  it('returns a specific scanned-PDF response for image-only resumes', async () => {
    jest.mocked(resumeService.extractText).mockRejectedValue(
      new ResumePdfExtractionError('SCANNED_PDF', 'scanned', 1, 1)
    )

    const file = {
      type: 'application/pdf',
      size: 9,
      arrayBuffer: async () => pdfArrayBuffer(),
    }

    const response = await POST({
      formData: async () => ({ get: () => file }),
    } as unknown as Request)
    const json = await response.json()

    expect(response.status).toBe(422)
    expect(json.success).toBe(false)
    expect(json.code).toBe('SCANNED_PDF')
    expect(json.message).toMatch(/scanned|image-only/i)
  })

  it('rejects files with a fake PDF MIME type but no PDF signature', async () => {
    const file = {
      type: 'application/pdf',
      size: 4,
      arrayBuffer: async () => arrayBufferFrom('NOPE'),
    }

    const response = await POST({
      formData: async () => ({ get: () => file }),
    } as unknown as Request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.message).toMatch(/not a valid PDF/i)
    expect(resumeService.extractText).not.toHaveBeenCalled()
  })
})
