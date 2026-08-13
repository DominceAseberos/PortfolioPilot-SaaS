import type { DynamicSection, ImprovedResumeData } from '@/types/resume'
import type { ResumeTemplateContract, ResumeTemplateRegionContract } from '@/types/resume-template-contract'
import { getResumeEntryBlocks } from './resume-layout.service'
import { getSectionSemanticType } from './resume-template-allocation.service'
import { getTemplateRegionForSemanticType } from './resume-template-contract.service'

export type ResumeRegionFit = 'comfortable' | 'tight' | 'overflow-risk'

export interface ResumeTemplateRegionPlan {
  region: ResumeTemplateRegionContract
  sections: DynamicSection[]
  estimatedLines: number
  capacityLines: number
  fit: ResumeRegionFit
  requiredPages: number
}

export interface ResumeTemplateOverflowMove {
  sectionTitle: string
  semanticType: string
  fromRegionId: string
  toRegionId: string
  reason: 'region-capacity'
}

export interface ResumeTemplateLayoutPlan {
  contract: ResumeTemplateContract
  regions: ResumeTemplateRegionPlan[]
  overflowMoves: ResumeTemplateOverflowMove[]
  warnings: string[]
  fit: ResumeRegionFit
  estimatedPages: number
}

function countWords(value?: string | null): number {
  return value?.trim() ? value.trim().split(/\s+/).filter(Boolean).length : 0
}

function wordsPerLine(region: ResumeTemplateRegionContract): number {
  return Math.max(4, Math.round(15 * Math.max(0.2, region.widthRatio)))
}

function textLines(value: string | undefined, region: ResumeTemplateRegionContract): number {
  const words = countWords(value)
  return words > 0 ? Math.max(1, Math.ceil(words / wordsPerLine(region))) : 0
}

export function estimateResumeSectionLines(
  section: DynamicSection,
  region: ResumeTemplateRegionContract
): number {
  let lines = 2 // heading + spacing/divider

  if (section.type === 'text') {
    return lines + textLines(section.text, region)
  }

  if (section.type === 'list') {
    const items = (section.items ?? []).filter((item) => item.trim())
    if (!items.length) return lines
    const itemUnits = items.reduce((sum, item) => {
      const words = Math.max(1, countWords(item))
      return sum + Math.max(0.55, words / Math.max(2, wordsPerLine(region) * 0.7))
    }, 0)
    return lines + Math.max(1, Math.ceil(itemUnits))
  }

  for (const entry of section.entries ?? []) {
    lines += 1 // title/dates row
    if (entry.subtitle?.trim() && entry.subtitle.toLowerCase() !== entry.title?.toLowerCase()) lines += 1
    const blocks = getResumeEntryBlocks(entry)
    for (const block of blocks) {
      lines += Math.max(1, Math.ceil(countWords(block.text) / wordsPerLine(region)))
    }
    lines += 1 // entry spacing
  }

  return lines
}

function estimateIdentityLines(data: ImprovedResumeData, region: ResumeTemplateRegionContract): number {
  const contacts = [data.email, data.phone, data.location, data.linkedin, data.github, data.website].filter((value) => value?.trim())
  const base = data.name?.trim() ? 2 : 1
  if (!contacts.length) return base
  if (region.widthRatio >= 0.8) {
    const totalWords = contacts.reduce((sum, value) => sum + countWords(value), 0)
    return base + Math.max(1, Math.ceil(totalWords / wordsPerLine(region)))
  }
  return base + contacts.length
}

function fitFor(estimatedLines: number, capacityLines: number): ResumeRegionFit {
  if (capacityLines <= 0 || estimatedLines > capacityLines) return 'overflow-risk'
  if (estimatedLines > capacityLines * 0.82) return 'tight'
  return 'comfortable'
}

function fitRank(fit: ResumeRegionFit): number {
  return fit === 'comfortable' ? 0 : fit === 'tight' ? 1 : 2
}

function orderedSections(data: ImprovedResumeData, contract: ResumeTemplateContract): DynamicSection[] {
  const sections = [...(data.sections ?? [])]
  if (sections.some((section) => typeof section.manualOrder === 'number')) {
    return sections
      .map((section, index) => ({ section, index }))
      .sort((a, b) => (a.section.manualOrder ?? Number.MAX_SAFE_INTEGER) - (b.section.manualOrder ?? Number.MAX_SAFE_INTEGER) || a.index - b.index)
      .map(({ section }) => section)
  }

  return sections
    .map((section, index) => ({
      section,
      index,
      priority: contract.sectionOrder.indexOf(getSectionSemanticType(section)),
    }))
    .sort((a, b) => {
      const left = a.priority < 0 ? contract.sectionOrder.length : a.priority
      const right = b.priority < 0 ? contract.sectionOrder.length : b.priority
      return left - right || a.index - b.index
    })
    .map(({ section }) => section)
}

function getContentRegion(contract: ResumeTemplateContract, section: DynamicSection): ResumeTemplateRegionContract {
  const semanticType = getSectionSemanticType(section)
  const region = getTemplateRegionForSemanticType(contract, semanticType)
  if (region.role !== 'header') return region
  return contract.regions.find((candidate) => candidate.role === 'primary')
    ?? contract.regions.find((candidate) => candidate.role === 'full-width')
    ?? region
}

function regionCapacity(contract: ResumeTemplateContract, region: ResumeTemplateRegionContract): number {
  const base = region.capacityLines ?? (region.role === 'full-width' ? 10 : 44)
  const sourcePages = Math.max(1, contract.sourcePageCount ?? 1)
  return Math.max(1, Math.round(base * (region.role === 'full-width' ? 1 : sourcePages)))
}

function calculateRegionLines(
  data: ImprovedResumeData,
  contract: ResumeTemplateContract,
  region: ResumeTemplateRegionContract,
  sections: DynamicSection[]
): number {
  const identityLines = contract.identityRegionId === region.id ? estimateIdentityLines(data, region) : 0
  return identityLines + sections.reduce((sum, section) => sum + estimateResumeSectionLines(section, region), 0)
}

export function planResumeTemplateLayout(
  data: ImprovedResumeData,
  contract: ResumeTemplateContract
): ResumeTemplateLayoutPlan {
  const sectionMap = new Map<string, DynamicSection[]>()
  for (const region of contract.regions) sectionMap.set(region.id, [])

  const summary = (data.sections ?? []).find((section) => getSectionSemanticType(section) === 'summary')
    ?? (data.sections ?? []).find((section) => section.type === 'text')

  for (const section of orderedSections(data, contract)) {
    const region = section === summary
      ? contract.regions.find((candidate) => candidate.id === contract.summaryRegionId) ?? getContentRegion(contract, section)
      : getContentRegion(contract, section)
    const current = sectionMap.get(region.id) ?? []
    current.push(section)
    sectionMap.set(region.id, current)
  }

  const overflowMoves: ResumeTemplateOverflowMove[] = []
  const warnings: string[] = []

  // Capacity routing is intentionally section-level. Content is never truncated.
  // Secondary/full-width regions may move complete sections to their declared
  // overflow target; primary regions are allowed to paginate instead.
  for (let pass = 0; pass < contract.regions.length; pass++) {
    let moved = false
    for (const region of contract.regions) {
      if (!region.overflowTo) continue
      const target = contract.regions.find((candidate) => candidate.id === region.overflowTo)
      if (!target) continue
      const sections = sectionMap.get(region.id) ?? []
      const capacity = regionCapacity(contract, region)

      while (sections.length > 0 && calculateRegionLines(data, contract, region, sections) > capacity) {
        const section = sections[sections.length - 1]
        sections.pop()
        const targetSections = sectionMap.get(target.id) ?? []
        targetSections.push(section)
        sectionMap.set(target.id, targetSections)
        overflowMoves.push({
          sectionTitle: section.title,
          semanticType: getSectionSemanticType(section),
          fromRegionId: region.id,
          toRegionId: target.id,
          reason: 'region-capacity',
        })
        moved = true
      }
      sectionMap.set(region.id, sections)
    }
    if (!moved) break
  }

  const regions = contract.regions.map((region): ResumeTemplateRegionPlan => {
    const sections = sectionMap.get(region.id) ?? []
    const capacityLines = regionCapacity(contract, region)
    const estimatedLines = calculateRegionLines(data, contract, region, sections)
    const requiredPages = Math.max(1, Math.ceil(estimatedLines / capacityLines))
    const fit = fitFor(estimatedLines, capacityLines)

    if (fit === 'overflow-risk') {
      warnings.push(`${region.id} requires about ${requiredPages} pages of region capacity; content is preserved and may paginate.`)
    } else if (fit === 'tight') {
      warnings.push(`${region.id} is close to its inferred capacity.`)
    }

    return { region, sections, estimatedLines, capacityLines, fit, requiredPages }
  })

  for (const move of overflowMoves) {
    warnings.push(`${move.sectionTitle} moved from ${move.fromRegionId} to ${move.toRegionId} to avoid region overflow.`)
  }

  const contentRegions = regions.filter((item) => item.region.role !== 'header' || item.sections.length > 0 || contract.identityRegionId === item.region.id)
  const fit = contentRegions.reduce<ResumeRegionFit>((worst, item) => {
    return fitRank(item.fit) > fitRank(worst) ? item.fit : worst
  }, 'comfortable')
  const estimatedPages = Math.max(1, ...contentRegions.map((item) => item.requiredPages))

  return { contract, regions, overflowMoves, warnings, fit, estimatedPages }
}
