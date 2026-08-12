import { ResumeService } from '@/features/resume/services/resume.service'

describe('ResumeService', () => {
  let service: ResumeService

  beforeEach(() => {
    service = new ResumeService()
  })

  describe('analyze', () => {
    it('should analyze a resume with good content', async () => {
      const content = Buffer.from(`
        EXPERIENCE
        Senior Software Engineer at Tech Corp
        Developed and deployed microservices using React, Node.js, and AWS
        Improved performance by 40% across the platform
        
        EDUCATION
        Bachelor of Science in Computer Science
        
        SKILLS
        JavaScript, TypeScript, Python, React, Node, SQL, AWS, Docker
        
        CONTACT
        john@example.com
        Phone: +63 917 123 4567
        Location: Davao City, Philippines
        github.com/john
        linkedin.com/in/john
      `)

      const result = await service.analyze(content, 'resume.pdf')
      expect(result.score).toBeGreaterThan(50)
      expect(result.strengths.length).toBeGreaterThan(0)
      expect(result.details?.phone).toBe('+63 917 123 4567')
      expect(result.details?.location).toBe('Davao City, Philippines')
    })

    it('should analyze a resume with poor content', async () => {
      const content = Buffer.from('My name is John.')
      const result = await service.analyze(content, 'resume.pdf')
      expect(result.score).toBeLessThan(50)
      expect(result.recommendations.length).toBeGreaterThan(0)
    })
  })
})
