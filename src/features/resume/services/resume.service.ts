import type { ResumeAnalysis, ResumeSkill, ResumeSection } from '@/types'
import type { ResumeTemplateContract } from '@/types/resume-template-contract'
import { logger } from '@/lib/logger'
import { analyzeResumeWithAI } from '@/features/ai/services/ai.service'
import { resumeLinkExtractionService } from './resume-link-extraction.service'
import { createResumePdfExtractionError, getResumePdfExtractionErrorCode, inspectPdfWithoutReadableText, isPdfBuffer } from './resume-scanned-pdf.service'

export class ResumeService {
  async analyze(fileBuffer: Buffer, fileName: string): Promise<ResumeAnalysis> {
    try {
      const extracted = await this.extractDocumentText(fileBuffer)
      const text = extracted.plainText
      const aiInput = extracted.structuredText || text

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

      const detectedLinks = resumeLinkExtractionService.extract(text)
      const detectedGithub = detectedLinks.github[0]?.normalized ?? null
      const detectedLinkedIn = detectedLinks.linkedin[0]?.normalized ?? null

      const aiResult = await analyzeResumeWithAI(aiInput)
      const ruleResult = this.ruleBasedAnalyze(text)
      if (ruleResult.details && extracted.templateContract) {
        ruleResult.details.templateContract = extracted.templateContract
      }

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
            phone: aiResult.phone || ruleResult.details?.phone || null,
            location: aiResult.location || ruleResult.details?.location || null,
            linkedin: aiResult.linkedin || detectedLinkedIn || ruleResult.details?.linkedin || null,
            github: aiResult.github || detectedGithub || ruleResult.details?.github || null,
            workEntries: aiResult.sections
              .filter(s => s.type === 'entries' && (
                s.semanticType === 'experience' ||
                (s.semanticType === 'unknown' && /(experience|employment|work history|professional background)/i.test(s.title))
              ))
              .flatMap(s => s.entries || [])
              .map(e => ({
                company: e.subtitle || '',
                role: e.title || '',
                dates: e.dates || '',
                description: e.description || ''
              })),
            education: aiResult.sections
              .filter(s => s.type === 'entries' && (
                s.semanticType === 'education' ||
                (s.semanticType === 'unknown' && /(education|university|college|degree|academic)/i.test(s.title))
              ))
              .flatMap(s => s.entries || [])
              .map(e => ({
                degree: e.title || '',
                school: e.subtitle || '',
                dates: e.dates || ''
              })),
            projects: aiResult.sections
              .filter(s => s.type === 'entries' && (
                s.semanticType === 'projects' ||
                (s.semanticType === 'unknown' && /(project|portfolio|case stud|work sample)/i.test(s.title))
              ))
              .flatMap(s => s.entries || [])
              .map(e => ({
                name: e.title || '',
                link: e.link || '',
                description: e.description || ''
              })),
            skills: aiResult.sections
              .filter(s => s.type === 'list' && (
                s.semanticType === 'skills' ||
                (s.semanticType === 'unknown' && /(skill|competenc|expertise|proficien|tool|abilit|knowledge)/i.test(s.title))
              ))
              .flatMap(s => s.items || [])
              .map(s => ({ name: s, found: true })),
            sections: aiResult.sections.length > 0 ? aiResult.sections : ruleResult.details?.sections || [],
            wordCount: text.split(/\s+/).length,
            hasEmail: !!(aiResult.email || ruleResult.details?.email),
            hasLinkedIn: !!(aiResult.linkedin || detectedLinkedIn || ruleResult.details?.linkedin),
            hasGithub: !!(aiResult.github || detectedGithub || ruleResult.details?.github),
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
            templateContract: extracted.templateContract,
          },
        }
        return merged
      }

      return ruleResult
    } catch (error) {
      logger.error('Resume analysis failed', { error: String(error), fileName })

      if (getResumePdfExtractionErrorCode(error)) throw error
      if (error instanceof Error && error.message === 'NOT_A_RESUME') throw error

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
    if (/\b(skills?|competencies|expertise|proficiencies|tools?|abilities|knowledge)\b/.test(content)) score += 2
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
    const phone = this.extractPhone(text)
    const location = this.extractLocation(text)
    const detectedLinks = resumeLinkExtractionService.extract(text)
    const linkedin = detectedLinks.linkedin[0]?.normalized ?? null
    const githubUrl = detectedLinks.github[0]?.normalized ?? null
    const hasPortfolio = detectedLinks.portfolioCandidates.length > 0
    const workEntries = this.extractWorkEntries(text)
    const skills: ResumeSkill[] = this.extractGenericSkills(text).map((name) => ({
      name,
      found: true,
    }))

    const sections: ResumeSection[] = [
      {
        name: 'Work Experience',
        found: /(experience|employment|work history|professional practice|clinical practice|teaching experience|career|role|position)/i.test(text),
      },
      {
        name: 'Education',
        found: /(education|university|college|degree|bachelor|master|phd)/i.test(text),
      },
      { name: 'Skills', found: /skills?|competenc|expertise|proficien|tools?|abilities|knowledge/i.test(text) },
      { name: 'Projects', found: /projects|portfolio/i.test(text) },
    ]

    const wordCount = text.split(/\s+/).length
    const hasEmail = !!email
    const hasPhone = !!phone
    const hasLinkedIn = !!linkedin
    const hasGithub = !!githubUrl
    const hasMetrics =
      /\d+%|\d+x|\$\d+|\b[0-9]+\s+(users|customers|clients|patients|students|cases|projects|records|orders|appointments|accounts|transactions|events|campaigns|classes|units|team members|revenue|growth|improvement)\b/i.test(text)
    const hasActionVerbs =
      /(developed|designed|implemented|led|managed|created|improved|optimized|built|delivered|administered|coordinated|assessed|treated|supported|taught|facilitated|prepared|maintained|operated|reconciled|served|assisted|monitored|organized|trained|analyzed|resolved)/i.test(
        text
      )

    const strengths: string[] = []
    const weaknesses: string[] = []
    const recommendations: string[] = []
    let passed = 0
    const total = 7

    const foundSkills = skills.filter((s) => s.found).map((s) => s.name)
    if (foundSkills.length >= 3) {
      strengths.push(`Mentions relevant skills (${foundSkills.slice(0, 5).join(', ')})`)
      passed++
    } else {
      weaknesses.push('Few role-relevant skills or competencies detected')
      recommendations.push('Add more skills, competencies, tools, methods, or domain knowledge relevant to your target role')
    }

    if (sections.find((s) => s.name === 'Work Experience')?.found) {
      strengths.push('Includes work experience section')
      passed++
    } else {
      weaknesses.push('No experience or professional-practice section found')
      recommendations.push('Add relevant experience, practicum, volunteer work, training, or other role-related practice when available')
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
        'Add measurable outcomes where appropriate (for example volume handled, time saved, quality, growth, accuracy, or service results)'
      )

    if (hasActionVerbs) {
      strengths.push('Uses strong action verbs')
      passed++
    } else recommendations.push('Start bullet points with strong action verbs')

    if (hasEmail) {
      strengths.push('Contact email included')
      passed++
    } else recommendations.push('Include your email address')

    if (hasPhone) {
      strengths.push('Contact phone included')
      passed++
    } else recommendations.push('Include a phone number when appropriate for applications in your region')

    if (hasLinkedIn) strengths.push('LinkedIn profile included')
    if (hasGithub) strengths.push('GitHub profile included')
    if (hasPortfolio) strengths.push('Professional portfolio or work-sample link included')

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
        phone,
        location,
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

  public extractGenericSkills(text: string): string[] {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const skillHeadingPattern = /^(.{0,45}?(?:skills?|competencies|expertise|proficiencies|tools?|abilities|knowledge))\s*:?[ \t]*(.*)$/i
    const stopHeadingPattern = /^(experience|employment|work history|education|projects?|certifications?|licenses?|awards?|languages?|volunteer|publications?|training|references?|summary|profile|objective)\b/i
    const results: string[] = []
    const seen = new Set<string>()
    let collecting = false

    const addItems = (raw: string) => {
      const cleaned = raw.replace(/^[•●▪◦‣⁃*\-–—]\s*/, '').trim()
      if (!cleaned) return

      const colonIndex = cleaned.indexOf(':')
      const value = colonIndex > 0 && colonIndex < 30 ? cleaned.slice(colonIndex + 1).trim() : cleaned
      const parts = value.split(/[,;|•]/).map((item) => item.trim()).filter(Boolean)

      for (const item of parts.length > 0 ? parts : [value]) {
        if (item.length < 2 || item.length > 80) continue
        if (/https?:\/\/|@/.test(item)) continue
        if (/[.!?]$/.test(item) && item.split(/\s+/).length > 10) continue
        const key = item.toLowerCase().replace(/\s+/g, ' ')
        if (seen.has(key)) continue
        seen.add(key)
        results.push(item)
      }
    }

    for (const line of lines) {
      const headingMatch = line.match(skillHeadingPattern)
      if (headingMatch && headingMatch[1].split(/\s+/).length <= 6) {
        collecting = true
        if (headingMatch[2]) addItems(headingMatch[2])
        continue
      }

      if (collecting && stopHeadingPattern.test(line)) {
        collecting = false
        continue
      }

      if (collecting) addItems(line)
    }

    return results.slice(0, 60)
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

  private extractPhone(text: string): string | null {
    const labeled = text.match(/(?:^|\n)\s*(?:phone|mobile|contact(?:\s*(?:no\.?|number))?|tel(?:ephone)?)\s*[:\-]?\s*(\+?\d[\d\s().\-]{5,}\d)/im)
    const candidates = [
      labeled?.[1],
      ...Array.from(text.matchAll(/(?:\+\d{1,3}[\s.\-]?)?(?:\(?\d{2,4}\)?[\s.\-]?){2,4}\d{2,4}/g), (match) => match[0]),
    ].filter((value): value is string => typeof value === 'string')

    for (const candidate of candidates) {
      const value = candidate.trim().replace(/[\s.\-]+$/, '')
      const digits = value.replace(/\D/g, '')
      if (digits.length < 7 || digits.length > 15) continue
      if (/^(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)\d{2}$/.test(value)) continue
      if (/^(?:19|20)\d{6}$/.test(digits)) continue
      return value
    }
    return null
  }

  private extractLocation(text: string): string | null {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
    const linePattern = /^(?:location|address|residence|based\s+(?:in|at)|city)\s*[:\-]\s*(.+)$/i

    const clean = (raw?: string): string | null => {
      if (!raw) return null
      const value = raw.trim().replace(/\s+/g, ' ')
      if (value.length < 2 || value.length > 100) return null
      if (/https?:\/\/|@/.test(value)) return null
      if (/^(?:phone|mobile|email|linkedin|github)\b/i.test(value)) return null
      return value
    }

    for (const line of lines) {
      const value = clean(line.match(linePattern)?.[1])
      if (value) return value
    }

    const inline = text.match(/(?:^|\s)(?:location|address|residence|based\s+(?:in|at)|city)\s*[:\-]\s*(.{2,100}?)(?=\s+(?:https?:\/\/|www\.|github\.com|linkedin\.com|email\b|phone\b|mobile\b)|$)/i)
    return clean(inline?.[1])
  }

  private extractLinkedIn(text: string): string | null {
    return resumeLinkExtractionService.extract(text).linkedin[0]?.normalized ?? null
  }

  private extractGithub(text: string): string | null {
    return resumeLinkExtractionService.extract(text).github[0]?.normalized ?? null
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

  public async extractDocumentText(buffer: Buffer): Promise<{ plainText: string; structuredText: string; usedLayoutExtraction: boolean; templateContract?: ResumeTemplateContract }> {
    try {
      const { extractResumeLayout } = await import('./resume-layout-extraction.service')
      const layout = await extractResumeLayout(buffer)
      if (layout.plainText.length > 50) {
        return {
          plainText: layout.plainText,
          structuredText: layout.structuredText,
          usedLayoutExtraction: true,
          templateContract: layout.templateContract,
        }
      }
      throw new Error('layout extraction returned too little text')
    } catch (layoutError) {
      logger.warn('Layout-aware PDF extraction failed, using text fallback', { error: String(layoutError) })
    }

    try {
      const { extractText } = await import('unpdf')
      const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      const result = await extractText(uint8)
      const text = (Array.isArray(result.text) ? result.text.join('\n') : result.text || '').trim()
      if (text && text.length > 50) return { plainText: text, structuredText: text, usedLayoutExtraction: false }
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
        if (text && text.length > 50) return { plainText: text, structuredText: text, usedLayoutExtraction: false }
      } catch (innerErr) {
        logger.warn('pdf-parse fallback also failed', { error: String(innerErr) })
      }
      const raw = buffer.toString('utf-8').replace(/[^\w\s\.\,\(\)\-\:\/\@\#\+\n]/g, ' ')
      const cleaned = raw
        .replace(/%\w{2}/g, '')
        .replace(/[^ -~]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (cleaned.length > 100 && !cleaned.includes('%PDF-')) {
        return { plainText: cleaned, structuredText: cleaned, usedLayoutExtraction: false }
      }
      if (isPdfBuffer(buffer)) {
        const inspection = await inspectPdfWithoutReadableText(buffer)
        throw createResumePdfExtractionError(inspection)
      }
      throw new Error('Failed to extract text from PDF')
    }
  }

  public async extractText(buffer: Buffer): Promise<string> {
    return (await this.extractDocumentText(buffer)).plainText
  }
}

export const resumeService = new ResumeService()
