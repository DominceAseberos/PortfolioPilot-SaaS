import type { ResumeAnalysis, ResumeSkill, ResumeSection } from '@/types'
import { logger } from '@/lib/logger'
import { analyzeResumeWithAI } from '@/features/ai/services/ai.service'
import { portfolioService } from '@/features/reviews/services/portfolio.service'
import { gitHubService } from '@/features/github/services/github.service'

export class ResumeService {
  async analyze(fileBuffer: Buffer, fileName: string): Promise<ResumeAnalysis> {
    try {
      const text = await this.extractText(fileBuffer)

      if (!text || text.trim().length === 0) {
        return {
          score: 0,
          strengths: [],
          weaknesses: ['Could not extract text from the PDF'],
          recommendations: ['Ensure the PDF contains selectable text (not a scanned image)'],
        }
      }

      if (!this.isLikelyResume(text)) {
        throw new Error('NOT_A_RESUME')
      }

      const portfolioMatch = text.match(/https?:\/\/(?!github\.com|linkedin\.com)[^\s]+|www\.[^\s]+/i)
      const githubMatch = text.match(/github\.com\/[A-Za-z0-9-]+/i)

      let scrapedContext = ''
      
      if (portfolioMatch || githubMatch) {
         try {
           const promises = []
           if (portfolioMatch) promises.push(portfolioService.analyze(portfolioMatch[0]).then(res => `Portfolio Analysis (${portfolioMatch[0]}):\nStrengths: ${res.strengths.join(', ')}\nWeaknesses: ${res.weaknesses.join(', ')}`).catch(() => null))
           if (githubMatch) promises.push(gitHubService.analyze(githubMatch[0]).then(res => `GitHub Analysis (${githubMatch[0]}):\nRepos: ${res.details?.repos?.map(r=>r.name).join(', ')}\nStrengths: ${res.strengths.join(', ')}\nWeaknesses: ${res.weaknesses.join(', ')}`).catch(() => null))
           
           const results = await Promise.all(promises)
           scrapedContext = results.filter(Boolean).join('\n\n')
         } catch (e) {
           logger.warn('Failed to scrape context for resume', { error: String(e) })
         }
      }

      const aiResult = await analyzeResumeWithAI(text, scrapedContext)
      const ruleResult = this.ruleBasedAnalyze(text)

      if (aiResult) {
        const merged = {
          score: aiResult.score,
          strengths: aiResult.strengths.length > 0 ? aiResult.strengths : ruleResult.strengths,
          weaknesses: aiResult.weaknesses.length > 0 ? aiResult.weaknesses : ruleResult.weaknesses,
          recommendations:
            aiResult.recommendations.length > 0
              ? aiResult.recommendations
              : ruleResult.recommendations,
          details: {
            name: aiResult.name || ruleResult.details?.name || null,
            email: aiResult.email || ruleResult.details?.email || null,
            linkedin: aiResult.linkedin || ruleResult.details?.linkedin || null,
            github: aiResult.github || ruleResult.details?.github || null,
            workEntries:
              aiResult.workEntries.length > 0
                ? aiResult.workEntries
                : ruleResult.details?.workEntries || [],
            education: aiResult.education.length > 0 ? aiResult.education : [],
            projects: aiResult.projects && aiResult.projects.length > 0 ? aiResult.projects : [],
            skills:
              aiResult.skills.length > 0
                ? aiResult.skills.map((s) => {
                    const name =
                      typeof s === 'string'
                        ? s
                        : (s as { name?: string; skill?: string }).name ||
                          (s as { skill?: string }).skill ||
                          JSON.stringify(s)
                    return {
                      name: name
                        .toLowerCase()
                        .replace(/\s*\(.*?\)\s*/g, '')
                        .trim(),
                      found: true,
                    }
                  })
                : ruleResult.details?.skills || [],
            sections:
              aiResult.sections.length > 0
                ? aiResult.sections.map((s) => ({ name: s, found: true }))
                : ruleResult.details?.sections || [],
            wordCount: text.split(/\s+/).length,
            hasEmail: !!(aiResult.email || ruleResult.details?.email),
            hasLinkedIn: !!(aiResult.linkedin || ruleResult.details?.linkedin),
            hasGithub: !!(aiResult.github || ruleResult.details?.github),
            hasMetrics:
              /\d+%|\d+x|\$\d+|[0-9]+ (users|customers|clients|revenue|growth|improvement)/i.test(
                text
              ),
            hasActionVerbs:
              /(developed|designed|implemented|led|managed|created|improved|optimized|built|delivered)/i.test(
                text
              ),
            rawText: text.slice(0, 3000),
            isAIAnalyzed: true,
          },
        }
        return merged
      }

      return ruleResult
    } catch (error) {
      logger.error('Resume analysis failed', { error: String(error), fileName })
      
      if (error instanceof Error && error.message === 'NOT_A_RESUME') {
        return {
          score: 0,
          strengths: [],
          weaknesses: ['The uploaded document does not appear to be a Resume or CV'],
          recommendations: ['Please upload a valid personal Resume or CV document in PDF format.'],
        }
      }
      
      return {
        score: 0,
        strengths: [],
        weaknesses: ['Could not parse the resume file'],
        recommendations: ['Ensure the file is a valid PDF with selectable text'],
      }
    }
  }

  public validateResumeContent(text: string): { isValid: boolean; reason?: string } {
    const content = text.toLowerCase()
    
    // 0. Word Count Check
    const wordCount = content.split(/\s+/).length
    if (wordCount < 30) {
      return { isValid: false, reason: 'Document contains too little text to be a Resume/CV.' }
    }
    
    // 1. Negative Filters
    const academicKeywords = ['abstract', 'methodology', 'conclusion', 'table of contents', 'literature review', 'hypothesis', 'chapter']
    const invoiceKeywords = ['invoice', 'receipt', 'balance due', 'payment due', 'shipping', 'tax', 'amount due', 'billing', 'subtotal']
    const legalKeywords = ['hereby', 'whereas', 'jurisdiction', 'parties', 'agreement', 'terms and conditions', 'liability', 'warranties']

    const checkNegative = (keywords: string[]) => keywords.filter(kw => new RegExp(`\\b${kw}\\b`).test(content)).length

    if (checkNegative(academicKeywords) >= 2) {
      return { isValid: false, reason: 'Document appears to be an academic paper or report, not a Resume/CV.' }
    }
    if (checkNegative(invoiceKeywords) >= 2) {
      return { isValid: false, reason: 'Document appears to be a receipt, invoice, or financial document, not a Resume/CV.' }
    }
    if (checkNegative(legalKeywords) >= 3) {
      return { isValid: false, reason: 'Document appears to be a legal contract or agreement, not a Resume/CV.' }
    }

    // 2. Positive Scoring System
    let score = 0
    
    // Dates (Resumes almost always have years like 201X, 202X, or Present)
    if (/\b(199\d|200\d|201\d|202\d|present|current)\b/.test(content)) score += 2

    // Contact Info
    const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(content)
    const hasPhone = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(content) || /\+\d{1,3}\s?\d{4,10}/.test(content)
    const hasLinks = /github\.com/i.test(content) || /linkedin\.com/i.test(content) || /portfolio/i.test(content)
    
    if (hasEmail) score += 2
    if (hasPhone) score += 1
    if (hasLinks) score += 1

    // Structural Categories
    if (/\b(experience|employment|work history|career|professional background)\b/.test(content)) score += 2
    if (/\b(education|university|college|degree|bachelor|master|phd|academic)\b/.test(content)) score += 2
    if (/\b(skills|technologies|proficiencies|expertise|tools)\b/.test(content)) score += 2
    if (/\b(resume|cv|curriculum vitae)\b/.test(content)) score += 1

    // Require a minimum score of 5 to pass
    if (score >= 5) {
      return { isValid: true }
    }
    
    return { 
      isValid: false, 
      reason: 'Document lacks standard resume indicators (e.g., Dates, Contact Info, Experience, Education).' 
    }
  }

  private isLikelyResume(text: string): boolean {
    return this.validateResumeContent(text).isValid
  }

  private ruleBasedAnalyze(text: string): ResumeAnalysis {
    const name = this.extractName(text)
    const email = this.extractEmail(text)
    const linkedin = this.extractLinkedIn(text)
    const githubUrl = this.extractGithub(text)
    const workEntries = this.extractWorkEntries(text)
    const skillsList = [
      'javascript',
      'typescript',
      'python',
      'react',
      'node',
      'sql',
      'aws',
      'docker',
      'git',
      'api',
      'agile',
      'leadership',
      'communication',
      'teamwork',
      'problem.solving',
    ]

    const skills: ResumeSkill[] = skillsList.map((s) => ({
      name: s,
      found: new RegExp(s.replace('.', '\\.'), 'i').test(text),
    }))

    const sections: ResumeSection[] = [
      {
        name: 'Work Experience',
        found: /(experience|work|employment|job|role|position)/i.test(text),
      },
      {
        name: 'Education',
        found: /(education|university|college|degree|bachelor|master|phd)/i.test(text),
      },
      { name: 'Skills', found: /skills|technologies|tools|proficiencies/i.test(text) },
      { name: 'Projects', found: /projects|portfolio/i.test(text) },
    ]

    const wordCount = text.split(/\s+/).length
    const hasEmail = !!email
    const hasLinkedIn = !!linkedin
    const hasGithub = !!githubUrl
    const hasMetrics =
      /\d+%|\d+x|\$\d+|[0-9]+ (users|customers|clients|revenue|growth|improvement)/i.test(text)
    const hasActionVerbs =
      /(developed|designed|implemented|led|managed|created|improved|optimized|built|delivered)/i.test(
        text
      )

    const strengths: string[] = []
    const weaknesses: string[] = []
    const recommendations: string[] = []
    let passed = 0
    const total = 8

    const foundSkills = skills.filter((s) => s.found).map((s) => s.name)
    if (foundSkills.length >= 3) {
      strengths.push(`Mentions relevant skills (${foundSkills.slice(0, 5).join(', ')})`)
      passed++
    } else {
      weaknesses.push('Few relevant skills mentioned')
      recommendations.push('Add more technical and soft skills relevant to your target role')
    }

    if (sections.find((s) => s.name === 'Work Experience')?.found) {
      strengths.push('Includes work experience section')
      passed++
    } else {
      weaknesses.push('No work experience section found')
      recommendations.push('Add a work experience section')
    }

    if (sections.find((s) => s.name === 'Education')?.found) {
      strengths.push('Includes education section')
      passed++
    } else recommendations.push('Add your education background')

    if (hasMetrics) {
      strengths.push('Uses quantifiable achievements')
      passed++
    } else
      recommendations.push(
        'Add metrics to demonstrate impact (e.g., "increased performance by 30%")'
      )

    if (hasActionVerbs) {
      strengths.push('Uses strong action verbs')
      passed++
    } else recommendations.push('Start bullet points with strong action verbs')

    if (hasEmail) {
      strengths.push('Contact email included')
      passed++
    } else recommendations.push('Include your email address')

    if (hasGithub) {
      strengths.push('Links to code repositories')
      passed++
    } else recommendations.push('Add links to your GitHub or other code repositories')

    if (hasLinkedIn) {
      strengths.push('LinkedIn profile included')
      passed++
    } else recommendations.push('Add your LinkedIn profile URL')

    if (wordCount > 800)
      recommendations.push('Resume seems long - consider keeping it to one page for most roles')
    else if (wordCount < 200)
      recommendations.push('Resume seems sparse - add more details about your experience')

    const score = Math.round((passed / Math.max(total, 1)) * 100)

    return {
      score,
      strengths,
      weaknesses,
      recommendations,
      details: {
        name,
        email,
        linkedin,
        github: githubUrl,
        skills,
        sections,
        workEntries,
        wordCount,
        hasEmail,
        hasLinkedIn,
        hasGithub,
        hasMetrics,
        hasActionVerbs,
        rawText: text.slice(0, 3000),
        isAIAnalyzed: false,
      },
    }
  }

  private extractName(text: string): string | null {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0) return null
    const firstLine = lines[0]
    if (firstLine.length < 50 && !firstLine.match(/^(http|@|\.)/i)) return firstLine
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i]
      if (
        line.length > 1 &&
        line.length < 50 &&
        !line.match(/^(http|@|\.|\d|email|phone|address)/i)
      ) {
        return line
      }
    }
    return null
  }

  private extractEmail(text: string): string | null {
    const match = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/)
    return match ? match[0] : null
  }

  private extractLinkedIn(text: string): string | null {
    const match = text.match(/linkedin\.com\/in\/[A-Za-z0-9%-]+/i)
    return match ? match[0] : null
  }

  private extractGithub(text: string): string | null {
    const match = text.match(/github\.com\/[A-Za-z0-9-]+/i)
    return match ? match[0] : null
  }

  private extractWorkEntries(text: string): string[] {
    const entries: string[] = []
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    let inExperience = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (/^(experience|work|employment|professional background)/i.test(line)) {
        inExperience = true
        continue
      }
      if (
        inExperience &&
        /^(education|skills|projects|certifications|training|awards)/i.test(line)
      ) {
        inExperience = false
        continue
      }
      if (
        inExperience &&
        line.length > 5 &&
        line.length < 120 &&
        !line.startsWith('•') &&
        !line.startsWith('-') &&
        !line.startsWith('○') &&
        !line.match(/^\d/) &&
        !line.startsWith('http')
      ) {
        entries.push(line)
      }
    }

    return entries.slice(0, 10)
  }

  public async extractText(buffer: Buffer): Promise<string> {
    try {
      const { extractText } = await import('unpdf')
      const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      const result = await extractText(uint8)
      const text = (Array.isArray(result.text) ? result.text.join('\n') : result.text || '').trim()
      if (text && text.length > 50) return text
      throw new Error('unpdf returned too little text')
    } catch (err) {
      logger.warn('unpdf failed, trying pdf-parse fallback', { error: String(err) })
      try {
        await import('pdf-parse/worker')
        const { PDFParse } = await import('pdf-parse')
        const parser = new PDFParse({ data: buffer })
        const result = await parser.getText()
        await parser.destroy()
        const text = result.text?.trim()
        if (text && text.length > 50) return text
      } catch (innerErr) {
        logger.warn('pdf-parse fallback also failed', { error: String(innerErr) })
      }
      const raw = buffer.toString('utf-8').replace(/[^\w\s\.\,\(\)\-\:\/\@\#\+\n]/g, ' ')
      const cleaned = raw
        .replace(/%\w{2}/g, '')
        .replace(/[^ -~]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (cleaned.length > 100 && !cleaned.includes('%PDF-')) return cleaned
      throw new Error('Failed to extract text from PDF')
    }
  }
}

export const resumeService = new ResumeService()
