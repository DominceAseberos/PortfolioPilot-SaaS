import { cn, formatScore, getScoreBarColor } from '@/lib/utils'

describe('Utility functions', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('px-4', 'py-2')).toContain('px-4')
      expect(cn('px-4', 'py-2')).toContain('py-2')
    })
  })

  describe('formatScore', () => {
    it('should format a score', () => {
      expect(formatScore(85)).toBe('85/100')
    })

    it('should return N/A for null', () => {
      expect(formatScore(null)).toBe('N/A')
    })
  })

  describe('getScoreBarColor', () => {
    it('should return green for high scores', () => {
      expect(getScoreBarColor(85)).toContain('green')
    })

    it('should return yellow for medium scores', () => {
      expect(getScoreBarColor(70)).toContain('yellow')
    })

    it('should return red for low scores', () => {
      expect(getScoreBarColor(40)).toContain('red')
    })

    it('should return gray for null', () => {
      expect(getScoreBarColor(null)).toContain('gray')
    })
  })
})
