import { PortfolioService } from '@/features/reviews/services/portfolio.service'

describe('PortfolioService', () => {
  let service: PortfolioService

  beforeEach(() => {
    service = new PortfolioService()
  })

  describe('analyze', () => {
    it('should return a low score for invalid URLs', async () => {
      const result = await service.analyze('https://invalid-url-that-does-not-exist.com/')
      expect(result.score).toBe(0)
      expect(result.weaknesses).toContain('Could not access the provided URL')
    })

    it('should return analysis structure', async () => {
      const result = await service.analyze('https://example.com')
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('strengths')
      expect(result).toHaveProperty('weaknesses')
      expect(result).toHaveProperty('recommendations')
      expect(Array.isArray(result.strengths)).toBe(true)
      expect(Array.isArray(result.weaknesses)).toBe(true)
      expect(Array.isArray(result.recommendations)).toBe(true)
    })
  })
})
