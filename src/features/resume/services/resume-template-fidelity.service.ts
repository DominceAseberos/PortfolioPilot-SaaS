import type { ImprovedResumeData } from '@/types/resume'
import type { ResumeTemplateContract, ResumeTemplateRegionContract } from '@/types/resume-template-contract'
import { extractResumeLayout } from './resume-layout-extraction.service'
import { getSectionSemanticType } from './resume-template-allocation.service'
import { getTemplateRegionForSemanticType } from './resume-template-contract.service'

export interface ResumeTemplateFidelityCheck {
  key: string
  passed: boolean
  message: string
}

export interface ResumeTemplateFidelityResult {
  status: 'verified' | 'failed'
  score: number
  checks: ResumeTemplateFidelityCheck[]
  warnings: string[]
  actualContract: ResumeTemplateContract
}

function roleKey(region: ResumeTemplateRegionContract): string {
  return `${region.role}:${region.column}`
}

function comparableRegion(contract: ResumeTemplateContract, semanticType: ReturnType<typeof getSectionSemanticType>) {
  const region = getTemplateRegionForSemanticType(contract, semanticType)
  return { role: region.role, column: region.column, widthRatio: region.widthRatio }
}

function findRegionByRoleAndColumn(contract: ResumeTemplateContract, expected: ResumeTemplateRegionContract) {
  return contract.regions.find((region) => roleKey(region) === roleKey(expected))
    ?? contract.regions.find((region) => region.role === expected.role)
}

export async function verifyResumeTemplateFidelity(
  pdfBytes: Uint8Array,
  data: ImprovedResumeData,
  expectedContract: ResumeTemplateContract
): Promise<ResumeTemplateFidelityResult> {
  const layout = await extractResumeLayout(Buffer.from(pdfBytes))
  const actualContract = layout.templateContract
  const checks: ResumeTemplateFidelityCheck[] = []
  const warnings: string[] = []

  checks.push({
    key: 'column-count',
    passed: actualContract.columnCount === expectedContract.columnCount,
    message: actualContract.columnCount === expectedContract.columnCount
      ? `Rendered layout preserved ${expectedContract.columnCount}-column structure.`
      : `Expected ${expectedContract.columnCount} columns but rendered layout detected ${actualContract.columnCount}.`,
  })

  const expectedContentRegions = expectedContract.regions.filter((region) => region.role !== 'header')
  for (const expectedRegion of expectedContentRegions) {
    const actualRegion = findRegionByRoleAndColumn(actualContract, expectedRegion)
    if (!actualRegion) {
      checks.push({
        key: `region:${expectedRegion.id}`,
        passed: false,
        message: `Rendered layout is missing the expected ${expectedRegion.role} region ${expectedRegion.id}.`,
      })
      continue
    }

    const widthDelta = Math.abs(actualRegion.widthRatio - expectedRegion.widthRatio)
    const widthPassed = widthDelta <= 0.18
    checks.push({
      key: `region-width:${expectedRegion.id}`,
      passed: widthPassed,
      message: widthPassed
        ? `${expectedRegion.id} width stayed within ${(widthDelta * 100).toFixed(0)}% of the contract ratio.`
        : `${expectedRegion.id} width drifted ${(widthDelta * 100).toFixed(0)}% from the contract ratio.`,
    })
  }

  const seenSemanticTypes = new Set<string>()
  for (const section of data.sections ?? []) {
    const semanticType = getSectionSemanticType(section)
    const semanticKey = semanticType === 'custom' || semanticType === 'unknown' ? `${semanticType}:${section.title}` : semanticType
    if (seenSemanticTypes.has(semanticKey)) continue
    seenSemanticTypes.add(semanticKey)

    const expected = comparableRegion(expectedContract, semanticType)
    const actual = comparableRegion(actualContract, semanticType)
    const passed = expected.role === actual.role
      || (expected.role === 'primary' && actual.role === 'full-width')
      || (expected.role === 'full-width' && actual.role === 'primary')

    checks.push({
      key: `placement:${semanticKey}`,
      passed,
      message: passed
        ? `${section.title} remained in a compatible ${actual.role} region.`
        : `${section.title} moved from expected ${expected.role} placement to ${actual.role}.`,
    })
  }

  const fontFloorPassed = actualContract.minimumFontSize + 0.5 >= expectedContract.minimumFontSize
  checks.push({
    key: 'minimum-font-size',
    passed: fontFloorPassed,
    message: fontFloorPassed
      ? `Rendered body font floor (${actualContract.minimumFontSize}pt) respects the ${expectedContract.minimumFontSize}pt contract minimum.`
      : `Rendered body font floor (${actualContract.minimumFontSize}pt) fell below the ${expectedContract.minimumFontSize}pt contract minimum.`,
  })

  if ((expectedContract.sourcePageCount ?? 1) < layout.totalPages) {
    warnings.push(`Rendered custom template uses ${layout.totalPages} pages versus ${expectedContract.sourcePageCount ?? 1} source page(s); content was preserved rather than compressed below safe limits.`)
  }

  const passedCount = checks.filter((check) => check.passed).length
  const score = checks.length === 0 ? 100 : Math.round((passedCount / checks.length) * 100)
  const criticalFailure = checks.some((check) => !check.passed && (check.key === 'column-count' || check.key === 'minimum-font-size' || check.key.startsWith('placement:')))

  return {
    status: criticalFailure ? 'failed' : 'verified',
    score,
    checks,
    warnings,
    actualContract,
  }
}
