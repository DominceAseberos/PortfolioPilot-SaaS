# Sanitized Resume Fixture Intake

This fixture path is for local or CI regression testing of real-world PDF producers without committing personal resumes to the repository.

## Safety rules

- Never place an unsanitized resume in this directory.
- Remove real names, emails, phone numbers, addresses, company-confidential details, IDs, signatures, photos, and other personal data before using a fixture.
- Use invented replacement content in both the PDF and its companion canonical JSON.
- Only use files you are legally allowed to keep for testing.
- The default local fixture directory, `test-fixtures/resume-real-world/`, is git-ignored.

## Directory layout

```text
test-fixtures/resume-real-world/
  manifest.json
  exported-from-tool-a.pdf
  exported-from-tool-a.json
  exported-from-tool-b.pdf
  exported-from-tool-b.json
```

Each PDF must have a companion canonical `ImprovedResumeData` JSON file containing the same sanitized factual content. Before any render benchmark starts, the runner verifies that every expected canonical text fragment is actually present in the source PDF; mismatched PDF/JSON pairs fail immediately. It then extracts the PDF template contract, renders that canonical data through PortfolioPilot, and verifies the exact generated PDF.

## Manifest schema

```json
{
  "schemaVersion": 1,
  "fixtures": [
    {
      "id": "tool-a-two-column",
      "pdf": "exported-from-tool-a.pdf",
      "data": "exported-from-tool-a.json",
      "expected": {
        "columns": 2,
        "minimumConfidence": 0.7,
        "minimumFidelity": 85,
        "maximumPageExpansion": 0,
        "capability": "limited",
        "unsupportedFeatures": ["raster-image"]
      }
    }
  ]
}
```

Expected fields are optional. When omitted, the runner requires at least `0.55` extraction confidence, `80%` rendered fidelity, no more than one extra rendered page, and 100% canonical content coverage.

`capability` may be `verified`, `limited`, or `blocked`. A fixture expected to be `blocked` is treated as a successful regression case only when PortfolioPilot detects that same blocking capability; render round-trip is intentionally skipped for that fixture.

## Running locally

PowerShell:

```powershell
$env:RESUME_SANITIZED_FIXTURE_DIR = "test-fixtures/resume-real-world"
npm run test:sanitized-resume-fixtures
npm run test:resume-reliability
```

CMD:

```cmd
set RESUME_SANITIZED_FIXTURE_DIR=test-fixtures\resume-real-world
npm run test:sanitized-resume-fixtures
npm run test:resume-reliability
```

When the environment variable is set, `npm run test:resume-reliability` automatically includes the sanitized real-world fixture suite and adds its JSON/Markdown/log files to `.artifacts/resume-reliability/`.

The runner rejects absolute paths and path traversal outside the configured fixture directory.
