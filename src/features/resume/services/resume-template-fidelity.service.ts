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

function withinTolerance(expected: number, actual: number, tolerance: number): boolean {
  return Math.abs(actual - expected) <= tolerance
}

function rgbDistance(expected: string, actual: string): number {
  const parse = (value: string) => [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ]
  const left = parse(expected)
  const right = parse(actual)
  return Math.sqrt(left.reduce((sum, value, index) => sum + (value - right[index]) ** 2, 0))
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

  if (expectedContract.style && actualContract.style) {
    const expectedStyle = expectedContract.style
    const actualStyle = actualContract.style
    const pageSizePassed = withinTolerance(expectedStyle.pageWidth, actualStyle.pageWidth, 2)
      && withinTolerance(expectedStyle.pageHeight, actualStyle.pageHeight, 2)
    checks.push({
      key: 'style:page-size',
      passed: pageSizePassed,
      message: pageSizePassed
        ? 'Rendered page dimensions match the uploaded PDF within 2pt.'
        : `Rendered page size ${actualStyle.pageWidth.toFixed(1)}x${actualStyle.pageHeight.toFixed(1)}pt differs from ${expectedStyle.pageWidth.toFixed(1)}x${expectedStyle.pageHeight.toFixed(1)}pt.`,
    })

    checks.push({
      key: 'style:font-class',
      passed: actualStyle.fontClass === expectedStyle.fontClass,
      message: actualStyle.fontClass === expectedStyle.fontClass
        ? `Rendered typography preserved the ${expectedStyle.fontClass} font class.`
        : `Expected ${expectedStyle.fontClass} typography but rendered output classified as ${actualStyle.fontClass}.`,
    })

    for (const [key, expected, actual, tolerance] of [
      ['style:body-font-size', expectedStyle.bodyFontSize, actualStyle.bodyFontSize, 1],
      ['style:heading-font-size', expectedStyle.headingFontSize, actualStyle.headingFontSize, 1.5],
      ['style:name-font-size', expectedStyle.nameFontSize, actualStyle.nameFontSize, 2],
      ['style:line-height', expectedStyle.lineHeight, actualStyle.lineHeight, 0.2],
      ['style:section-gap', expectedStyle.sectionGap, actualStyle.sectionGap, 4],
    ] as const) {
      const passed = withinTolerance(expected, actual, tolerance)
      checks.push({
        key,
        passed,
        message: passed
          ? `${key.replace('style:', '')} stayed within tolerance.`
          : `${key.replace('style:', '')} drifted from ${expected} to ${actual}.`,
      })
    }

    const marginDelta = Math.max(
      Math.abs(actualStyle.margins.top - expectedStyle.margins.top),
      Math.abs(actualStyle.margins.right - expectedStyle.margins.right),
      Math.abs(actualStyle.margins.left - expectedStyle.margins.left)
    )
    checks.push({
      key: 'style:margins',
      passed: marginDelta <= 12,
      message: marginDelta <= 12
        ? `Rendered top/side margins stayed within ${marginDelta.toFixed(0)}pt of the uploaded contract.`
        : `Rendered margins drifted by up to ${marginDelta.toFixed(0)}pt from the uploaded contract.`,
    })

    checks.push({
      key: 'style:header-alignment',
      passed: actualStyle.headerAlignment === expectedStyle.headerAlignment,
      message: actualStyle.headerAlignment === expectedStyle.headerAlignment
        ? `Header alignment remained ${expectedStyle.headerAlignment}.`
        : `Header alignment changed from ${expectedStyle.headerAlignment} to ${actualStyle.headerAlignment}.`,
    })
  }

  if (expectedContract.graphics) {
    const expectedGraphics = expectedContract.graphics
    const actualGraphics = actualContract.graphics

    if (!actualGraphics) {
      checks.push({
        key: 'graphics:missing',
        passed: false,
        message: 'Rendered PDF did not expose the expected graphic-style operators.',
      })
    } else {
      const bodyDistance = rgbDistance(expectedGraphics.bodyTextColor, actualGraphics.bodyTextColor)
      checks.push({
        key: 'graphics:body-text-color',
        passed: bodyDistance <= 18,
        message: bodyDistance <= 18
          ? 'Body text color stayed within the uploaded palette tolerance.'
          : `Body text color drifted from ${expectedGraphics.bodyTextColor} to ${actualGraphics.bodyTextColor}.`,
      })

      if (expectedGraphics.accentTextColor) {
        const accentDistance = actualGraphics.accentTextColor
          ? rgbDistance(expectedGraphics.accentTextColor, actualGraphics.accentTextColor)
          : Number.POSITIVE_INFINITY
        checks.push({
          key: 'graphics:accent-text-color',
          passed: accentDistance <= 24,
          message: accentDistance <= 24
            ? 'Accent text color stayed within the uploaded palette tolerance.'
            : `Accent text color drifted from ${expectedGraphics.accentTextColor} to ${actualGraphics.accentTextColor ?? 'missing'}.`,
        })
      }

      if (expectedGraphics.dividerColor) {
        const dividerDistance = actualGraphics.dividerColor
          ? rgbDistance(expectedGraphics.dividerColor, actualGraphics.dividerColor)
          : Number.POSITIVE_INFINITY
        checks.push({
          key: 'graphics:divider-color',
          passed: dividerDistance <= 24,
          message: dividerDistance <= 24
            ? 'Divider color stayed within the uploaded palette tolerance.'
            : `Divider color drifted from ${expectedGraphics.dividerColor} to ${actualGraphics.dividerColor ?? 'missing'}.`,
        })
      }

      if (expectedGraphics.dividerWidth != null) {
        const widthPassed = actualGraphics.dividerWidth != null
          && withinTolerance(expectedGraphics.dividerWidth, actualGraphics.dividerWidth, 0.35)
        checks.push({
          key: 'graphics:divider-width',
          passed: widthPassed,
          message: widthPassed
            ? 'Divider width stayed within 0.35pt of the uploaded contract.'
            : `Divider width drifted from ${expectedGraphics.dividerWidth}pt to ${actualGraphics.dividerWidth ?? 'missing'}pt.`,
        })
      }

      for (let index = 0; index < expectedGraphics.backgroundRegions.length; index++) {
        const expectedBackground = expectedGraphics.backgroundRegions[index]
        const actualBackground = actualGraphics.backgroundRegions
          .map((background) => ({
            background,
            colorDistance: rgbDistance(expectedBackground.color, background.color),
            geometryDistance: Math.max(
              Math.abs(expectedBackground.xRatio - background.xRatio),
              Math.abs(expectedBackground.topRatio - background.topRatio),
              Math.abs(expectedBackground.widthRatio - background.widthRatio),
              Math.abs(expectedBackground.heightRatio - background.heightRatio)
            ),
          }))
          .sort((a, b) => (a.colorDistance + a.geometryDistance * 255) - (b.colorDistance + b.geometryDistance * 255))[0]

        const backgroundPassed = Boolean(
          actualBackground
          && actualBackground.colorDistance <= 24
          && actualBackground.geometryDistance <= 0.04
        )
        checks.push({
          key: `graphics:background:${index}`,
          passed: backgroundPassed,
          message: backgroundPassed
            ? `Background region ${index + 1} preserved its color and geometry.`
            : `Background region ${index + 1} could not be matched within color/geometry tolerance.`,
        })

        if (expectedBackground.textColor && actualBackground?.background.textColor) {
          const localTextDistance = rgbDistance(expectedBackground.textColor, actualBackground.background.textColor)
          checks.push({
            key: `graphics:background-text:${index}`,
            passed: localTextDistance <= 24,
            message: localTextDistance <= 24
              ? `Background region ${index + 1} preserved its local text color.`
              : `Background region ${index + 1} text color drifted from ${expectedBackground.textColor} to ${actualBackground.background.textColor}.`,
          })
        }
      }
    }
  }

  if ((expectedContract.sourcePageCount ?? 1) < layout.totalPages) {
    warnings.push(`Rendered custom template uses ${layout.totalPages} pages versus ${expectedContract.sourcePageCount ?? 1} source page(s); content was preserved rather than compressed below safe limits.`)
  }

  const passedCount = checks.filter((check) => check.passed).length
  const score = checks.length === 0 ? 100 : Math.round((passedCount / checks.length) * 100)
  const criticalStyleKeys = new Set([
    'style:page-size',
    'style:font-class',
    'style:body-font-size',
    'style:heading-font-size',
    'style:name-font-size',
    'style:header-alignment',
  ])
  const criticalFailure = checks.some((check) => !check.passed && (
    check.key === 'column-count'
    || check.key === 'minimum-font-size'
    || check.key.startsWith('placement:')
    || criticalStyleKeys.has(check.key)
    || check.key === 'graphics:missing'
    || check.key === 'graphics:body-text-color'
    || check.key === 'graphics:accent-text-color'
    || check.key.startsWith('graphics:background:')
  ))

  return {
    status: criticalFailure ? 'failed' : 'verified',
    score,
    checks,
    warnings,
    actualContract,
  }
}
