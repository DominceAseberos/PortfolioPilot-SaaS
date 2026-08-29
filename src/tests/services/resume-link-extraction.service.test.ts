import { ResumeLinkExtractionService } from '@/features/resume/services/resume-link-extraction.service'

describe('ResumeLinkExtractionService', () => {
  let service: ResumeLinkExtractionService

  beforeEach(() => {
    service = new ResumeLinkExtractionService()
  })

  it('extracts GitHub URLs with trailing paths and punctuation', () => {
    const result = service.extract(`
      Code: https://github.com/jane-dev/frontend-dashboard.
      Also see github.com/jane-dev,
    `)

    expect(result.github).toHaveLength(1)
    expect(result.github[0]).toMatchObject({
      username: 'jane-dev',
      normalized: 'https://github.com/jane-dev',
    })
  })

  it('extracts LinkedIn profile URLs', () => {
    const result = service.extract('LinkedIn: https://www.linkedin.com/in/jane-dev/')

    expect(result.linkedin).toHaveLength(1)
    expect(result.linkedin[0].normalized).toBe('https://www.linkedin.com/in/jane-dev/')
  })

  it('extracts multiple portfolio candidates without GitHub or LinkedIn', () => {
    const result = service.extract(`
      Portfolio: janedev.dev
      Case studies: https://work.janedev.io/projects
      GitHub: https://github.com/jane-dev
      LinkedIn: linkedin.com/in/jane-dev
    `)

    expect(result.portfolioCandidates.map((link) => link.normalized)).toEqual([
      'https://janedev.dev',
      'https://work.janedev.io/projects',
    ])
  })

  it('treats hosted portfolio platforms such as Notion as portfolio candidates', () => {
    const result = service.extract('Portfolio: https://designer.notion.site/selected-work-123456')

    expect(result.portfolioCandidates).toEqual([
      expect.objectContaining({ normalized: 'https://designer.notion.site/selected-work-123456' }),
    ])
  })

  it('does not treat library names like Chart.js as portfolio links', () => {
    const result = service.extract('Skills: React, TypeScript, Chart.js, Node.js')

    expect(result.portfolioCandidates).toEqual([])
  })
})
