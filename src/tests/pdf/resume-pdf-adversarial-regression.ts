import assert from 'node:assert/strict'
import { jsPDF } from 'jspdf'
import { extractResumeLayout } from '../../features/resume/services/resume-layout-extraction.service'
import { buildResumeTemplateCapabilityReport } from '../../features/resume/services/resume-template-capability.service'
import { resumeService } from '../../features/resume/services/resume.service'
import {
  getResumePdfExtractionErrorCode,
  inspectPdfWithoutReadableText,
} from '../../features/resume/services/resume-scanned-pdf.service'
import { writeReliabilitySuiteReport, type ReliabilityCaseResult } from './resume-reliability-report'

process.env.PDF_REGRESSION_TEST = '1'

function toBuffer(doc: jsPDF): Buffer {
  return Buffer.from(doc.output('arraybuffer'))
}

function addReadableResumePage(doc: jsPDF, name = 'Adversarial Resume Fixture') {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(name, 42, 58)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('fixture@example.com | Davao City, Philippines', 42, 80)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('PROFESSIONAL SUMMARY', 42, 116)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Operations professional experienced in scheduling, reporting, documentation, stakeholder coordination, and quality checks.', 42, 138, { maxWidth: 500 })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('PROFESSIONAL EXPERIENCE', 42, 188)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Operations Coordinator | Sample Services Company | 2023 - Present', 42, 210)
  doc.text('Coordinated daily workflows, maintained accurate records, and prepared weekly operational reports.', 42, 230, { maxWidth: 500 })
  doc.text('Resolved recurring exceptions with internal stakeholders and documented corrective actions.', 42, 250, { maxWidth: 500 })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('CORE SKILLS', 42, 300)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Scheduling | Process Documentation | Reporting | Quality Checks | Stakeholder Coordination', 42, 322)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('EDUCATION', 42, 370)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('BS Business Administration | Sample University | 2019 - 2023', 42, 392)
}

function createImageOnlyPage(doc: jsPDF) {
  doc.addImage({
    data: new Uint8ClampedArray([
      245, 245, 245, 255,
      225, 225, 225, 255,
      225, 225, 225, 255,
      245, 245, 245, 255,
    ]),
    width: 2,
    height: 2,
  }, 'RGBA', 24, 24, 540, 760)
}

async function expectExtractionCode(buffer: Buffer, code: string) {
  let caught: unknown
  try {
    await resumeService.extractDocumentText(buffer)
  } catch (error) {
    caught = error
  }
  assert.ok(caught, `Expected extraction to fail with ${code}`)
  assert.equal(getResumePdfExtractionErrorCode(caught), code)
}

async function main() {
  const cases: ReliabilityCaseResult[] = []

  {
    const clean = new jsPDF({ unit: 'pt', format: 'a4' })
    addReadableResumePage(clean, 'Clean Control Resume')
    const layout = await extractResumeLayout(toBuffer(clean))
    const blocking = layout.templateContract.sourceDiagnostics?.filter((item) => item.severity === 'blocking') ?? []
    assert.equal(blocking.length, 0, `Clean control unexpectedly produced blocking diagnostics: ${blocking.map((item) => item.code).join(', ')}`)
    cases.push({
      id: 'control:clean-searchable-pdf',
      status: 'passed',
      metrics: { pages: layout.totalPages, blockingDiagnostics: blocking.length, confidence: Math.round(layout.templateContract.confidence * 100) },
    })
  }

  {
    const mixed = new jsPDF({ unit: 'pt', format: 'a4' })
    addReadableResumePage(mixed, 'Mixed Page Geometry Resume')
    mixed.addPage([792, 612], 'landscape')
    addReadableResumePage(mixed, 'Mixed Page Geometry Resume Continued')
    const layout = await extractResumeLayout(toBuffer(mixed))
    const diagnostic = layout.templateContract.sourceDiagnostics?.find((item) => item.code === 'mixed-page-sizes')
    assert.ok(diagnostic, 'Mixed-size source should report mixed-page-sizes')
    assert.equal(diagnostic.severity, 'blocking')
    const capability = buildResumeTemplateCapabilityReport(layout.templateContract)
    assert.equal(capability.overall, 'blocked', 'Mixed page sizes must block exact uploaded-layout export')
    cases.push({
      id: 'geometry:mixed-page-sizes',
      status: 'passed',
      metrics: { pages: layout.totalPages, capability: capability.overall, detectedPages: diagnostic.pages?.length ?? 0 },
    })
  }

  {
    const extreme = new jsPDF({ unit: 'pt', format: [180, 1400] })
    addReadableResumePage(extreme, 'Extreme Geometry Resume')
    const layout = await extractResumeLayout(toBuffer(extreme))
    const diagnostic = layout.templateContract.sourceDiagnostics?.find((item) => item.code === 'extreme-page-geometry')
    assert.ok(diagnostic, 'Extreme aspect ratio should be detected')
    assert.equal(buildResumeTemplateCapabilityReport(layout.templateContract).overall, 'blocked')
    cases.push({ id: 'geometry:extreme-aspect-ratio', status: 'passed', metrics: { detected: true } })
  }

  {
    const manyPages = new jsPDF({ unit: 'pt', format: 'a4' })
    addReadableResumePage(manyPages, 'Excessive Page Count Resume')
    for (let pageNumber = 2; pageNumber <= 51; pageNumber += 1) {
      manyPages.addPage('a4', 'portrait')
      manyPages.setFont('helvetica', 'normal')
      manyPages.setFontSize(8)
      manyPages.text(`Continuation page ${pageNumber}`, 42, 58)
    }
    await expectExtractionCode(toBuffer(manyPages), 'PDF_TOO_MANY_PAGES')
    cases.push({ id: 'complexity:excessive-page-count', status: 'passed', metrics: { pages: 51, rejectedBeforeTextExtraction: true } })
  }

  {
    const rotated = new jsPDF({ unit: 'pt', format: 'a4' })
    addReadableResumePage(rotated, 'Rotated Text Resume')
    rotated.setFont('helvetica', 'bold')
    rotated.setFontSize(9)
    rotated.text('ROTATED SIDEBAR LABEL', 18, 550, { angle: 90 })
    const layout = await extractResumeLayout(toBuffer(rotated))
    const diagnostic = layout.templateContract.sourceDiagnostics?.find((item) => item.code === 'rotated-text')
    assert.ok(diagnostic, 'Rotated text should be detected from the raw PDF text transform')
    assert.equal(diagnostic.severity, 'limited')
    const capability = buildResumeTemplateCapabilityReport(layout.templateContract)
    assert.equal(capability.overall, 'limited')
    assert.ok(capability.items.some((item) => item.key === 'source:rotated-text' && item.status === 'unsupported'))
    cases.push({
      id: 'text:rotated-transform',
      status: 'passed',
      metrics: { rotatedItems: diagnostic.count ?? 0, capability: capability.overall },
    })
  }

  {
    const clipped = new jsPDF({ unit: 'pt', format: 'a4' })
    addReadableResumePage(clipped, 'Clipped Text Resume')
    clipped.saveGraphicsState()
    clipped.rect(40, 430, 150, 28)
    clipped.clip()
    clipped.discardPath()
    clipped.setFont('helvetica', 'bold')
    clipped.setFontSize(10)
    clipped.text('CLIPPED SIDEBAR LABEL', 42, 448)
    clipped.restoreGraphicsState()
    const layout = await extractResumeLayout(toBuffer(clipped))
    const diagnostic = layout.templateContract.sourceDiagnostics?.find((item) => item.code === 'clipping-path')
    assert.ok(diagnostic, 'Clipping paths should be surfaced as a limited source-layout capability')
    assert.equal(diagnostic.severity, 'limited')
    const capability = buildResumeTemplateCapabilityReport(layout.templateContract)
    assert.equal(capability.overall, 'limited')
    assert.ok(capability.items.some((item) => item.key === 'source:clipping-path' && item.status === 'unsupported'))
    cases.push({
      id: 'graphics:clipping-path',
      status: 'passed',
      metrics: { clippingPaths: diagnostic.count ?? 0, capability: capability.overall },
    })
  }

  {
    const hybrid = new jsPDF({ unit: 'pt', format: 'a4' })
    addReadableResumePage(hybrid, 'Partially Scanned Resume')
    hybrid.addPage('a4', 'portrait')
    createImageOnlyPage(hybrid)
    const buffer = toBuffer(hybrid)
    const layout = await extractResumeLayout(Buffer.from(buffer))
    const diagnostic = layout.templateContract.sourceDiagnostics?.find((item) => item.code === 'partially-scanned')
    assert.ok(diagnostic, 'Hybrid searchable/scanned PDF should be detected')
    assert.equal(diagnostic.severity, 'blocking')
    await expectExtractionCode(buffer, 'PARTIALLY_SCANNED_PDF')
    cases.push({
      id: 'scan:partially-scanned-pages',
      status: 'passed',
      metrics: { pages: layout.totalPages, imageOnlyPages: diagnostic.pages?.length ?? 0, rejectedBeforeAnalysis: true },
    })
  }

  {
    const imageOnly = new jsPDF({ unit: 'pt', format: 'a4' })
    createImageOnlyPage(imageOnly)
    const inspection = await inspectPdfWithoutReadableText(toBuffer(imageOnly))
    assert.equal(inspection.code, 'SCANNED_PDF')
    assert.ok(inspection.detectedImageCount > 0)
    cases.push({ id: 'scan:image-only', status: 'passed', metrics: { detectedImages: inspection.detectedImageCount } })
  }

  {
    const encrypted = new jsPDF({
      unit: 'pt',
      format: 'a4',
      encryption: { userPassword: 'fixture-secret', ownerPassword: 'fixture-owner', userPermissions: ['print'] },
    })
    addReadableResumePage(encrypted, 'Encrypted Resume')
    await expectExtractionCode(toBuffer(encrypted), 'PASSWORD_PROTECTED_PDF')
    cases.push({ id: 'security:password-protected', status: 'passed', metrics: { classified: true } })
  }

  {
    const valid = new jsPDF({ unit: 'pt', format: 'a4' })
    addReadableResumePage(valid, 'Truncated Resume')
    const full = toBuffer(valid)
    const truncated = full.subarray(0, Math.max(32, Math.floor(full.length * 0.42)))
    await expectExtractionCode(truncated, 'MALFORMED_PDF')
    cases.push({ id: 'corruption:truncated-pdf', status: 'passed', metrics: { originalBytes: full.length, truncatedBytes: truncated.length } })
  }

  writeReliabilitySuiteReport('Adversarial PDF Resilience', cases, {
    cases: cases.length,
    hardFailureCases: cases.filter((item) => ['scan:partially-scanned-pages', 'security:password-protected', 'corruption:truncated-pdf', 'complexity:excessive-page-count'].includes(item.id)).length,
    capabilityLimitationCases: cases.filter((item) => ['geometry:mixed-page-sizes', 'geometry:extreme-aspect-ratio', 'text:rotated-transform'].includes(item.id)).length,
  })
  console.log(`Adversarial PDF resilience passed: ${cases.length} cases.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
