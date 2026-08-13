import type { ResumeLayoutLine } from '@/features/resume/services/resume-layout-geometry.service'
import { getBuiltInResumeTemplateContract, getTemplateRegionForSemanticType, inferResumeTemplateContract } from '@/features/resume/services/resume-template-contract.service'

const line = (text: string, column: 0 | 1 | 2, y: number, isHeading = false, fontFamily = 'Helvetica', fontSize?: number): ResumeLayoutLine => ({
  text,
  x: column === 2 ? 320 : 40,
  y,
  width: column === 0 ? 500 : 180,
  height: fontSize ?? (isHeading ? 12 : 10),
  fontSize: fontSize ?? (isHeading ? 12 : 10),
  fontFamily,
  column,
  isHeading,
  isBullet: false,
})

describe('resume template contracts', () => {
  it('defines built-in regions as explicit deterministic contracts', () => {
    const modern = getBuiltInResumeTemplateContract('modern')
    const compact = getBuiltInResumeTemplateContract('compact')
    expect(modern.columnCount).toBe(2)
    expect(getTemplateRegionForSemanticType(modern, 'skills').id).toBe('sidebar')
    expect(getTemplateRegionForSemanticType(modern, 'experience').id).toBe('main')
    expect(getTemplateRegionForSemanticType(modern, 'custom').id).toBe('main')
    expect(getTemplateRegionForSemanticType(compact, 'summary').id).toBe('summary')
    expect(getTemplateRegionForSemanticType(compact, 'education').id).toBe('right')
  })

  it('infers semantic regions from a two-column uploaded resume layout', () => {
    const contract = inferResumeTemplateContract({ totalPages: 1, pages: [{
      pageNumber: 1,
      columnCount: 2,
      lines: [
        line('Maria Santos', 0, 760, true),
        line('SKILLS', 1, 700, true),
        line('Phlebotomy', 1, 680),
        line('EDUCATION', 1, 640, true),
        line('BS Nursing', 1, 620),
        line('EXPERIENCE', 2, 700, true),
        line('Staff Nurse', 2, 680),
      ],
    }] })

    expect(contract.source).toBe('uploaded')
    expect(contract.sectionOrder).toEqual(['skills', 'education', 'experience'])
    expect(contract.regions.find((region) => region.id === 'left')?.role).toBe('secondary')
    expect(contract.regions.find((region) => region.id === 'right')?.role).toBe('primary')
    expect(getTemplateRegionForSemanticType(contract, 'skills').id).toBe('left')
    expect(getTemplateRegionForSemanticType(contract, 'experience').id).toBe('right')
  })

  it('infers measurable uploaded visual style tokens without requiring exact font files', () => {
    const contract = inferResumeTemplateContract({ totalPages: 1, pages: [{
      pageNumber: 1,
      columnCount: 1,
      width: 612,
      height: 792,
      lines: [
        line('Jordan Lee', 0, 750, true, 'TimesNewRomanPSMT', 20),
        line('PROFESSIONAL SUMMARY', 0, 700, true, 'TimesNewRomanPSMT', 12),
        line('Operations leader focused on reliable delivery.', 0, 680, false, 'TimesNewRomanPSMT', 10),
        line('EXPERIENCE', 0, 630, true, 'TimesNewRomanPSMT', 12),
        line('Operations Coordinator', 0, 610, false, 'TimesNewRomanPSMT', 10),
      ],
    }] })

    expect(contract.style).toBeDefined()
    expect(contract.style?.pageWidth).toBe(612)
    expect(contract.style?.pageHeight).toBe(792)
    expect(contract.style?.fontClass).toBe('serif')
    expect(contract.style?.sourceFontFamily).toBe('TimesNewRomanPSMT')
    expect(contract.style?.bodyFontSize).toBe(10)
    expect(contract.style?.nameFontSize).toBe(20)
    expect(contract.style?.headerAlignment).toBe('center')
    expect(contract.style?.margins.left).toBe(40)
  })

  it('keeps unknown uploaded headings as custom content instead of dropping them', () => {
    const contract = inferResumeTemplateContract({ totalPages: 2, pages: [{
      pageNumber: 1,
      columnCount: 1,
      lines: [
        line('Jordan Lee', 0, 760, true),
        line('EXPERIENCE', 0, 700, true),
        line('Coordinator', 0, 680),
        line('COMMUNITY IMPACT', 0, 620, true),
      ],
    }] })

    expect(contract.sourcePageCount).toBe(2)
    expect(contract.sectionOrder).toEqual(['experience', 'custom'])
    expect(contract.regions.find((region) => region.id === 'main')?.preferredSemanticTypes).toEqual(['experience', 'custom'])
  })
})
