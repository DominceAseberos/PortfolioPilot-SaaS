import { runSanitizedFixtureBenchmark } from './sanitized-resume-fixture-runner'

async function main() {
  const configuredRoot = process.env.RESUME_SANITIZED_FIXTURE_DIR?.trim()
  if (!configuredRoot) {
    console.log('SKIP sanitized real-world fixture regression: RESUME_SANITIZED_FIXTURE_DIR is not set.')
    return
  }
  await runSanitizedFixtureBenchmark(configuredRoot)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
