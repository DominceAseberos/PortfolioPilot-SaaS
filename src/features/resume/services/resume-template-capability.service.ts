import type {
  ResumeTemplateContract,
  ResumeTemplateUnsupportedGraphicFeature,
} from '@/types/resume-template-contract'
import { assessResumeGraphicContinuation } from './resume-template-graphics.service'

export type ResumeTemplateCapabilityStatus = 'preserved' | 'approximated' | 'unsupported' | 'blocking'

export interface ResumeTemplateCapabilityItem {
  key: string
  label: string
  status: ResumeTemplateCapabilityStatus
  detail: string
}

export interface ResumeTemplateCapabilityReport {
  overall: 'verified' | 'limited' | 'blocked'
  items: ResumeTemplateCapabilityItem[]
  counts: Record<ResumeTemplateCapabilityStatus, number>
}

const unsupportedGraphicDetails: Record<ResumeTemplateUnsupportedGraphicFeature, { label: string; detail: string }> = {
  'raster-image': {
    label: 'Raster images / logos',
    detail: 'Detected raster artwork is not recreated by Preserve Uploaded Layout. Resume text and verified layout remain available.',
  },
  'gradient-or-shading': {
    label: 'Gradients / shading',
    detail: 'Gradient or shading operators are detected but are not deterministically reproduced yet.',
  },
  'pattern-or-special-color': {
    label: 'Patterns / special color spaces',
    detail: 'Pattern or special color operators are outside the verified RGB/CMYK reproduction path.',
  },
  'complex-vector-artwork': {
    label: 'Complex vector artwork',
    detail: 'Decorative vector artwork outside verified dividers and large filled regions is intentionally not recreated exactly.',
  },
}

function addItem(
  items: ResumeTemplateCapabilityItem[],
  key: string,
  label: string,
  status: ResumeTemplateCapabilityStatus,
  detail: string
) {
  items.push({ key, label, status, detail })
}

export function buildResumeTemplateCapabilityReport(contract: ResumeTemplateContract): ResumeTemplateCapabilityReport {
  const items: ResumeTemplateCapabilityItem[] = []

  addItem(
    items,
    'structure',
    'Regions & section placement',
    'preserved',
    `${contract.columnCount}-column structure, semantic regions, ordering, and overflow routes are represented by the template contract.`
  )

  if (contract.style) {
    addItem(
      items,
      'page-geometry',
      'Page size, margins & spacing',
      'preserved',
      'Page dimensions, margins, line spacing, section spacing, and header alignment are measured and render-verified.'
    )
    addItem(
      items,
      'typography-scale',
      'Typography hierarchy',
      'preserved',
      'Body, heading, and name-size hierarchy plus the minimum readable font floor are measured and verified.'
    )
    addItem(
      items,
      'exact-font-family',
      'Exact embedded font family',
      'approximated',
      `The source reports ${contract.style.sourceFontFamily || 'an embedded font'}, but PortfolioPilot safely maps it to the verified ${contract.style.fontClass} font class instead of copying an embedded font file.`
    )
  }

  if (contract.graphics) {
    addItem(
      items,
      'measured-graphics',
      'Colors, dividers & large fills',
      'preserved',
      'Measured text/accent colors, divider rules, and simple large background regions are reproduced and checked from PDF operators.'
    )

    for (const feature of contract.graphics.unsupportedFeatures ?? []) {
      const description = unsupportedGraphicDetails[feature]
      addItem(items, `unsupported:${feature}`, description.label, 'unsupported', description.detail)
    }
  }

  const continuation = assessResumeGraphicContinuation(contract.pageGraphics)
  if (continuation.status === 'single-page') {
    addItem(
      items,
      'continuation',
      'Continuation-page styling',
      'preserved',
      'No additional inspected continuation-page graphic profile needs reproduction.'
    )
  } else if (continuation.status === 'reproducible') {
    addItem(
      items,
      'continuation',
      'Continuation-page styling',
      'preserved',
      `Inspected page${continuation.inspectedPages.length > 1 ? 's' : ''} ${continuation.inspectedPages.join(', ')} follow the renderer's verified repeat policy.`
    )
  } else {
    addItem(
      items,
      'continuation',
      'Page-specific continuation artwork',
      'blocking',
      `Page${continuation.incompatiblePages.length > 1 ? 's' : ''} ${continuation.incompatiblePages.join(', ')} contain visual differences that the flowing renderer cannot safely reproduce exactly. Use a built-in template for verified export.`
    )
  }

  const counts: Record<ResumeTemplateCapabilityStatus, number> = {
    preserved: 0,
    approximated: 0,
    unsupported: 0,
    blocking: 0,
  }
  for (const item of items) counts[item.status] += 1

  const overall = counts.blocking > 0
    ? 'blocked' as const
    : counts.approximated > 0 || counts.unsupported > 0
      ? 'limited' as const
      : 'verified' as const

  return { overall, items, counts }
}
