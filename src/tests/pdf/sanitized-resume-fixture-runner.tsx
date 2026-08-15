import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isAbsolute, resolve, sep } from 'node:path'
import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { extractText } from 'unpdf'
import type { ImprovedResumeData } from '../../types/resume'
import { UploadedResumeTemplateRenderer } from '../../components/pdf/ImprovedResumeTemplate'
import { extractResumeLayout } from '../../features/resume/services/resume-layout-extraction.service'
import { buildResumeTemplateCapabilityReport } from '../../features/resume/services/resume-template-capability.service'
import {
  collectExpectedRenderedResumeContent,
  normalizeComparableText,
  verifyUploadedRenderedResumePdf,
} from '../../features/resume/services/resume-pdf-verification.service'
import { writeReliabilitySuiteReport, type ReliabilityCaseResult } from './resume-reliability-report'

type CapabilityExpectation = 'verified' | 'limited' | 'blocked'

interface SanitizedFixtureExpectation {
  columns?: 1 | 2
  minimumConfidence?: number
  minimumFidelity?: number
  maximumPageExpansion?: number
  capability?: CapabilityExpectation
  unsupportedFeatures?: string[]
}

interface SanitizedFixtureEntry {
  id: string
  pdf: string
  data: string
  expected?: SanitizedFixtureExpectation
}

interface SanitizedFixtureManifest {
  schemaVersion: 1
  fixtures: SanitizedFixtureEntry[]
}

function resolveFixturePath(root: string, relativePath: string): string {
  assert.ok(relativePath && !isAbsolute(relativePath), `Fixture path must be relative: ${relativePath}`)
  const resolvedRoot = resolve(root)
  const resolvedPath = resolve(resolvedRoot, relativePath)
  assert.ok(
    resolvedPath === resolvedRoot || resolvedPath.startsWith(`${resolvedRoot}${sep}`),
    `Fixture path escapes the sanitized fixture directory: ${relativePath}`
  )
  return resolvedPath
}

function parseManifest(value: unknown): SanitizedFixtureManifest {
  assert.ok(value && typeof value === 'object', 'Sanitized fixture manifest must be an object')
  const manifest = value as Partial<SanitizedFixtureManifest>
  assert.equal(manifest.schemaVersion, 1, 'Sanitized fixture manifest schemaVersion must be 1')
  assert.ok(Array.isArray(manifest.fixtures), 'Sanitized fixture manifest must contain a fixtures array')
  assert.ok(manifest.fixtures.length > 0, 'Sanitized fixture manifest must contain at least one fixture')

  const ids = new Set<string>()
  for (const fixture of manifest.fixtures) {
    assert.ok(fixture && typeof fixture === 'object', 'Each sanitized fixture must be an object')
    assert.ok(typeof fixture.id === 'string' && fixture.id.trim(), 'Each sanitized fixture requires a non-empty id')
    assert.ok(!ids.has(fixture.id), `Duplicate sanitized fixture id: ${fixture.id}`)
    ids.add(fixture.id)
    assert.ok(typeof fixture.pdf === 'string' && fixture.pdf.toLowerCase().endsWith('.pdf'), `${fixture.id}: pdf must reference a .pdf file`)
    assert.ok(typeof fixture.data === 'string' && fixture.data.toLowerCase().endsWith('.json'), `${fixture.id}: data must reference a .json file`)
  }

  return manifest as SanitizedFixtureManifest
}

function parseResumeData(value: unknown, fixtureId: string): ImprovedResumeData {
  assert.ok(value && typeof value === 'object', `${fixtureId}: canonical resume JSON must be an object`)
  const data = value as Partial<ImprovedResumeData>
  assert.ok(typeof data.name === 'string', `${fixtureId}: canonical resume JSON requires a name string`)
  assert.ok(Array.isArray(data.sections), `${fixtureId}: canonical resume JSON requires sections[]`)
  return data as ImprovedResumeData
}

export async function runSanitizedFixtureBenchmark(configuredRoot: string): Promise<ReliabilityCaseResult[]> {
  const root = resolve(configuredRoot)
  const manifestPath = resolveFixturePath(root, 'manifest.json')
  const manifest = parseManifest(JSON.parse(readFileSync(manifestPath, 'utf8')) as unknown)
  const cases: ReliabilityCaseResult[] = []

  for (const fixture of manifest.fixtures) {
    const expected = fixture.expected ?? {}
    const pdfPath = resolveFixturePath(root, fixture.pdf)
    const dataPath = resolveFixturePath(root, fixture.data)
    const pdfBuffer = readFileSync(pdfPath)
    const canonicalData = parseResumeData(JSON.parse(readFileSync(dataPath, 'utf8')) as unknown, fixture.id)

    const sourceParsed = await extractText(
      new Uint8Array(pdfBuffer.buffer, pdfBuffer.byteOffset, pdfBuffer.byteLength),
      { mergePages: true }
    )
    const sourceText = normalizeComparableText(sourceParsed.text)
    const sourceMissing = collectExpectedRenderedResumeContent(canonicalData).filter((fragment) => {
      const comparable = normalizeComparableText(fragment.value)
      return comparable.length > 0 && !sourceText.includes(comparable)
    })
    assert.equal(
      sourceMissing.length,
      0,
      `${fixture.id}: companion canonical JSON does not match the source fixture PDF (${sourceMissing.map((item) => item.label).join(', ')})`
    )

    const sourceLayout = await extractResumeLayout(pdfBuffer)
    const contract = sourceLayout.templateContract
    const capability = buildResumeTemplateCapabilityReport(contract)

    if (expected.columns) {
      assert.equal(contract.columnCount, expected.columns, `${fixture.id}: expected ${expected.columns} columns but inferred ${contract.columnCount}`)
    }
    assert.ok(
      contract.confidence >= (expected.minimumConfidence ?? 0.55),
      `${fixture.id}: contract confidence ${contract.confidence} fell below ${expected.minimumConfidence ?? 0.55}`
    )
    if (expected.capability) {
      assert.equal(capability.overall, expected.capability, `${fixture.id}: capability changed from expected ${expected.capability} to ${capability.overall}`)
    }
    for (const unsupported of expected.unsupportedFeatures ?? []) {
      assert.ok(
        contract.graphics?.unsupportedFeatures?.some((feature) => feature === unsupported),
        `${fixture.id}: expected unsupported feature was not detected: ${unsupported}`
      )
    }

    if (capability.overall === 'blocked') {
      assert.equal(expected.capability, 'blocked', `${fixture.id}: unexpected blocking capability must fail the sanitized fixture gate`)
      cases.push({
        id: fixture.id,
        status: 'passed',
        metrics: {
          sourcePages: sourceLayout.totalPages,
          columns: contract.columnCount,
          confidence: Math.round(contract.confidence * 100),
          capability: capability.overall,
          unsupported: capability.counts.unsupported,
        },
        notes: ['Known blocking capability matched the sanitized manifest expectation; render round-trip intentionally skipped.'],
      })
      continue
    }

    const renderData: ImprovedResumeData = { ...canonicalData, templateContract: contract }
    const renderedBuffer = await renderToBuffer(
      React.createElement(UploadedResumeTemplateRenderer, { data: renderData }) as Parameters<typeof renderToBuffer>[0]
    )
    const verification = await verifyUploadedRenderedResumePdf(
      new Uint8Array(renderedBuffer.buffer, renderedBuffer.byteOffset, renderedBuffer.byteLength),
      renderData,
      contract
    )

    assert.equal(
      verification.status,
      'verified',
      `${fixture.id}: sanitized fixture render verification failed: ${verification.templateFidelity?.checks.filter((check) => !check.passed).map((check) => check.message).join('; ')}`
    )
    assert.equal(verification.contentCoverage, 1, `${fixture.id}: canonical sanitized resume content coverage must remain 100%`)

    const fidelity = verification.templateFidelity?.score ?? 0
    assert.ok(
      fidelity >= (expected.minimumFidelity ?? 80),
      `${fixture.id}: fidelity ${fidelity}% fell below ${expected.minimumFidelity ?? 80}%`
    )
    const pageExpansion = Math.max(0, verification.actualPages - sourceLayout.totalPages)
    assert.ok(
      pageExpansion <= (expected.maximumPageExpansion ?? 1),
      `${fixture.id}: page expansion ${pageExpansion} exceeded ${expected.maximumPageExpansion ?? 1}`
    )

    cases.push({
      id: fixture.id,
      status: 'passed',
      metrics: {
        sourcePages: sourceLayout.totalPages,
        renderedPages: verification.actualPages,
        columns: contract.columnCount,
        confidence: Math.round(contract.confidence * 100),
        fidelity,
        contentCoverage: verification.contentCoverage,
        capability: capability.overall,
        unsupported: capability.counts.unsupported,
      },
    })
  }

  writeReliabilitySuiteReport('Sanitized Real-World Fixture Benchmark', cases, {
    fixtures: cases.length,
    verifiedCases: cases.filter((item) => item.metrics?.contentCoverage === 1).length,
    expectedBlockedCases: cases.filter((item) => item.metrics?.capability === 'blocked').length,
  })
  console.log(`Sanitized real-world fixture benchmark passed: ${cases.length} fixture(s).`)
  return cases
}
