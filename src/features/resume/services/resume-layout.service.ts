import type { ImprovedResumeData } from '@/types/resume'

export type ResumeTemplateId = 'classic' | 'modern' | 'compact'
export type ResumeFit = 'comfortable' | 'tight' | 'overflow-risk'

export interface ResumeLayoutProfile {
  id: ResumeTemplateId
  preferredPages: number
  minimumFontSize: number
  preferredSummaryWords: number
  preferredBulletWords: number
  preferredBulletsPerEntry: number
  preferredSkillCount: number
  comfortableDensity: number
  overflowDensity: number
  sidebarSkillLimit?: number
}

export interface ResumePreflightWarning {
  code:
    | 'summary-long'
    | 'bullet-long'
    | 'skills-dense'
    | 'sidebar-dense'
    | 'empty-section'
    | 'empty-entry'
    | 'duplicate-skill'
    | 'duplicate-entry'
    | 'invalid-link'
  severity: 'info' | 'warning'
  message: string
  section?: string
}

export interface ResumePreflightResult {
  score: number
  density: number
  fit: ResumeFit
  estimatedPages: number
  warnings: ResumePreflightWarning[]
  recommendations: string[]
}

export interface DescriptionBlock {
  type: 'paragraph' | 'bullet'
  text: string
}

export const RESUME_LAYOUT_PROFILES: Record<ResumeTemplateId, ResumeLayoutProfile> = {
  classic: {
    id: 'classic',
    preferredPages: 1,
    minimumFontSize: 9.5,
    preferredSummaryWords: 60,
    preferredBulletWords: 24,
    preferredBulletsPerEntry: 3,
    preferredSkillCount: 20,
    comfortableDensity: 88,
    overflowDensity: 112,
  },
  modern: {
    id: 'modern',
    preferredPages: 1,
    minimumFontSize: 9,
    preferredSummaryWords: 52,
    preferredBulletWords: 22,
    preferredBulletsPerEntry: 3,
    preferredSkillCount: 18,
    comfortableDensity: 84,
    overflowDensity: 105,
    sidebarSkillLimit: 22,
  },
  compact: {
    id: 'compact',
    preferredPages: 1,
    minimumFontSize: 9,
    preferredSummaryWords: 50,
    preferredBulletWords: 22,
    preferredBulletsPerEntry: 3,
    preferredSkillCount: 24,
    comfortableDensity: 96,
    overflowDensity: 125,
    sidebarSkillLimit: 28,
  },
}

const BULLET_PREFIX = /^(?:[•●▪◦‣⁃*-]|[–—])\s+/
const NUMBERED_PREFIX = /^\d{1,2}[.)]\s+/

export function parseDescriptionBlocks(text?: string): DescriptionBlock[] {
  if (!text?.trim()) return []

  const normalized = text
    .replace(/\r\n?/g, '\n')
    .replace(/([.!?])\s+[•●▪◦‣⁃]\s*/g, '$1\n• ')

  return normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (BULLET_PREFIX.test(line) || NUMBERED_PREFIX.test(line)) {
        return {
          type: 'bullet' as const,
          text: line.replace(BULLET_PREFIX, '').replace(NUMBERED_PREFIX, '').trim(),
        }
      }
      return { type: 'paragraph' as const, text: line }
    })
    .filter((block) => block.text.length > 0)
}

function countWords(value?: string | null): number {
  if (!value?.trim()) return 0
  return value.trim().split(/\s+/).filter(Boolean).length
}

function normalizeForDuplicate(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isLikelyValidLink(value?: string): boolean {
  if (!value) return true
  if (/^https?:\/\//i.test(value)) {
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }
  return !value.includes('://')
}

export function analyzeResumePreflight(
  data: ImprovedResumeData,
  templateId: ResumeTemplateId
): ResumePreflightResult {
  const profile = RESUME_LAYOUT_PROFILES[templateId]
  const warnings: ResumePreflightWarning[] = []
  const recommendations = new Set<string>()

  let densityUnits = 12 // identity/header baseline
  let skillCount = 0
  let summaryWords = 0
  const seenSkills = new Set<string>()
  const seenEntries = new Set<string>()

  const links = [data.linkedin, data.github, data.website].filter(Boolean)
  for (const link of links) {
    if (!isLikelyValidLink(link)) {
      warnings.push({
        code: 'invalid-link',
        severity: 'warning',
        message: `Link appears malformed: ${link}`,
      })
    }
  }

  const sections = data.sections ?? []

  for (const section of sections) {
    const title = section.title?.trim() || 'Untitled section'
    densityUnits += 4

    if (section.type === 'text') {
      const words = countWords(section.text)
      summaryWords = Math.max(summaryWords, words)
      densityUnits += words / 6
      if (words > profile.preferredSummaryWords) {
        warnings.push({
          code: 'summary-long',
          severity: 'warning',
          section: title,
          message: `${title} is ${words} words; ${profile.preferredSummaryWords} or fewer is preferred for ${templateId}.`,
        })
        recommendations.add(`Shorten ${title} while preserving verified facts.`)
      }
      if (!section.text?.trim()) {
        warnings.push({
          code: 'empty-section',
          severity: 'info',
          section: title,
          message: `${title} is empty and can be removed before export.`,
        })
      }
    }

    if (section.type === 'list') {
      const items = (section.items ?? []).filter((item) => item.trim())
      skillCount += items.length
      densityUnits += items.length * 1.15

      for (const item of items) {
        const key = normalizeForDuplicate(item)
        if (key && seenSkills.has(key)) {
          warnings.push({
            code: 'duplicate-skill',
            severity: 'info',
            section: title,
            message: `Duplicate item detected in ${title}: ${item}`,
          })
        }
        if (key) seenSkills.add(key)
      }

      if (items.length === 0) {
        warnings.push({
          code: 'empty-section',
          severity: 'info',
          section: title,
          message: `${title} has no items and can be removed before export.`,
        })
      }
    }

    if (section.type === 'entries') {
      const entries = section.entries ?? []
      if (entries.length === 0) {
        warnings.push({
          code: 'empty-section',
          severity: 'info',
          section: title,
          message: `${title} has no entries and can be removed before export.`,
        })
      }

      for (const entry of entries) {
        const entryTitle = entry.title?.trim() || ''
        const entryKey = normalizeForDuplicate(`${title} ${entryTitle} ${entry.subtitle ?? ''}`)
        if (entryKey && seenEntries.has(entryKey)) {
          warnings.push({
            code: 'duplicate-entry',
            severity: 'info',
            section: title,
            message: `Possible duplicate entry detected: ${entryTitle || 'Untitled entry'}`,
          })
        }
        if (entryKey) seenEntries.add(entryKey)

        if (!entryTitle) {
          warnings.push({
            code: 'empty-entry',
            severity: 'warning',
            section: title,
            message: `${title} contains an entry without a title.`,
          })
        }

        if (!isLikelyValidLink(entry.link)) {
          warnings.push({
            code: 'invalid-link',
            severity: 'warning',
            section: title,
            message: `Entry link appears malformed: ${entry.link}`,
          })
        }

        densityUnits += 5
        const blocks = parseDescriptionBlocks(entry.description)
        for (const block of blocks) {
          const words = countWords(block.text)
          densityUnits += Math.max(1.2, words / 7)
          if (block.type === 'bullet' && words > profile.preferredBulletWords) {
            warnings.push({
              code: 'bullet-long',
              severity: 'info',
              section: title,
              message: `${entryTitle || title} contains a ${words}-word bullet; shorter bullets paginate and scan better.`,
            })
            recommendations.add('Shorten unusually long bullets without removing factual evidence.')
          }
        }
      }
    }
  }

  if (skillCount > profile.preferredSkillCount) {
    warnings.push({
      code: 'skills-dense',
      severity: 'warning',
      message: `${skillCount} list items may make ${templateId} visually dense; preferred is about ${profile.preferredSkillCount}.`,
    })
    recommendations.add('Deduplicate or prioritize the most relevant skills for the target role.')
  }

  if (profile.sidebarSkillLimit && skillCount > profile.sidebarSkillLimit) {
    warnings.push({
      code: 'sidebar-dense',
      severity: 'warning',
      message: `${templateId} sidebar may be crowded with ${skillCount} list items.`,
    })
    recommendations.add('Use Compact/Classic or move lower-priority skills out of the sidebar.')
  }

  // Density is intentionally heuristic and deterministic. It is used to warn/recommend,
  // not to delete or silently rewrite content.
  const density = Math.max(0, Math.round(densityUnits))
  const fit: ResumeFit =
    density <= profile.comfortableDensity
      ? 'comfortable'
      : density <= profile.overflowDensity
        ? 'tight'
        : 'overflow-risk'

  const estimatedPages = Math.max(1, Math.ceil(density / profile.overflowDensity))

  if (fit === 'overflow-risk') {
    recommendations.add('Allow an additional page or optimize content before reducing font size below safe limits.')
  } else if (fit === 'tight') {
    recommendations.add('Use balanced spacing and review long sections before export.')
  }

  const warningPenalty = warnings.reduce((total, warning) => {
    return total + (warning.severity === 'warning' ? 5 : 2)
  }, 0)
  const densityPenalty = fit === 'overflow-risk' ? 15 : fit === 'tight' ? 6 : 0
  const score = Math.max(0, Math.min(100, 100 - warningPenalty - densityPenalty))

  return {
    score,
    density,
    fit,
    estimatedPages,
    warnings,
    recommendations: Array.from(recommendations),
  }
}
