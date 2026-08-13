import { extractText } from 'unpdf'
import type { ImprovedResumeData } from '@/types/resume'
import {
  analyzeResumePreflight,
  getResumeEntryBlocks,
  type ResumePreflightResult,
  type ResumeTemplateId,
} from './resume-layout.service'
import type { ResumeTemplateContract } from '@/types/resume-template-contract'
import { analyzeUploadedTemplatePreflight } from './resume-template-layout-plan.service'
import { verifyResumeTemplateFidelity, type ResumeTemplateFidelityResult } from './resume-template-fidelity.service'

export interface ResumeRenderMissingContent {
  label: string
  value: string
}

export interface ResumeRenderVerificationResult {
  status: 'verified' | 'failed'
  actualPages: number
  estimatedPages: number
  pageDelta: number
  contentCoverage: number
  checkedContentCount: number
  missingContent: ResumeRenderMissingContent[]
  warnings: string[]
  preflight: ResumePreflightResult
  templateFidelity?: ResumeTemplateFidelityResult
}

interface ExpectedFragment {
  label: string
  value: string
}

function normalizeComparableText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/-\s+/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function addFragment(fragments: ExpectedFragment[], label: string, value?: string | null) {
  const normalized = value?.trim()
  if (!normalized) return
  fragments.push({ label, value: normalized })
}

/**
 * Collects only text that active resume templates are expected to render.
 * Links themselves are intentionally excluded because entry links render their
 * visible title while the URL remains an annotation target in the PDF.
 */
export function collectExpectedRenderedResumeContent(data: ImprovedResumeData): ExpectedFragment[] {
  const fragments: ExpectedFragment[] = []

  addFragment(fragments, 'name', data.name || 'Your Name')
  addFragment(fragments, 'email', data.email)
  addFragment(fragments, 'phone', data.phone)
  addFragment(fragments, 'location', data.location)
  addFragment(fragments, 'linkedin', data.linkedin?.replace(/^https?:\/\//, ''))
  addFragment(fragments, 'github', data.github?.replace(/^https?:\/\//, ''))
  addFragment(fragments, 'website', data.website?.replace(/^https?:\/\//, ''))

  if ((data.sections?.length ?? 0) > 0) {
    data.sections.forEach((section, sectionIndex) => {
      const sectionLabel = `section:${section.title || sectionIndex + 1}`
      addFragment(fragments, `${sectionLabel}:title`, section.title)

      if (section.type === 'text') {
        addFragment(fragments, `${sectionLabel}:text`, section.text)
      }

      if (section.type === 'list') {
        ;(section.items ?? []).forEach((item, itemIndex) => {
          addFragment(fragments, `${sectionLabel}:item:${itemIndex + 1}`, item)
        })
      }

      if (section.type === 'entries') {
        ;(section.entries ?? []).forEach((entry, entryIndex) => {
          const entryLabel = `${sectionLabel}:entry:${entryIndex + 1}`
          addFragment(fragments, `${entryLabel}:title`, entry.title || 'Title')
          if (entry.subtitle && entry.subtitle.toLocaleLowerCase() !== entry.title?.toLocaleLowerCase()) {
            addFragment(fragments, `${entryLabel}:subtitle`, entry.subtitle)
          }
          addFragment(fragments, `${entryLabel}:dates`, entry.dates)
          getResumeEntryBlocks(entry).forEach((block, blockIndex) => {
            addFragment(fragments, `${entryLabel}:${block.type}:${blockIndex + 1}`, block.text)
          })
        })
      }
    })

    return fragments
  }

  // Legacy fallback content remains supported by the PDF renderer.
  addFragment(fragments, 'legacy:summary-title', data.summary ? 'Professional Summary' : '')
  addFragment(fragments, 'legacy:summary', data.summary)

  if ((data.skills?.length ?? 0) > 0) addFragment(fragments, 'legacy:skills-title', 'Skills')
  ;(data.skills ?? []).forEach((skill, index) => addFragment(fragments, `legacy:skill:${index + 1}`, skill))

  if ((data.workEntries?.length ?? 0) > 0) addFragment(fragments, 'legacy:experience-title', 'Experience')
  ;(data.workEntries ?? []).forEach((entry, index) => {
    addFragment(fragments, `legacy:work:${index + 1}:role`, entry.role || 'Role Title')
    if (entry.company && entry.company.toLocaleLowerCase() !== entry.role?.toLocaleLowerCase()) {
      addFragment(fragments, `legacy:work:${index + 1}:company`, entry.company)
    }
    addFragment(fragments, `legacy:work:${index + 1}:dates`, entry.dates)
    getResumeEntryBlocks(entry).forEach((block, blockIndex) => {
      addFragment(fragments, `legacy:work:${index + 1}:${block.type}:${blockIndex + 1}`, block.text)
    })
  })

  if ((data.projects?.length ?? 0) > 0) addFragment(fragments, 'legacy:projects-title', 'Projects')
  ;(data.projects ?? []).forEach((project, index) => {
    addFragment(fragments, `legacy:project:${index + 1}:name`, project.name)
    addFragment(fragments, `legacy:project:${index + 1}:description`, project.description)
  })

  if ((data.education?.length ?? 0) > 0) addFragment(fragments, 'legacy:education-title', 'Education')
  ;(data.education ?? []).forEach((education, index) => {
    addFragment(fragments, `legacy:education:${index + 1}:degree`, education.degree)
    addFragment(fragments, `legacy:education:${index + 1}:school`, education.school)
    addFragment(fragments, `legacy:education:${index + 1}:dates`, education.dates)
  })

  return fragments
}

export async function verifyRenderedResumePdf(
  pdfBytes: Uint8Array,
  data: ImprovedResumeData,
  templateId: ResumeTemplateId
): Promise<ResumeRenderVerificationResult> {
  const preflight = analyzeResumePreflight(data, templateId)
  const parsed = await extractText(pdfBytes, { mergePages: false })
  const pages = Array.isArray(parsed.text) ? parsed.text : [parsed.text]
  const renderedText = normalizeComparableText(pages.join('\n'))
  const expected = collectExpectedRenderedResumeContent(data)

  const missingContent = expected.filter((fragment) => {
    const comparable = normalizeComparableText(fragment.value)
    return comparable.length > 0 && !renderedText.includes(comparable)
  })

  const checkedContentCount = expected.length
  const matchedCount = Math.max(0, checkedContentCount - missingContent.length)
  const contentCoverage = checkedContentCount === 0 ? 1 : matchedCount / checkedContentCount
  const actualPages = Math.max(1, parsed.totalPages || pages.length || 1)
  const pageDelta = actualPages - preflight.estimatedPages
  const warnings: string[] = []

  if (pageDelta > 0) {
    warnings.push(`Rendered PDF uses ${actualPages} pages; preflight estimated ${preflight.estimatedPages}.`)
  } else if (pageDelta < 0) {
    warnings.push(`Rendered PDF uses ${actualPages} pages; preflight estimate was conservative at ${preflight.estimatedPages}.`)
  }

  if (missingContent.length > 0) {
    warnings.push(`${missingContent.length} expected resume field${missingContent.length === 1 ? '' : 's'} could not be found in the rendered PDF.`)
  }

  return {
    status: missingContent.length === 0 ? 'verified' : 'failed',
    actualPages,
    estimatedPages: preflight.estimatedPages,
    pageDelta,
    contentCoverage,
    checkedContentCount,
    missingContent,
    warnings,
    preflight,
  }
}


export async function verifyUploadedRenderedResumePdf(
  pdfBytes: Uint8Array,
  data: ImprovedResumeData,
  contract: ResumeTemplateContract
): Promise<ResumeRenderVerificationResult> {
  const base = await verifyRenderedResumePdf(pdfBytes, data, 'classic')
  const preflight = analyzeUploadedTemplatePreflight(data, contract)
  const templateFidelity = await verifyResumeTemplateFidelity(pdfBytes, data, contract)
  const pageDelta = base.actualPages - preflight.estimatedPages
  const warnings = base.warnings.filter((warning) => !warning.startsWith('Rendered PDF uses '))

  if (pageDelta > 0) {
    warnings.push(`Rendered uploaded layout uses ${base.actualPages} pages; region preflight estimated ${preflight.estimatedPages}.`)
  } else if (pageDelta < 0) {
    warnings.push(`Rendered uploaded layout uses ${base.actualPages} pages; region preflight was conservative at ${preflight.estimatedPages}.`)
  }
  warnings.push(...templateFidelity.warnings)

  return {
    ...base,
    status: base.status === 'verified' && templateFidelity.status === 'verified' ? 'verified' : 'failed',
    estimatedPages: preflight.estimatedPages,
    pageDelta,
    warnings,
    preflight,
    templateFidelity,
  }
}
