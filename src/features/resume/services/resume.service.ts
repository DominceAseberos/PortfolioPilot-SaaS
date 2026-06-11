import type { ResumeAnalysis } from '@/types'
import { logger } from '@/lib/logger'

export class ResumeService {
  async analyze(_fileBuffer: Buffer, fileName: string): Promise<ResumeAnalysis> {
    try {
      const text = _fileBuffer.toString('utf-8').replace(/[^\w\s\.\,\(\)\-\:\/\@\#\+]/g, ' ')

      const strengths: string[] = []
      const weaknesses: string[] = []
      const recommendations: string[] = []

      const keywordChecks = this.checkKeywords(text)
      const formatChecks = this.checkFormatting(text)

      strengths.push(...keywordChecks.strengths)
      weaknesses.push(...keywordChecks.weaknesses)
      recommendations.push(...keywordChecks.recommendations)
      recommendations.push(...formatChecks.recommendations)

      const passedChecks = keywordChecks.passed
      const totalChecks = keywordChecks.total + formatChecks.total
      const score = Math.round((passedChecks / Math.max(totalChecks, 1)) * 100)

      return { score, strengths, weaknesses, recommendations }
    } catch (error) {
      logger.error('Resume analysis failed', { error: String(error), fileName })
      return {
        score: 0,
        strengths: [],
        weaknesses: ['Could not parse the resume file'],
        recommendations: ['Ensure the file is a valid PDF with selectable text'],
      }
    }
  }

  private checkKeywords(text: string) {
    const strengths: string[] = []
    const weaknesses: string[] = []
    const recommendations: string[] = []
    let passed = 0
    const total = 8

    const skills = ['javascript', 'typescript', 'python', 'react', 'node', 'sql', 'aws', 'docker', 'git', 'api', 'agile', 'leadership', 'communication', 'teamwork', 'problem.solving']
    const foundSkills = skills.filter((s) => new RegExp(s.replace('.', '\\.'), 'i').test(text))
    if (foundSkills.length >= 3) { strengths.push(`Mentions relevant skills (${foundSkills.slice(0, 5).join(', ')})`); passed++ }
    else { weaknesses.push('Few relevant skills mentioned'); recommendations.push('Add more technical and soft skills relevant to your target role') }

    const hasExperience = /(experience|work|employment|job|role|position)/i.test(text)
    if (hasExperience) { strengths.push('Includes work experience section'); passed++ }
    else { weaknesses.push('No work experience section found'); recommendations.push('Add a work experience section') }

    const hasEducation = /(education|university|college|degree|bachelor|master|phd)/i.test(text)
    if (hasEducation) { strengths.push('Includes education section'); passed++ }
    else recommendations.push('Add your education background')

    const hasMetrics = /\d+%|\d+x|\$\d+|[0-9]+ (users|customers|clients|revenue|growth|improvement)/i.test(text)
    if (hasMetrics) { strengths.push('Uses quantifiable achievements'); passed++ }
    else recommendations.push('Add metrics to demonstrate impact (e.g., "increased performance by 30%")')

    const hasActionVerbs = /(developed|designed|implemented|led|managed|created|improved|optimized|built|delivered)/i.test(text)
    if (hasActionVerbs) { strengths.push('Uses strong action verbs'); passed++ }
    else recommendations.push('Start bullet points with strong action verbs')

    const hasEmail = /\S+@\S+\.\S+/.test(text)
    if (hasEmail) { strengths.push('Contact email included'); passed++ }
    else recommendations.push('Include your email address')

    const hasGithub = /github|gitlab|bitbucket/i.test(text)
    if (hasGithub) { strengths.push('Links to code repositories'); passed++ }
    else recommendations.push('Add links to your GitHub or other code repositories')

    const hasLinkedIn = /linkedin/i.test(text)
    if (hasLinkedIn) { strengths.push('LinkedIn profile included'); passed++ }
    else recommendations.push('Add your LinkedIn profile URL')

    return { strengths, weaknesses, recommendations, passed, total }
  }

  private checkFormatting(text: string) {
    const recommendations: string[] = []
    const total = 2

    const words = text.split(/\s+/).length
    if (words > 800) recommendations.push('Resume seems long - consider keeping it to one page for most roles')
    else if (words < 200) recommendations.push('Resume seems sparse - add more details about your experience')

    if (text.length > 0 && words > 0) {
      const hasSections = /^(#|##|EDUCATION|EXPERIENCE|SKILLS|PROJECTS|WORK|SUMMARY)/im.test(text)
      if (!hasSections) recommendations.push('Use clear section headers (Education, Experience, Skills) for better ATS parsing')
    }

    return { recommendations, total }
  }
}

export const resumeService = new ResumeService()
