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

describe('/api/reviews/validate-resume', () => {
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
      size: 3,
      arrayBuffer: async () => new ArrayBuffer(3),
    }

    const response = await POST({
      formData: async () => ({ get: () => file }),
    } as unknown as Request)
    const json = await response.json()

    expect(json.success).toBe(true)
    expect(json.data.detectedLinks.github[0].username).toBe('jane-dev')
    expect(json.data.detectedLinks.portfolioCandidates[0].normalized).toBe('https://janedev.dev')
  })
})
