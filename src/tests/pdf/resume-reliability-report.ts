import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export type ReliabilityStatus = 'passed' | 'failed'

export interface ReliabilityCaseResult {
  id: string
  status: ReliabilityStatus
  metrics?: Record<string, string | number | boolean>
  notes?: string[]
}

export interface ReliabilitySuiteReport {
  schemaVersion: 1
  suite: string
  generatedAt: string
  status: ReliabilityStatus
  cases: ReliabilityCaseResult[]
  summary: Record<string, string | number | boolean>
}

export interface ReliabilityAggregateSuite {
  suite: string
  status: ReliabilityStatus
  report?: string
  error?: string
}

export interface ReliabilityAggregateReport {
  schemaVersion: 1
  generatedAt: string
  status: ReliabilityStatus
  suites: ReliabilityAggregateSuite[]
}

function reportDir(): string | null {
  const configured = process.env.RESUME_RELIABILITY_REPORT_DIR?.trim()
  return configured ? resolve(configured) : null
}

function markdownValue(value: string | number | boolean): string {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function suiteMarkdown(report: ReliabilitySuiteReport): string {
  const summaryRows = Object.entries(report.summary)
    .map(([key, value]) => `| ${key} | ${markdownValue(value)} |`)
    .join('\n')
  const caseRows = report.cases
    .map((item) => {
      const metrics = Object.entries(item.metrics ?? {})
        .map(([key, value]) => `${key}=${markdownValue(value)}`)
        .join(', ')
      return `| ${item.id} | ${item.status} | ${metrics || '-'} | ${(item.notes ?? []).join('; ') || '-'} |`
    })
    .join('\n')

  return `# ${report.suite}\n\nStatus: **${report.status}**  \nGenerated: ${report.generatedAt}\n\n## Summary\n\n| Metric | Value |\n| --- | --- |\n${summaryRows}\n\n## Cases\n\n| Case | Status | Metrics | Notes |\n| --- | --- | --- | --- |\n${caseRows}\n`
}

export function writeReliabilitySuiteReport(
  suite: string,
  cases: ReliabilityCaseResult[],
  summary: Record<string, string | number | boolean>
): string | null {
  const directory = reportDir()
  if (!directory) return null

  mkdirSync(directory, { recursive: true })
  const status: ReliabilityStatus = cases.every((item) => item.status === 'passed') ? 'passed' : 'failed'
  const report: ReliabilitySuiteReport = {
    schemaVersion: 1,
    suite,
    generatedAt: new Date().toISOString(),
    status,
    cases,
    summary,
  }
  const baseName = suite.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const jsonPath = join(directory, `${baseName}.json`)
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  writeFileSync(join(directory, `${baseName}.md`), suiteMarkdown(report), 'utf8')
  return jsonPath
}

export function readReliabilitySuiteReport(path: string): ReliabilitySuiteReport {
  return JSON.parse(readFileSync(path, 'utf8')) as ReliabilitySuiteReport
}

export function writeReliabilityAggregateReport(report: ReliabilityAggregateReport): string | null {
  const directory = reportDir()
  if (!directory) return null
  mkdirSync(directory, { recursive: true })
  const jsonPath = join(directory, 'resume-reliability-summary.json')
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  const rows = report.suites
    .map((suite) => `| ${suite.suite} | ${suite.status} | ${suite.report ?? '-'} | ${suite.error?.replaceAll('|', '\\|').replaceAll('\n', ' ') ?? '-'} |`)
    .join('\n')
  const markdown = `# Resume Reliability Summary\n\nStatus: **${report.status}**  \nGenerated: ${report.generatedAt}\n\n| Suite | Status | Report | Error |\n| --- | --- | --- | --- |\n${rows}\n`
  writeFileSync(join(directory, 'resume-reliability-summary.md'), markdown, 'utf8')
  return jsonPath
}
