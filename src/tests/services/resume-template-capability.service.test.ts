import { buildResumeTemplateCapabilityReport } from '@/features/resume/services/resume-template-capability.service'
import type { ResumeTemplateContract } from '@/types/resume-template-contract'

const baseContract: ResumeTemplateContract = {
  id: 'capability-test-v1',
  source: 'uploaded',
  columnCount: 2,
  identityRegionId: 'header',
  summaryRegionId: 'main',
  sectionOrder: ['summary', 'experience', 'skills', 'education', 'custom', 'unknown'],
  regions: [
    { id: 'header', role: 'header', column: 0, widthRatio: 1, preferredSemanticTypes: [], allowedSemanticTypes: [], preferredOrder: [] },
    { id: 'left', role: 'secondary', column: 1, widthRatio: 0.34, preferredSemanticTypes: ['skills'], allowedSemanticTypes: ['skills', 'education'], preferredOrder: ['skills', 'education'], overflowTo: 'right' },
    { id: 'right', role: 'primary', column: 2, widthRatio: 0.66, preferredSemanticTypes: ['summary', 'experience'], allowedSemanticTypes: ['summary', 'experience', 'skills', 'education', 'custom', 'unknown'], preferredOrder: ['summary', 'experience'] },
  ],
  allowAdditionalPages: true,
  preserveHeadingTitles: true,
  minimumFontSize: 9,
  confidence: 0.95,
  sourcePageCount: 2,
  style: {
    pageWidth: 595.28,
    pageHeight: 841.89,
    margins: { top: 32, right: 34, bottom: 34, left: 34 },
    sourceFontFamily: 'Source Sans Pro',
    fontClass: 'sans',
    bodyFontSize: 9.5,
    headingFontSize: 11,
    nameFontSize: 21,
    lineHeight: 1.4,
    sectionGap: 12,
    headerAlignment: 'left',
  },
}

describe('resume template capability report', () => {
  it('reports safe approximation and unsupported operator-derived features without blocking', () => {
    const graphics = {
      bodyTextColor: '#111827',
      accentTextColor: '#2563eb',
      backgroundRegions: [
        { color: '#f1f5f9', xRatio: 0, topRatio: 0, widthRatio: 0.34, heightRatio: 1 },
      ],
      unsupportedFeatures: ['raster-image', 'gradient-or-shading'] as const,
    }
    const contract: ResumeTemplateContract = {
      ...baseContract,
      graphics: { ...graphics, unsupportedFeatures: [...graphics.unsupportedFeatures] },
      pageGraphics: [
        { pageNumber: 1, graphics: { ...graphics, unsupportedFeatures: [...graphics.unsupportedFeatures] } },
        { pageNumber: 2, graphics: { ...graphics, unsupportedFeatures: [...graphics.unsupportedFeatures] } },
      ],
    }

    const report = buildResumeTemplateCapabilityReport(contract)
    expect(report.overall).toBe('limited')
    expect(report.counts.approximated).toBeGreaterThan(0)
    expect(report.items.some((item) => item.key === 'unsupported:raster-image' && item.status === 'unsupported')).toBe(true)
    expect(report.items.some((item) => item.key === 'continuation' && item.status === 'preserved')).toBe(true)
  })

  it('blocks when page-specific continuation artwork cannot follow the repeat policy', () => {
    const first = {
      bodyTextColor: '#111827',
      backgroundRegions: [
        { color: '#f1f5f9', xRatio: 0, topRatio: 0, widthRatio: 0.34, heightRatio: 1 },
      ],
    }
    const second = {
      bodyTextColor: '#111827',
      backgroundRegions: [
        { color: '#fee2e2', xRatio: 0.66, topRatio: 0, widthRatio: 0.34, heightRatio: 1 },
      ],
    }
    const report = buildResumeTemplateCapabilityReport({
      ...baseContract,
      graphics: first,
      pageGraphics: [
        { pageNumber: 1, graphics: first },
        { pageNumber: 2, graphics: second },
      ],
    })

    expect(report.overall).toBe('blocked')
    expect(report.items.some((item) => item.key === 'continuation' && item.status === 'blocking')).toBe(true)
  })
})
