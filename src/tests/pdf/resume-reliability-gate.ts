import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import {
  readReliabilitySuiteReport,
  writeReliabilityAggregateReport,
  type ReliabilityAggregateSuite,
} from './resume-reliability-report'

const reportDirectory = resolve('.artifacts/resume-reliability')
process.env.RESUME_RELIABILITY_REPORT_DIR = reportDirectory

rmSync(reportDirectory, { recursive: true, force: true })

interface ReliabilityGateSuite {
  name: string
  script: string
  reportFile: string
}

const suites: ReliabilityGateSuite[] = [
  { name: 'Generated PDF Regression', script: 'test:pdf', reportFile: 'generated-pdf-regression.json' },
  { name: 'Template Corpus Benchmark', script: 'test:template-corpus', reportFile: 'template-corpus-benchmark.json' },
]

if (process.env.RESUME_SANITIZED_FIXTURE_DIR?.trim()) {
  suites.push({
    name: 'Sanitized Real-World Fixture Benchmark',
    script: 'test:sanitized-resume-fixtures',
    reportFile: 'sanitized-real-world-fixture-benchmark.json',
  })
}

const aggregateSuites: ReliabilityAggregateSuite[] = []

for (const suite of suites) {
  console.log(`\n=== ${suite.name} ===`)
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm'
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm run ${suite.script}`]
    : ['run', suite.script]
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, RESUME_RELIABILITY_REPORT_DIR: reportDirectory },
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  })

  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  mkdirSync(reportDirectory, { recursive: true })
  const logName = suite.reportFile.replace(/\.json$/, '.log')
  writeFileSync(
    join(reportDirectory, logName),
    `${result.stdout ?? ''}${result.stderr ? `\n--- STDERR ---\n${result.stderr}` : ''}`,
    'utf8'
  )

  const reportPath = join(reportDirectory, suite.reportFile)
  if (result.status !== 0) {
    aggregateSuites.push({
      suite: suite.name,
      status: 'failed',
      error: result.error?.message
        ? `Command ${suite.script} could not start: ${result.error.message}`
        : `Command ${suite.script} exited with code ${result.status ?? 'unknown'}.`,
    })
    break
  }

  if (!existsSync(reportPath)) {
    aggregateSuites.push({
      suite: suite.name,
      status: 'failed',
      error: `Suite passed but did not produce ${suite.reportFile}.`,
    })
    break
  }

  const report = readReliabilitySuiteReport(reportPath)
  aggregateSuites.push({
    suite: suite.name,
    status: report.status,
    report: suite.reportFile,
    ...(report.status === 'failed' ? { error: 'Structured suite report contains failed cases.' } : {}),
  })

  if (report.status === 'failed') break
}

for (const suite of suites.slice(aggregateSuites.length)) {
  aggregateSuites.push({
    suite: suite.name,
    status: 'failed',
    error: 'Not run because an earlier reliability suite failed.',
  })
}

const status = aggregateSuites.every((suite) => suite.status === 'passed') ? 'passed' : 'failed'
const summaryPath = writeReliabilityAggregateReport({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status,
  suites: aggregateSuites,
})

if (status === 'failed') {
  console.error(`\nResume reliability gate FAILED. Summary: ${summaryPath ?? reportDirectory}`)
  process.exitCode = 1
} else {
  console.log(`\nResume reliability gate passed. Summary: ${summaryPath ?? reportDirectory}`)
}
