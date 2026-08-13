import type { ResumeSemanticSectionType } from '@/types/resume'
import type {
  ResumeTemplateContract,
  ResumeTemplateId,
  ResumeTemplateRegionContract,
} from '@/types/resume-template-contract'
import type { ResumeLayoutDocument, ResumeLayoutPage } from './resume-layout-extraction.service'
import { inferSemanticTypeFromTitle } from './canonical-resume.service'

export const DEFAULT_SECTION_ORDER: ResumeSemanticSectionType[] = [
  'summary',
  'experience',
  'projects',
  'skills',
  'education',
  'certifications',
  'licenses',
  'awards',
  'languages',
  'volunteer',
  'publications',
  'training',
  'custom',
  'unknown',
]

const ALL_SECTION_TYPES: ResumeSemanticSectionType[] = [...DEFAULT_SECTION_ORDER]
const SECONDARY_SECTION_TYPES: ResumeSemanticSectionType[] = [
  'skills',
  'education',
  'certifications',
  'licenses',
  'languages',
  'training',
]
const PRIMARY_SIGNAL_TYPES = new Set<ResumeSemanticSectionType>([
  'summary',
  'experience',
  'projects',
  'volunteer',
  'publications',
  'awards',
])

export const BUILT_IN_TEMPLATE_CONTRACTS: Record<ResumeTemplateId, ResumeTemplateContract> = {
  classic: {
    id: 'classic-v1',
    source: 'builtin',
    templateId: 'classic',
    columnCount: 1,
    identityRegionId: 'header',
    summaryRegionId: 'main',
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    regions: [
      {
        id: 'header',
        role: 'header',
        column: 0,
        widthRatio: 1,
        preferredSemanticTypes: [],
        allowedSemanticTypes: [],
        preferredOrder: [],
      },
      {
        id: 'main',
        role: 'primary',
        column: 0,
        widthRatio: 1,
        preferredSemanticTypes: [...ALL_SECTION_TYPES],
        allowedSemanticTypes: [...ALL_SECTION_TYPES],
        preferredOrder: [...DEFAULT_SECTION_ORDER],
        capacityLines: 48,
      },
    ],
    allowAdditionalPages: true,
    preserveHeadingTitles: true,
    minimumFontSize: 9.5,
    confidence: 1,
  },
  modern: {
    id: 'modern-v1',
    source: 'builtin',
    templateId: 'modern',
    columnCount: 2,
    identityRegionId: 'sidebar',
    summaryRegionId: 'main',
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    regions: [
      {
        id: 'sidebar',
        role: 'secondary',
        column: 1,
        widthRatio: 0.35,
        preferredSemanticTypes: [...SECONDARY_SECTION_TYPES],
        allowedSemanticTypes: [...SECONDARY_SECTION_TYPES],
        preferredOrder: SECONDARY_SECTION_TYPES.filter((type) => DEFAULT_SECTION_ORDER.includes(type)),
        capacityLines: 44,
        overflowTo: 'main',
      },
      {
        id: 'main',
        role: 'primary',
        column: 2,
        widthRatio: 0.65,
        preferredSemanticTypes: ALL_SECTION_TYPES.filter((type) => !SECONDARY_SECTION_TYPES.includes(type)),
        allowedSemanticTypes: [...ALL_SECTION_TYPES],
        preferredOrder: DEFAULT_SECTION_ORDER.filter((type) => !SECONDARY_SECTION_TYPES.includes(type)),
        capacityLines: 48,
      },
    ],
    allowAdditionalPages: true,
    preserveHeadingTitles: true,
    minimumFontSize: 9,
    confidence: 1,
  },
  compact: {
    id: 'compact-v1',
    source: 'builtin',
    templateId: 'compact',
    columnCount: 2,
    identityRegionId: 'header',
    summaryRegionId: 'summary',
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    regions: [
      {
        id: 'header',
        role: 'header',
        column: 0,
        widthRatio: 1,
        preferredSemanticTypes: [],
        allowedSemanticTypes: [],
        preferredOrder: [],
      },
      {
        id: 'summary',
        role: 'full-width',
        column: 0,
        widthRatio: 1,
        preferredSemanticTypes: ['summary'],
        allowedSemanticTypes: ['summary'],
        preferredOrder: ['summary'],
        capacityLines: 10,
        overflowTo: 'left',
      },
      {
        id: 'left',
        role: 'primary',
        column: 1,
        widthRatio: 0.64,
        preferredSemanticTypes: ALL_SECTION_TYPES.filter(
          (type) => type !== 'summary' && !SECONDARY_SECTION_TYPES.includes(type)
        ),
        allowedSemanticTypes: ALL_SECTION_TYPES.filter((type) => type !== 'summary'),
        preferredOrder: DEFAULT_SECTION_ORDER.filter(
          (type) => type !== 'summary' && !SECONDARY_SECTION_TYPES.includes(type)
        ),
        capacityLines: 40,
      },
      {
        id: 'right',
        role: 'secondary',
        column: 2,
        widthRatio: 0.36,
        preferredSemanticTypes: [...SECONDARY_SECTION_TYPES],
        allowedSemanticTypes: [...SECONDARY_SECTION_TYPES],
        preferredOrder: SECONDARY_SECTION_TYPES.filter((type) => DEFAULT_SECTION_ORDER.includes(type)),
        capacityLines: 40,
        overflowTo: 'left',
      },
    ],
    allowAdditionalPages: true,
    preserveHeadingTitles: true,
    minimumFontSize: 9,
    confidence: 1,
  },
}

export function getBuiltInResumeTemplateContract(templateId: ResumeTemplateId): ResumeTemplateContract {
  return BUILT_IN_TEMPLATE_CONTRACTS[templateId]
}

export function getTemplateRegionForSemanticType(
  contract: ResumeTemplateContract,
  semanticType: ResumeSemanticSectionType
): ResumeTemplateRegionContract {
  if (semanticType === 'summary') {
    const summaryRegion = contract.regions.find((region) => region.id === contract.summaryRegionId)
    if (summaryRegion) return summaryRegion
  }

  const preferred = contract.regions.find((region) => region.preferredSemanticTypes.includes(semanticType))
  if (preferred) return preferred

  const allowed = contract.regions.find((region) => region.allowedSemanticTypes.includes(semanticType))
  if (allowed) return allowed

  return contract.regions.find((region) => region.role === 'primary')
    ?? contract.regions.find((region) => region.role === 'full-width')
    ?? contract.regions[0]
}

function uniqueSemanticTypes(types: ResumeSemanticSectionType[]): ResumeSemanticSectionType[] {
  return Array.from(new Set(types))
}

function getDetectedSectionHeadings(page: ResumeLayoutPage) {
  const headings = page.lines
    .map((line, index) => ({ line, index, semanticType: inferSemanticTypeFromTitle(line.text) }))
    .filter(({ line }) => line.isHeading && line.text.trim().length > 1 && line.text.trim().length <= 64)

  const first = headings[0]
  const second = headings[1]
  const firstWords = first?.line.text.trim().split(/\s+/).filter(Boolean) ?? []
  const looksLikeName = firstWords.length >= 2
    && firstWords.length <= 5
    && firstWords.every((word) => /^[A-Z][A-Za-z'’-]*$/.test(word))
  const likelyIdentityHeading = Boolean(
    first
    && (first.semanticType === 'unknown' || first.semanticType === 'custom')
    && (
      first.line.fontSize >= Math.max(14, (second?.line.fontSize ?? 10) * 1.18)
      || (looksLikeName && second && first.line.y - second.line.y >= 24)
    )
  )

  return (likelyIdentityHeading ? headings.slice(1) : headings).map((heading) => ({
    ...heading,
    semanticType: heading.semanticType === 'unknown' ? 'custom' as const : heading.semanticType,
  }))
}

function estimateColumnWidth(page: ResumeLayoutPage, column: 1 | 2): number {
  const all = page.lines.filter((line) => line.width > 0)
  const selected = all.filter((line) => line.column === column)
  if (!all.length || !selected.length) return 0.5

  const minX = Math.min(...all.map((line) => line.x))
  const maxX = Math.max(...all.map((line) => line.x + line.width))
  const span = Math.max(1, maxX - minX)
  const selectedMin = Math.min(...selected.map((line) => line.x))
  const selectedMax = Math.max(...selected.map((line) => line.x + line.width))
  return Math.max(0.2, Math.min(0.8, (selectedMax - selectedMin) / span))
}

function estimateMinimumFontSize(page: ResumeLayoutPage): number {
  const sizes = page.lines
    .filter((line) => !line.isHeading && line.fontSize > 0)
    .map((line) => line.fontSize)
    .sort((a, b) => a - b)
  if (!sizes.length) return 9
  const lowerQuartile = sizes[Math.floor((sizes.length - 1) * 0.25)]
  return Math.max(8, Math.min(11, Math.round(lowerQuartile * 2) / 2))
}

function estimateRegionCapacityLines(page: ResumeLayoutPage, column: 0 | 1 | 2, minimumFontSize: number, role: 'primary' | 'secondary' | 'full-width'): number {
  const selected = page.lines.filter((line) => line.column === column && line.fontSize > 0)
  if (!selected.length) return role === 'full-width' ? 10 : 40
  const top = Math.max(...selected.map((line) => line.y + Math.max(line.height, line.fontSize)))
  const bottom = Math.min(...selected.map((line) => line.y))
  const verticalLines = Math.ceil(Math.max(0, top - bottom) / Math.max(8, minimumFontSize * 1.25))
  const observedCapacity = Math.max(verticalLines, selected.length) + 6
  return role === 'full-width'
    ? Math.max(8, Math.min(18, observedCapacity))
    : Math.max(32, Math.min(54, observedCapacity))
}

function scorePrimaryColumn(types: ResumeSemanticSectionType[]): number {
  return types.reduce((score, type) => score + (PRIMARY_SIGNAL_TYPES.has(type) ? 2 : type === 'custom' ? 0.5 : 0), 0)
}

function buildUploadedRegion(
  id: string,
  role: 'primary' | 'secondary' | 'full-width',
  column: 0 | 1 | 2,
  widthRatio: number,
  detectedTypes: ResumeSemanticSectionType[],
  capacityLines: number,
  overflowTo?: string
): ResumeTemplateRegionContract {
  const preferredOrder = uniqueSemanticTypes(detectedTypes)
  const defaultAllowed = role === 'secondary'
    ? uniqueSemanticTypes([...preferredOrder, ...SECONDARY_SECTION_TYPES])
    : uniqueSemanticTypes([...preferredOrder, ...ALL_SECTION_TYPES])

  return {
    id,
    role,
    column,
    widthRatio,
    preferredSemanticTypes: preferredOrder,
    allowedSemanticTypes: defaultAllowed,
    preferredOrder,
    capacityLines,
    overflowTo,
  }
}

export function inferResumeTemplateContract(
  layout: Pick<ResumeLayoutDocument, 'totalPages' | 'pages'>
): ResumeTemplateContract {
  const page = layout.pages.find((candidate) => candidate.lines.length > 0)
  if (!page) {
    return {
      id: 'uploaded-empty-v1',
      source: 'uploaded',
      columnCount: 1,
      identityRegionId: 'header',
      summaryRegionId: 'main',
      sectionOrder: [...DEFAULT_SECTION_ORDER],
      regions: [
        {
          id: 'header',
          role: 'header',
          column: 0,
          widthRatio: 1,
          preferredSemanticTypes: [],
          allowedSemanticTypes: [],
          preferredOrder: [],
        },
        buildUploadedRegion('main', 'primary', 0, 1, [], 40),
      ],
      allowAdditionalPages: true,
      preserveHeadingTitles: true,
      minimumFontSize: 9,
      confidence: 0.25,
      sourcePageCount: layout.totalPages,
    }
  }

  const headings = getDetectedSectionHeadings(page).map((heading) => {
    if (heading.line.column === 0) return heading
    const nearbyFullWidthBody = page.lines.find((line) => (
      line.column === 0
      && line.y < heading.line.y
      && heading.line.y - line.y <= Math.max(36, heading.line.fontSize * 4)
      && line.x <= heading.line.x + 12
      && line.x + line.width >= heading.line.x + heading.line.width
    ))
    return nearbyFullWidthBody
      ? { ...heading, line: { ...heading.line, column: 0 as const } }
      : heading
  })
  const sectionOrder = uniqueSemanticTypes(headings.map((heading) => heading.semanticType))
  const recognizedCount = headings.filter((heading) => heading.semanticType !== 'custom').length
  const confidence = Math.min(0.98, 0.45 + Math.min(recognizedCount, 6) * 0.07 + (page.columnCount === 2 ? 0.08 : 0.04))
  const minimumFontSize = estimateMinimumFontSize(page)

  if (page.columnCount === 1) {
    const types = headings.map((heading) => heading.semanticType)
    return {
      id: 'uploaded-single-column-v1',
      source: 'uploaded',
      columnCount: 1,
      identityRegionId: 'header',
      summaryRegionId: 'main',
      sectionOrder: sectionOrder.length ? sectionOrder : [...DEFAULT_SECTION_ORDER],
      regions: [
        {
          id: 'header',
          role: 'header',
          column: 0,
          widthRatio: 1,
          preferredSemanticTypes: [],
          allowedSemanticTypes: [],
          preferredOrder: [],
        },
        buildUploadedRegion(
          'main',
          'primary',
          0,
          1,
          types,
          estimateRegionCapacityLines(page, 0, minimumFontSize, 'primary')
        ),
      ],
      allowAdditionalPages: true,
      preserveHeadingTitles: true,
      minimumFontSize,
      confidence,
      sourcePageCount: layout.totalPages,
    }
  }

  const fullTypes = headings.filter(({ line }) => line.column === 0).map((heading) => heading.semanticType)
  const leftTypes = headings.filter(({ line }) => line.column === 1).map((heading) => heading.semanticType)
  const rightTypes = headings.filter(({ line }) => line.column === 2).map((heading) => heading.semanticType)
  const leftScore = scorePrimaryColumn(leftTypes)
  const rightScore = scorePrimaryColumn(rightTypes)
  const primaryColumn: 1 | 2 = rightScore > leftScore ? 2 : 1
  const primaryId = primaryColumn === 1 ? 'left' : 'right'
  const summaryInFullWidth = fullTypes.includes('summary')
  const summaryInLeft = leftTypes.includes('summary')
  const summaryInRight = rightTypes.includes('summary')
  const summaryRegionId = summaryInFullWidth
    ? 'full-width'
    : summaryInLeft
      ? 'left'
      : summaryInRight
        ? 'right'
        : primaryId

  const regions: ResumeTemplateRegionContract[] = [
    {
      id: 'header',
      role: 'header',
      column: 0,
      widthRatio: 1,
      preferredSemanticTypes: [],
      allowedSemanticTypes: [],
      preferredOrder: [],
    },
  ]

  if (fullTypes.length) {
    regions.push(buildUploadedRegion(
      'full-width',
      'full-width',
      0,
      1,
      fullTypes,
      estimateRegionCapacityLines(page, 0, minimumFontSize, 'full-width'),
      primaryId
    ))
  }

  regions.push(
    buildUploadedRegion(
      'left',
      primaryColumn === 1 ? 'primary' : 'secondary',
      1,
      estimateColumnWidth(page, 1),
      leftTypes,
      estimateRegionCapacityLines(page, 1, minimumFontSize, primaryColumn === 1 ? 'primary' : 'secondary'),
      primaryColumn === 1 ? undefined : primaryId
    ),
    buildUploadedRegion(
      'right',
      primaryColumn === 2 ? 'primary' : 'secondary',
      2,
      estimateColumnWidth(page, 2),
      rightTypes,
      estimateRegionCapacityLines(page, 2, minimumFontSize, primaryColumn === 2 ? 'primary' : 'secondary'),
      primaryColumn === 2 ? undefined : primaryId
    )
  )

  return {
    id: 'uploaded-two-column-v1',
    source: 'uploaded',
    columnCount: 2,
    identityRegionId: 'header',
    summaryRegionId,
    sectionOrder: sectionOrder.length ? sectionOrder : [...DEFAULT_SECTION_ORDER],
    regions,
    allowAdditionalPages: true,
    preserveHeadingTitles: true,
    minimumFontSize,
    confidence,
    sourcePageCount: layout.totalPages,
  }
}
