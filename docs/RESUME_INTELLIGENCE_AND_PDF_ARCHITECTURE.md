# PortfolioPilot Resume Intelligence & PDF Architecture

> Status: Active implementation plan
> Last updated: 2026-08-13
> Scope: Resume extraction, cross-source enrichment, AI classification, editing, template mapping, pagination, PDF preflight, and export reliability.

## 1. Goal

Make PortfolioPilot reliably transform information from uploaded resumes, GitHub, portfolios, and manual edits into accurate, profession-agnostic, ATS-friendly PDF resumes without hallucinated facts, misplaced information, overflowing layouts, or template corruption.

The system must work for developers and non-developers alike. It must not depend on a fixed developer vocabulary.

## 2. Core Principles

1. Sources decide facts.
2. AI may classify, normalize, summarize, and improve wording, but must not invent factual claims without evidence.
3. Unknown information must remain unknown instead of being guessed.
4. All sources must normalize into one canonical resume model before template rendering.
5. Templates decide presentation only; they do not interpret source meaning.
6. Layout must adapt within safe limits, then paginate instead of shrinking into unreadable text.
7. Preview and download must be generated from the same normalized document.
8. Every AI boundary must be schema-validated.
9. Every uncertain classification must carry confidence and provenance.
10. Existing functionality must remain backward-compatible during migration.

## 3. Problems in the Current Implementation

### 3.1 Extraction loses document structure

The current PDF pipeline extracts mostly plain text. Plain-text extraction loses:

- page position
- column position
- font hierarchy
- boldness
- bullet grouping
- indentation
- section boundaries
- visual ordering

The LLM then has to reconstruct structure from a degraded representation.

### 3.2 Resume data is too loosely structured

Current dynamic entries use:

```ts
{
  title: string
  subtitle?: string
  dates?: string
  description?: string
}
```

`description` contains paragraphs and/or bullets as one string. PDF rendering later re-detects bullets from punctuation. This is fragile.

### 3.3 AI output is JSON but not fully schema-enforced

`response_format: { type: 'json_object' }` ensures JSON syntax, but not semantic correctness. Invalid section shapes, malformed links, unsupported categories, or unexpected values can still pass through.

### 3.4 Developer-biased fallback vocabulary

The rule-based resume fallback contains a hardcoded developer skill list. This cannot robustly classify nurses, teachers, chefs, accountants, tradespeople, researchers, designers, or other professions.

### 3.5 Templates are not layout-aware

The templates currently render whatever content they receive. Multiple complete entries use `wrap={false}`, which can create large blank spaces or bad pagination when entries do not fit on the remaining page.

### 3.6 No authoritative PDF preflight

The UI labels PDFs as ATS-friendly without a final automated validation of:

- overflow risk
- page density
- empty sections
- duplicate content
- minimum font size
- orphan headings
- suspiciously long bullets
- malformed links

## 4. Target Architecture

```text
                         INPUT SOURCES
                              |
          +-------------------+-------------------+
          |                   |                   |
      Resume PDF           GitHub             Portfolio
          |                   |                   |
          v                   v                   v
   Layout-aware parser    GitHub API        Web extractor
          |                   |                   |
          +-------------------+-------------------+
                              |
                              v
                       Evidence Store
                              |
                              v
                   Structural Classification
                              |
                              v
                    Semantic Classification
                              |
                              v
                     Generic Resume Ontology
                              |
                              v
                      Conflict Resolver
                              |
                              v
                    Canonical Resume Model
                              |
                    +---------+---------+
                    |                   |
                    v                   v
               AI Enhancer        User Editor
                    |                   |
                    +---------+---------+
                              |
                              v
                    Evidence Verification
                              |
                              v
                      Template Adapter
                              |
          +-------------------+-------------------+
          |                   |                   |
       Classic             Modern             Compact
          |                   |                   |
          +-------------------+-------------------+
                              |
                              v
                       Layout Planner
                              |
                              v
                        React-PDF
                              |
                              v
                        PDF Preflight
                              |
                              v
                    Preview == Download
```

## 5. Canonical Resume Model

All source types eventually normalize into this model.

```ts
type ResumeSource = 'resume' | 'github' | 'portfolio' | 'user' | 'ai'

type EvidenceStatus = 'verified' | 'inferred' | 'conflict' | 'unknown'

interface EvidenceRef {
  source: ResumeSource
  evidence?: string
  sourceUrl?: string
  confidence: number
}

interface CanonicalField<T> {
  value: T | null
  status: EvidenceStatus
  evidence: EvidenceRef[]
  aiModified?: boolean
}

interface CanonicalResume {
  identity: {
    name: CanonicalField<string>
    email: CanonicalField<string>
    phone: CanonicalField<string>
    location: CanonicalField<string>
    linkedin: CanonicalField<string>
    github: CanonicalField<string>
    website: CanonicalField<string>
  }
  summary: CanonicalField<string>
  experience: CanonicalExperience[]
  education: CanonicalEducation[]
  projects: CanonicalProject[]
  skills: CanonicalSkill[]
  certifications: CanonicalCertification[]
  awards: CanonicalAward[]
  languages: CanonicalLanguage[]
  volunteer: CanonicalExperience[]
  publications: CanonicalPublication[]
  customSections: CanonicalCustomSection[]
}
```

The canonical model is intentionally profession-agnostic.

## 6. Generic Resume Ontology

The semantic classifier routes content into generic resume concepts rather than profession-specific keyword lists.

```text
Identity
Contact
Professional Summary
Experience
  Role
  Organization
  Dates
  Responsibilities
  Achievements
Education
Skills
  Technical
  Professional
  Domain
  Tools
  Methods
Projects
Certifications
Licenses
Awards
Languages
Volunteer Work
Publications
Training
Custom / Other
Unknown
```

Unknown is a valid outcome. The system must not force ambiguous content into an incorrect category.

## 7. Source Authority Rules

Authority varies by fact type.

### Identity and employment

```text
User-confirmed value
    > Resume
    > Portfolio
    > GitHub
    > AI inference
```

### GitHub repository facts

```text
GitHub API
    > Portfolio
    > Resume
    > AI inference
```

### Portfolio links

```text
Fetched portfolio DOM
    > Resume text
    > AI inference
```

Conflicting high-confidence sources produce `status: 'conflict'`; they are not silently merged.

## 8. AI Responsibilities

### Allowed

- classify ambiguous sections
- identify relationships between nearby text
- normalize wording
- split lists
- summarize verified source material
- improve action-oriented language
- deduplicate semantically equivalent skills
- map unknown terminology into generic ontology categories

### Not allowed without evidence

- invent employers
- invent job titles
- invent dates
- invent schools or degrees
- invent technologies
- invent project metrics
- invent certifications
- invent URLs
- convert GitHub projects into employment
- infer seniority as a factual job title

## 9. AI Pipeline

Do not use one giant prompt.

### Pass A: extraction

Extraction only. No rewriting or scoring.

### Pass B: schema validation

Parse through Zod. Invalid structures are rejected or repaired.

### Pass C: semantic classification

Classify ambiguous information using section context and neighboring text.

### Pass D: evidence verification

Every generated factual field must point back to source evidence.

### Pass E: enhancement

Only editable writing fields are rewritten.

### Pass F: verification

Compare enhanced output against the evidence store. Reject unsupported facts.

## 10. AI Editable vs Protected Fields

### Protected by default

- name
- email
- phone
- organization names
- job titles
- dates
- school names
- degree names
- URLs
- certification names
- numeric metrics

### AI editable

- professional summary
- responsibility wording
- project descriptions
- bullet wording
- section summaries

AI may propose protected-field corrections, but they require source evidence or user confirmation.

## 11. Profession-Agnostic Classification

The system must use context, not only vocabulary.

Example:

```text
Section: Clinical Skills
Items:
- Phlebotomy
- Wound Care
- Patient Assessment
```

Even without a predefined medical dictionary, structural context strongly indicates these are skills.

For ambiguous phrases, semantic classification receives:

```json
{
  "text": "Forklift NC II",
  "sectionTitle": "Certifications",
  "previousText": "",
  "nextText": "",
  "source": "resume"
}
```

Allowed categories include `unknown`.

## 12. Structured Bullets

Entries should migrate from:

```ts
description?: string
```

toward:

```ts
bullets?: string[]
description?: string
```

During migration, a normalizer converts existing descriptions into structured bullet/paragraph blocks.

This enables deterministic pagination between bullets.

## 13. Template Contracts

Templates consume canonical data through adapters.

### Classic

```text
Header
Summary
Experience
Projects
Skills
Education
Other sections
```

### Modern

```text
Sidebar:
- Contact
- Skills
- Education
- Certifications / Languages

Main:
- Summary
- Experience
- Projects
- Other high-priority content
```

### Compact

```text
Header
Summary
Two-column body
  Left: Experience / Projects
  Right: Skills / Education / Certifications
```

Templates never decide whether an item is Experience or Project. Classification happens before rendering.

## 14. Layout Capacity Profiles

Each template exposes a layout profile.

Example:

```ts
interface ResumeLayoutProfile {
  id: 'classic' | 'modern' | 'compact'
  preferredPages: number
  minimumFontSize: number
  preferredSummaryWords: number
  preferredBulletWords: number
  preferredBulletsPerEntry: number
  preferredSkillCount: number
  densityThresholds: {
    comfortable: number
    warning: number
    overflow: number
  }
}
```

The profile is advisory. Content is never silently deleted to satisfy it.

## 15. Progressive Layout Strategy

When content is dense:

1. Normal spacing
2. Reduce safe section spacing
3. Reduce safe entry spacing
4. Use template's compact typography profile
5. Optimize wording with user-visible suggestion
6. Add another page

Never reduce below the template's minimum readable font size.

## 16. Pagination Rules

1. Entry headers should stay with at least the first content line.
2. Bullets may break between lines/items.
3. Entire large entries should not be `wrap={false}`.
4. Section headings should not be stranded at the bottom of a page.
5. Sidebars must have independent capacity checks.
6. Long URLs must display shortened text while retaining the full link target.

## 17. PDF Preflight

Before download, compute a deterministic report.

Checks:

- valid identity/contact values
- empty sections
- empty entries
- duplicated skills
- duplicated projects
- suspicious duplicate bullets
- very long summary
- very long bullets
- excessive skill count
- invalid URLs
- likely single-page overflow
- template-specific sidebar overload
- minimum font profile
- page count recommendation

Output:

```ts
interface ResumePreflightResult {
  score: number
  fit: 'comfortable' | 'tight' | 'overflow-risk'
  estimatedPages: number
  warnings: ResumePreflightWarning[]
  recommendations: string[]
}
```

## 18. Editor Improvements

The editor should eventually expose:

- live PDF fit indicator
- template fit status
- page-count estimate
- source badges (`Resume`, `GitHub`, `Portfolio`, `AI`)
- confidence warnings
- accepted/rejected AI changes
- section reordering
- entry reordering
- bullet-level editing
- content optimization suggestions
- conflict resolution UI

Example:

```text
Next.js            Verified - GitHub
React              Verified - Resume
Project Management AI inferred - Review
```

## 19. Template Picker Improvements

Template cards should show content-aware fit:

```text
Classic
Recommended
Estimated 1 page

Modern
Tight
Sidebar may be crowded

Compact
Comfortable
Estimated 1 page
```

## 20. Performance Strategy

1. Keep normalization and preflight deterministic and local.
2. Avoid calling the LLM for information parsers can identify reliably.
3. Run independent extraction calls concurrently where safe.
4. Cache normalized source data for repeated template switches.
5. Do not regenerate AI content when only the template changes.
6. Debounce PDF preview generation during typing.
7. Generate template mini-previews from the same cached normalized resume.
8. Prefer small classification models for routing and larger models only for difficult rewriting.
9. Limit source evidence sent to AI to relevant chunks.
10. Preserve already-verified fields between edits.

## 21. Robustness Additions

Potential follow-up improvements:

- layout-aware PDF extraction preserving blocks and coordinates
- OCR fallback for scanned resumes (separate, bounded pipeline)
- multilingual section-title classification
- profession/domain inference without forcing one occupation
- custom sections for uncommon professions
- embedding-assisted semantic deduplication
- user-confirmation queue for low-confidence fields
- deterministic conflict resolver
- AI operation/diff format instead of full-document regeneration
- snapshot tests for canonical resume normalization
- generated-PDF integration tests
- regression fixture library across many professions

## 22. Test Matrix

Minimum fixture coverage should eventually include:

- software developer
- nurse
- teacher
- accountant
- chef
- designer
- mechanic / skilled trade
- researcher / academic
- student with no work history
- multi-column resume
- one-page resume
- two-page resume
- resume with no skills heading
- resume with custom sections
- scanned PDF fallback
- conflicting GitHub identity
- unknown terminology
- unusually long skill names
- very long URLs
- 30+ skills
- 5+ work entries
- duplicate projects across Resume + GitHub + Portfolio

## 23. Implementation Order

### Phase 1 - Safe PDF layout foundation

Goal: improve PDF rendering immediately without changing source-analysis behavior.

- [x] Add structured description parser for paragraphs/bullets
- [x] Add layout profiles for Classic / Modern / Compact
- [x] Add deterministic preflight/density analyzer
- [x] Remove unsafe whole-entry `wrap={false}` usage
- [x] Protect section/entry headings using page-presence rules
- [x] Add unit tests for parser and preflight
- [x] Type-check
- [x] Targeted test suite
- [x] Update checklist after passing

#### Cycle 1 implementation notes

- Centralized description parsing across PDF templates.
- Added Classic/Modern/Compact capacity profiles and preflight scoring.
- Large entries can paginate instead of being forced as one unbreakable block.
- Added page-presence protection to section titles and entry headers.
- Targeted tests passed: 5/5.
- TypeScript passed.

### Phase 2 - Editor fit intelligence

- [x] Display preflight fit in template picker
- [x] Display fit/page estimate in live editor
- [x] Add actionable overflow warnings
- [x] Debounce expensive PDF preview regeneration if needed
- [x] Add tests
- [x] Update checklist

#### Cycle 2 implementation notes

- Template cards now show Comfortable / Tight / Overflow Risk based on the user's actual content.
- Template cards show estimated page count before selection.
- Improved Resume editor shows preflight score, fit, page estimate, and top layout warnings.
- Removed the unconditional "ATS Friendly" status and replaced it with measured layout status.
- Live PDF preview updates are debounced by 250ms to avoid regenerating a PDF on every keystroke; download still uses current data.
- Targeted layout tests remained 5/5 passing.
- TypeScript passed.

### Phase 3 - AI schema hardening

- [x] Add Zod schemas for extraction AI output
- [x] Add Zod schemas for AI scoring output
- [x] Normalize malformed AI arrays/nullable fields
- [x] Add explicit `unknown` classifications
- [x] Remove developer-only vocabulary as authoritative extraction logic
- [x] Add profession-agnostic classification tests
- [x] Update checklist

#### Cycle 3 implementation notes

- Added Zod validation for resume extraction and recruiter scoring responses.
- AI sections now carry a profession-agnostic semantic type plus classification confidence.
- Invalid semantic categories fall back to `unknown` instead of being guessed.
- Removed automatic developer-specific Skills/Projects placeholders from extraction.
- Resume scoring prompt is being shifted from tech-only assumptions toward cross-industry evaluation.
- Rule-based fallback now extracts open-ended Skills/Competencies from source text instead of checking a JavaScript/Python/React/etc. vocabulary.
- Added regression coverage for nursing and teaching terminology.
- Targeted tests passed: 10/10 across the new layout and AI schema suites.
- TypeScript passed.

### Phase 4 - Canonical resume + provenance

- [x] Define canonical resume types
- [x] Define evidence/provenance types
- [x] Build adapter from existing `ImprovedResumeData`
- [x] Add conflict status
- [x] Add source authority resolver
- [x] Add canonical validation
- [x] Add regression tests
- [x] Update checklist

#### Cycle 4 implementation notes

- Added canonical resume, field, evidence, source, conflict, and authority-context types.
- Added adapter from current `ImprovedResumeData` into the canonical model.
- Every canonical value can now retain its source and confidence.
- Matching facts merge evidence instead of duplicating the value.
- Conflicting facts are marked `conflict` and keep both candidates.
- Identity authority currently prefers User > Resume > Portfolio > GitHub > AI; GitHub-specific facts can use a GitHub-first authority context.
- Added generic semantic-title fallback for uncommon sections while preserving `custom` and `unknown`.
- Targeted tests passed: 14/14 across layout, AI schema, and canonical provenance suites.
- TypeScript passed.

### Phase 5 - Evidence-controlled AI enhancement

- [x] Separate extraction from rewriting
- [x] Require evidence for added factual claims
- [x] Restrict protected fields
- [x] Return AI changes as operations/diffs
- [x] Add verification pass
- [x] Add low-confidence confirmation queue
- [x] Add adversarial hallucination tests
- [x] Update checklist

#### Cycle 5-6 implementation notes

- GitHub project enrichment can no longer target Experience merely because a section allows AI improvements.
- Added explicit Skills and Projects section selectors using semantic classification and safe title fallbacks.
- Added deterministic protected-fact enforcement for Experience, Education, Certifications, Licenses, Awards, Volunteer, Publications, and Training.
- Existing job titles, organizations, dates, education facts, and protected links are restored after AI rewriting; hallucinated extra protected entries are discarded.
- Project enrichment remains allowed to add project entries, while protected employment facts remain isolated.
- `/api/resume/improve` now returns deterministic `operations` alongside enhanced sections for auditable add/remove/rewrite diffs.
- Added adversarial tests where AI attempts to turn a Staff Nurse into a Senior Medical Director and invent a second employer; protected facts survive unchanged.
- Targeted tests passed: 21/21 across five resume/PDF safety suites.
- TypeScript passed.

#### Cycle 7 implementation notes

- Newly added GitHub skills now survive only when the skill appears in actual repository evidence such as language, topics, description, README summary, or verified repository metadata.
- Newly added projects now survive only when they match an actual GitHub repository name/link.
- Unsupported AI additions are deterministically removed while original resume content is retained.
- GitHub skills/projects enrichment skips its LLM calls entirely when no GitHub repositories are available, reducing latency and API usage.
- Targeted tests passed: 25/25 before layout-extraction work.
- TypeScript passed.

#### Cycle 9 implementation notes

- Added a reusable section-classification review control in the Improved Resume editor.
- Sections classified as `unknown` or below the 0.75 confidence threshold now require user confirmation before the system treats the classification as authoritative.
- Manual confirmation updates only semantic classification metadata; original section titles/items/entries remain unchanged.
- Users can explicitly leave a section as `Needs Review` instead of being forced into an incorrect category.
- Added regression coverage for threshold behavior and content-preserving manual confirmation.
- Resume/PDF regression run passed: 36/36 tests across 10 suites.
- TypeScript passed.

Phase 5 is now complete.

### Phase 6 - Layout-aware source extraction

- [x] Preserve pages/blocks/coordinates from PDFs
- [x] Detect columns and headings
- [x] Preserve bullet groups
- [x] Resolve reading order
- [x] Add scanned-PDF strategy
- [x] Validate against multi-column fixtures
- [x] Update checklist

#### Cycle 8 implementation notes

- Confirmed the installed `unpdf` version exposes structured text items with x/y, width/height, font size, font family, direction, and line-break metadata, so no new extraction dependency was needed.
- Added layout geometry grouping with typography-based heading detection and bullet preservation.
- Added large-horizontal-gap splitting so same-row content from separate columns is not merged.
- Added two-column detection and column-aware reading order.
- Resume analysis now uses structured layout text for AI interpretation while preserving plain text for deterministic validation/scoring.
- Layout extraction is primary but safely falls back to the existing `unpdf.extractText`, `pdf-parse`, and final raw-text paths.
- Multi-column regression test initially exposed an inter-column merge bug; the algorithm was fixed before production integration.
- Resume/PDF regression run passed: 31/31 tests across 9 suites.
- TypeScript passed.

#### Cycle 15 scanned-PDF strategy notes

- Scanned/image-only detection runs only after layout-aware extraction, `unpdf.extractText`, `pdf-parse`, and the safe raw-text fallback have all failed, so normal searchable PDFs pay no scan-inspection cost.
- Actual PDF magic bytes are verified before validation or paid analysis; a forged `application/pdf` MIME type is rejected before credits are touched.
- Image-only PDFs are detected from PDF.js image drawing operators rather than pixel decoding, avoiding failures caused by unsupported embedded image codecs.
- Extraction failures are typed as `SCANNED_PDF` or `UNREADABLE_PDF`, allowing the API to return actionable messages instead of a generic parser error.
- PortfolioPilot deliberately does not bundle a CPU-heavy OCR engine into the normal request path. Users are guided to OCR/export a searchable PDF; a future OCR provider can attach at the typed scan boundary without changing the selectable-text pipeline.
- Paid resume analysis now refunds the deducted credit when analysis fails after charging, including scanned, unreadable, or non-resume inputs. If the refund RPC itself fails, the API does not falsely claim success and instead asks the user to contact support.
- Regression coverage includes fake-PDF signatures, typed scan responses, confirmed credit refund, refund-failure messaging, and a real generated image-only PDF.
- Final resume/PDF validation passed: 58/58 targeted Jest tests across 15 suites, 9/9 generated resume PDFs plus real scanned-PDF detection, TypeScript, and `git diff --check`.

### Phase 7 - Advanced template intelligence

- [x] Automatic recommended template based on content density
- [x] Template-specific section allocation rules
- [x] Reorderable sections
- [x] Optional content optimization to target one page
- [x] User-visible diff before AI shortening
- [x] Generated-PDF regression suite
- [x] Update checklist

#### Cycles 9-14 implementation notes

- Low-confidence or unknown semantic section classifications now surface a manual confirmation control in the editor; confirming a type preserves the original content and raises classification confidence to 1.0.
- Modern and Compact now allocate sections by semantic type rather than literal English heading keywords, so profession-specific headings such as Clinical Competencies remain correctly placed.
- Template recommendations are deterministic from content density and semantic balance; the picker can recommend Modern, Classic, or Compact and preselects the recommendation.
- Sections can be reordered manually. Summary remains pinned while explicit user order is preserved by Classic and within the required main/sidebar regions of Modern and Compact.
- Tight/overflowing resumes can request a conservative layout-optimization proposal. Only existing summary and entry-description text is eligible for shortening; protected titles, organizations, dates, links, and other facts are not rewritten.
- Optimization is proposal-first: the editor displays before/after text and predicted layout score/page changes, and nothing changes until the user explicitly applies the proposal.
- Deterministic optimization guards reject word-budget violations, new URLs, and newly invented numeric claims. Regression coverage includes an attempted 25-patient -> 100-patient hallucination.
- Added a dedicated native ESM generated-PDF regression command (`npm run test:pdf`) because React-PDF/Yoga is ESM-native and does not execute safely through the existing CommonJS Jest runtime.
- Real PDF regression renders nurse, teacher, and developer fixtures through Classic, Modern, and Compact, then re-extracts PDF text with `unpdf` to verify profession-specific content survives rendering.
- Final Phase 7 validation: 50/50 targeted Jest tests passed, 9/9 generated PDFs passed, TypeScript passed, and `git diff --check` passed.

### Phase 8 - Provenance & User Trust

- [x] Preserve source/evidence metadata through the live `DynamicSection` model
- [x] Mark original resume, GitHub, portfolio, AI, and user-edited content separately
- [x] Preserve provenance through layout optimization rewrites
- [x] Show compact source/evidence badges in the resume editor
- [x] Add regression tests for provenance retention and manual edits
- [x] Run full Jest, generated-PDF, TypeScript, and diff-hygiene validation
- [x] Update checklist and implementation notes

#### Cycle 16 implementation notes

- Added shared live provenance types for Resume, GitHub, Portfolio, AI wording, and user edits without replacing the existing string-based rendering model.
- Original uploaded resume content is normalized with Resume evidence before enrichment, so provenance survives even when the AI endpoint is unavailable.
- `/api/resume/improve` now decorates enhanced sections with deterministic evidence after AI generation instead of trusting the model to self-report its sources.
- Evidence-backed GitHub skills/projects retain repository provenance; rewritten descriptions preserve the original Resume source and append GitHub/AI evidence rather than replacing history.
- Portfolio-derived experience is marked as Portfolio evidence, with AI listed only on fields whose wording was generated or rewritten.
- Contact/identity fields now carry source evidence, including GitHub profile and Portfolio URL fallbacks.
- Manual editor changes append a `You` source marker while keeping prior evidence, so edits remain auditable instead of destroying provenance.
- Layout optimization preserves the existing evidence chain and appends AI evidence only to accepted rewritten fields.
- Replaced misleading binary `AI Generated` / `AI Enhanced` labels with compact per-source badges at identity, section, skill, entry, and entry-field levels.
- Provenance-specific regression tests cover original Resume evidence, GitHub additions, Portfolio-derived experience, manual edits, and AI layout rewrites.
- Final validation passed: 23/23 Jest suites, 87/87 tests, 9/9 generated PDFs plus scanned-PDF detection, TypeScript, and `git diff --check`.

### Phase 9 - Initial AI Change Review & Safe Restore

- [x] Preserve `/api/resume/improve` change operations in `ImprovedResumeData`
- [x] Preserve original pre-enhancement section snapshots
- [x] Group initial AI changes by section in the editor
- [x] Allow deterministic section-level restore/remove for AI-added sections
- [x] Preserve provenance when restoring original content
- [x] Add regression tests for review metadata and restore behavior
- [x] Run full Jest, generated-PDF, TypeScript, and diff-hygiene validation
- [x] Update checklist and implementation notes

#### Cycle 17 implementation notes

- Moved resume change-operation types into a shared type module so review metadata can live in `ImprovedResumeData` without coupling core types to a feature service.
- `buildImprovedResume()` now preserves the original pre-enhancement sections and the `/api/resume/improve` operation list instead of discarding the audit trail.
- Added a compact Initial AI Changes review panel that groups operations by semantic section and shows rewrite before/after text where available.
- Deliberately avoided unsafe field-level reverse patches because the existing operation format does not contain complete reversible snapshots for every add/remove case.
- Restore is deterministic at section level: existing sections are replaced from the preserved original snapshot; AI-added sections with no original counterpart are removed.
- Restored sections keep original Resume provenance and preserve the current manual section order, avoiding accidental layout-order resets.
- Reviewed operations are removed only for the restored section so remaining AI changes stay visible.
- Regression coverage verifies builder metadata retention, grouped review operations, full-section restore, provenance restoration, AI-only section removal, and network-failure fallback.
- Final validation passed: 25/25 Jest suites, 93/93 tests, 9/9 generated PDFs plus scanned-PDF detection, TypeScript, and `git diff --check`.

### Phase 10 - Identity Completeness

- [x] Extract phone numbers deterministically from resume text
- [x] Extract location conservatively from explicit resume fields and AI schema
- [x] Add phone/location to `ResumeDetails` and AI extraction output
- [x] Use GitHub profile location only as a fallback when resume location is absent
- [x] Preserve phone/location provenance through the improved-resume builder
- [x] Add location to canonical identity and editor controls
- [x] Render location consistently across Classic, Modern, Compact, and legacy PDF paths
- [x] Add regression coverage for phone/location extraction, fallback authority, and PDF rendering
- [x] Run full Jest, generated-PDF, TypeScript, and diff-hygiene validation
- [x] Update checklist and implementation notes

#### Cycle 18 implementation notes

- Fixed a concrete data-loss bug where phone numbers were detected for validation but never retained in `ResumeDetails`, while the improved-resume builder hardcoded `phone: ''`.
- Added deterministic phone extraction supporting common local/international formatting, including Philippine mobile formats, while rejecting obvious year ranges and implausible digit lengths.
- Added conservative location extraction from explicit labels such as `Location:`, `Address:`, and `Based in:`. A second explicit-label fallback handles raw PDF text paths that collapse line breaks; unlabeled locations are not guessed deterministically.
- Expanded the AI extraction schema/prompt with phone and location under an explicit-source-only rule; location may not be inferred from employer, school, project, IP address, or unrelated context.
- Added location to `ImprovedResumeData`, canonical identity, live provenance metadata, and editor controls.
- Resume phone/location outrank GitHub. GitHub profile location is fallback-only when the resume contains no location.
- During authority audit, fixed a pre-existing identity leak: a high-severity isolated GitHub source could previously still populate fallback name/location/GitHub URL even though its repositories were isolated. Isolated GitHub sources now contribute no identity fallback data.
- Classic, Modern, Compact, and the legacy PDF renderer now include location in contact information.
- Real PDF regression verifies `Davao City, Philippines` survives all three active templates.
- Final validation passed: 25/25 Jest suites, 95/95 tests, 9/9 generated PDFs plus scanned-PDF detection, TypeScript, and `git diff --check`.

### Phase 11 - Structured Bullet Model

- [x] Add optional structured `bullets[]` to resume entries without breaking legacy descriptions
- [x] Normalize legacy descriptions and structured bullets through one deterministic block adapter
- [x] Extend AI extraction/enhancement schemas and prompts to return bullet arrays when source content is bullet-like
- [x] Render structured bullets consistently across Classic, Modern, Compact, and legacy PDF paths
- [x] Use structured bullets in preflight/density analysis
- [x] Add bullet-level editor controls while preserving paragraph descriptions
- [x] Preserve bullets through protected-fact enforcement, GitHub evidence enrichment, diffs, and section restore
- [x] Add regression coverage for legacy descriptions, structured bullets, editing, and generated PDFs
- [x] Run full Jest, generated-PDF, TypeScript, and diff-hygiene validation
- [x] Update checklist and implementation notes

#### Cycle 19 implementation notes

- Added optional `bullets[]` to resume entries and canonical entries without removing the legacy `description` field.
- Added one deterministic entry-block adapter: if structured bullets exist, narrative paragraphs from `description` are preserved while legacy bullet-like description lines are not duplicated; description-only entries continue using the existing parser unchanged.
- AI extraction and enhancement schemas/prompts now separate genuine narrative descriptions from bullet-like source lines instead of forcing both into one string.
- Classic, Modern, Compact, and legacy PDF rendering all consume the same paragraph/bullet adapter.
- Preflight/density analysis now measures structured bullets directly, including long-bullet warnings.
- The resume editor now exposes individual bullet rows with add/edit/remove controls while retaining a separate optional narrative-description editor.
- Bullet provenance is tracked alongside field provenance. Manual bullet edits append `You`; AI rewrites append AI evidence; original Resume/GitHub/Portfolio evidence remains intact.
- Protected-fact enforcement, GitHub project evidence filtering, initial AI diffs, and section restore all preserve structured bullets.
- Layout optimization now targets overlong individual bullets as independent rewrite units, with the same evidence-preserving guards as narrative text.
- Tightened optimization safety: existing numeric claims and URLs must survive a rewrite; the guard now rejects both newly invented and silently removed metrics/links.
- Native PDF regression uses a nurse fixture with a narrative paragraph plus structured bullets and verifies the bullet survives all three active templates.
- Final validation passed: 25/25 Jest suites, 102/102 tests, 9/9 generated PDFs plus scanned-PDF detection, TypeScript, and `git diff --check`.

### Phase 12 - Profession-Neutral Deterministic Fallback

- [x] Remove GitHub/LinkedIn as mandatory fallback score requirements
- [x] Replace developer-specific skill/repository recommendations with role-neutral guidance
- [x] Expand action-verb detection across clinical, education, operations, finance, service, and other professions
- [x] Expand quantifiable-impact detection beyond users/revenue/software-oriented wording
- [x] Broaden deterministic experience-heading recognition without hardcoding occupations
- [x] Keep GitHub/LinkedIn/portfolio as optional strengths when present
- [x] Add non-developer fallback regression fixtures with no GitHub
- [x] Run full Jest, generated-PDF, TypeScript, and diff-hygiene validation
- [x] Update checklist and implementation notes

#### Cycle 20 implementation notes

- Removed GitHub and LinkedIn from mandatory deterministic resume scoring. Candidates can now achieve a full fallback score without developer/social-profile signals.
- Contact phone becomes the seventh generic scoring criterion alongside skills, experience, education, measurable impact, action verbs, and email.
- GitHub, LinkedIn, and portfolio/work-sample links are still surfaced as strengths when present, but their absence no longer produces penalties or developer-specific recommendations.
- Replaced `technical and soft skills` guidance with role-neutral skills/competencies/tools/methods/domain-knowledge guidance.
- Missing-experience guidance now includes practicum, volunteer work, training, and other role-related practice for students and career changers.
- Expanded action-verb recognition with cross-industry verbs such as administered, coordinated, assessed, taught, facilitated, reconciled, served, monitored, trained, analyzed, and resolved.
- Expanded metric detection to patients, students, cases, records, orders, appointments, accounts, transactions, events, campaigns, classes, units, team members, and existing commercial/software metrics.
- Expanded experience-heading recognition to professional, clinical, and teaching practice without creating occupation-specific dictionaries.
- Added a nursing fallback fixture with no GitHub or LinkedIn; it scores strongly, detects phone/location/clinical skills, and produces no GitHub/code/technical-skills recommendation.
- Final validation passed: 25/25 Jest suites, 103/103 tests, 9/9 generated PDFs plus scanned-PDF detection, TypeScript, and `git diff --check`.

### Phase 13 - Render-verified PDF export

- [x] Verify the actual generated PDF before download
- [x] Compare rendered page count against heuristic preflight
- [x] Verify expected resume content survives PDF rendering
- [x] Block download when rendered content is missing
- [x] Calibrate page estimates against real React-PDF page breaks
- [x] Add multi-page and missing-content regression coverage
- [x] Run full Jest, generated-PDF, TypeScript, targeted lint, production build, and diff-hygiene validation
- [x] Update checklist and implementation notes

#### Cycle 21 implementation notes

- Added a server-side rendered-PDF verification boundary that parses the exact browser-generated PDF blob with `unpdf` before allowing download.
- Verification compares the rendered text against the resume model's expected identity, section titles, text, list items, entry titles, subtitles, dates, paragraphs, and structured bullets. Entry URLs are intentionally excluded from visible-text checks because templates render the linked title while retaining the URL as the link target.
- Final export is blocked when expected resume content is absent from the rendered PDF instead of silently downloading a corrupted or incomplete result.
- The editor now reports authoritative rendered page count and content coverage after verification. Heuristic page estimates remain useful before export, but the real generated PDF wins when they disagree.
- Generated-PDF regression exposed a concrete calibration bug: a dense fixture was estimated at 2 pages but rendered 4 pages in Classic, Modern, and Compact.
- Added an independent `estimatedPageCapacity` so fit/density scoring remains advisory while page-count estimation can be calibrated to actual React-PDF page breaks. The same dense fixture now estimates 4 pages and renders 4 pages across all three templates; concise nurse, teacher, and developer fixtures remain 1/1.
- Added explicit regression proof that verification fails when an expected skill is missing from the generated PDF.
- Final validation passed: 25/25 Jest suites, 103/103 tests, generated-PDF verification across all active templates including multi-page output and missing-content detection, TypeScript, targeted lint for touched files, production Next.js build, and `git diff --check`.
- Repo-wide lint still contains pre-existing unrelated errors/warnings outside this phase; touched files are lint-clean.

### Phase 14 - Deterministic Template Contracts

- [x] Define one explicit template-contract model for regions, columns, semantic placement, ordering, minimum font size, overflow targets, and confidence
- [x] Move Classic, Modern, and Compact section-allocation rules into shared contracts without changing existing visual behavior
- [x] Infer a structured contract from uploaded resume layout geometry and section headings
- [x] Distinguish likely identity/name headings from actual resume sections
- [x] Preserve unfamiliar uploaded headings as custom sections instead of dropping them
- [x] Carry the inferred uploaded template contract through resume analysis for later custom-template rendering
- [x] Add deterministic contract and regression tests
- [x] Run full Jest, generated-PDF, TypeScript, targeted lint, production build, and diff-hygiene validation
- [x] Build the custom-template renderer/adapter that consumes uploaded contracts
- [x] Add region-specific capacity and overflow preflight for custom templates
- [x] Add rendered-geometry fidelity checks against the uploaded template

#### Cycle 22 implementation notes

- Added `ResumeTemplateContract` as the single structural description of a resume template: identity region, summary region, one/two-column regions, semantic preferences, allowed fallback types, section ordering, minimum readable font size, overflow destination, source confidence, and source page count.
- Classic, Modern, and Compact now expose their layout behavior through explicit contracts. The existing allocator consumes those contracts instead of maintaining separate hardcoded sidebar/right-column sets, while preserving Classic semantic ordering and Modern/Compact within-region source/manual order.
- Layout-aware PDF extraction now derives an uploaded-template contract from the same x/y/font/column geometry already used for reading order, so template interpretation does not require a second parser or an LLM guess.
- Two-column inference identifies the likely primary content column from semantic signals such as Summary, Experience, Projects, Volunteer, Publications, and Awards; skills/education/certification-style columns remain secondary when that is what the uploaded layout shows.
- Full-width regions are represented independently, allowing layouts such as a full-width Summary above a two-column body to be modeled without forcing content into a sidebar or main column.
- Likely identity/name headings are filtered from section inference using position, typography, and name-shape signals. Unrecognized headings after the identity area are retained as `custom`, protecting uncommon professions and vocabulary.
- Uploaded contract inference estimates region width ratios and a conservative minimum font size from observed layout geometry. These values are metadata only in this phase; content is never silently removed or shrunk to satisfy them.
- `ResumeDetails` now carries the inferred contract when layout extraction succeeds, creating a deterministic handoff for the next custom-template renderer phase while preserving all existing text fallbacks when geometry extraction is unavailable.
- Targeted regressions initially caught two issues: a candidate name being classified as a custom section, and Modern/Compact within-region ordering changing during the refactor. Both were fixed before final validation.
- Final validation passed: 26/26 Jest suites, 106/106 tests, generated-PDF verification across all active templates including 4-page dense resumes and missing-content rejection, scanned-PDF detection, TypeScript, touched-file ESLint, production Next.js build, and `git diff --check`.

### Phase 15 - Contract-Driven Custom Rendering & Geometry Fidelity

- [x] Preserve uploaded template contracts through `buildImprovedResume()`
- [x] Add deterministic line-capacity budgets to built-in and uploaded template regions
- [x] Add a region planner that accounts for identity/contact content and complete resume sections
- [x] Move complete overflowing secondary/full-width sections through explicit `overflowTo` routes without deleting content
- [x] Allow overloaded primary content to paginate rather than shrinking below the contract font floor
- [x] Add a generic React-PDF renderer driven by uploaded template contracts
- [x] Preserve one/two-column structure, full-width regions, region width ratios, section headings, and minimum readable font size
- [x] Re-extract the generated custom PDF and verify structural fidelity against the source contract
- [x] Tighten realistic column-gutter detection and improve identity/full-width heading inference from rendered geometry
- [x] Add real generated-PDF regression for uploaded-contract rendering
- [x] Run full Jest, generated-PDF, TypeScript, targeted lint, production build, and diff-hygiene validation

#### Cycle 23 implementation notes

- `ImprovedResumeData` now retains the uploaded `templateContract`, fixing a data-loss boundary where analysis understood the source geometry but the editor/render pipeline previously discarded it.
- Added per-region `capacityLines`. Uploaded capacity is inferred from observed vertical/text geometry; built-in contracts expose deterministic capacities matching their current rendering behavior.
- Added `planResumeTemplateLayout()`, which estimates identity/contact usage plus text, list, entry, paragraph, and bullet content in region-relative line units. It preserves manual order, pins the summary to the contract summary region, and never silently drops content.
- Secondary and full-width regions can move whole sections only through their explicit `overflowTo` target. Primary-region overload is represented as additional required pages instead of unsafe font shrinking or truncation.
- Added `ContractTemplate` / `UploadedResumeTemplateRenderer`, which renders the canonical resume through the contract's full-width and column regions using the contract width ratios and minimum font floor.
- Real PDF regression initially exposed a renderer shrink-wrap bug that forced right-column bullets into a narrow strip. Full-width nested region containers and explicit proportional column widths fixed the actual PDF geometry before release.
- The same real regression exposed two inference weaknesses: realistic ~18-30pt gutters were being flattened, and a large candidate name/short Summary heading could distort reconstructed column roles. Geometry splitting and heading inference were tightened instead of weakening fidelity verification.
- Added `verifyResumeTemplateFidelity()`. It re-parses the exact generated custom PDF and checks column count, compatible region roles, width-ratio drift, semantic section placement, minimum font floor, and page-count expansion warnings.
- Native React-PDF regression now renders an uploaded two-column nurse contract and re-extracts it at 100% geometry fidelity while preserving all expected content.
- Final validation passed: 27/27 Jest suites, 109/109 tests, all existing generated-PDF checks, uploaded-contract render fidelity at 100%, scanned-PDF detection, TypeScript, touched-file ESLint, production Next.js build, and `git diff --check`.

### Phase 16 - Preserve Uploaded Layout Editor & Verified Export

- [x] Add `Preserve Uploaded Layout` as a first-class template-picker option when an uploaded contract is available
- [x] Keep built-in template IDs unchanged and add a separate export-choice type for uploaded mode
- [x] Render uploaded mode consistently in picker previews, live editor preview, and final PDF generation
- [x] Add uploaded-layout region preflight based on inferred capacities instead of built-in density profiles
- [x] Prevent uploaded mode from silently using built-in AI layout optimization assumptions
- [x] Extend `/api/resume/verify-pdf` to accept uploaded-layout exports only when a source contract is present
- [x] Require both rendered-content verification and rendered-geometry fidelity before uploaded-layout export is accepted
- [x] Surface uploaded geometry-fidelity percentage in the editor after successful verification
- [x] Add combined uploaded content + geometry verification to the native generated-PDF regression
- [x] Capture actual PDF page dimensions and source font-family metadata for the next visual-fidelity phase
- [x] Run full Jest, generated-PDF, TypeScript, targeted lint, production build, and diff-hygiene validation

#### Cycle 24 implementation notes

- Added `ResumeTemplateChoiceId = classic | modern | compact | uploaded` at the editor/export boundary while preserving the existing built-in `ResumeTemplateId`. Recommendation, AI optimization, and built-in preflight services therefore remain type-safe and unchanged.
- The template picker now shows `Preserve Uploaded Layout` only when `ImprovedResumeData` contains an uploaded template contract. Its live preview is generated through the same contract renderer used for final export, avoiding a fake thumbnail or separate approximation path.
- Uploaded-mode preflight is derived from `planResumeTemplateLayout()` region capacities. It reports region-tight, region-overflow, and region-rerouted warnings instead of applying Classic/Modern/Compact density thresholds to a custom layout.
- Automatic AI shortening is guarded out of uploaded mode because it currently targets built-in template profiles. The editor instead tells the user to edit the flagged region manually or allow another page, preserving the source structure as the authority.
- `/api/resume/verify-pdf` now accepts `templateId=uploaded` only when the submitted resume data contains an uploaded contract. Built-in verification behavior remains unchanged.
- Added `verifyUploadedRenderedResumePdf()`: expected text must still reach 100% rendered coverage, and `verifyResumeTemplateFidelity()` must also pass. A custom export fails verification if either factual content disappears or the rendered column/region geometry drifts critically.
- The editor now displays the measured uploaded-layout geometry fidelity after verification in addition to authoritative rendered page count and expected-content coverage.
- Native generated-PDF regression now proves the combined uploaded verification path on the real React-PDF output: 100% expected content plus 100% controlled geometry fidelity.
- Layout extraction now retains source font-family metadata per reconstructed line and reads real PDF page dimensions from PDF.js. Those signals are intentionally not yet used to claim typography/color fidelity; they are groundwork for the next visual-style contract phase.
- Final validation passed: 27/27 Jest suites, 109/109 tests, all built-in generated-PDF checks, uploaded contract geometry fidelity at 100%, combined uploaded content+geometry verification, scanned-PDF detection, TypeScript, touched-file ESLint, production Next.js build, and `git diff --check`.
- Production build still reports the pre-existing multi-lockfile/Turbopack-root warning and Node `module.register()` deprecation warning; neither is introduced by this phase.

### Phase 17 - Uploaded Visual Style Contract

- [x] Extend uploaded template contracts with deterministic visual-style tokens
- [x] Infer actual PDF page dimensions rather than assuming A4
- [x] Preserve source font-family metadata and classify typography as sans/serif/mono without copying font files
- [x] Infer body, section-heading, and candidate-name type scale
- [x] Infer conservative page margins, apparent line spacing, section spacing, and header alignment from PDF geometry
- [x] Make the contract renderer consume page size, margins, type scale, line spacing, section spacing, alignment, and safe font-class fallbacks
- [x] Extend rendered-template verification to compare critical visual-style tokens with bounded tolerances
- [x] Keep exact embedded font reproduction, colors, backgrounds, and decorative graphics out of the verified claim until trustworthy source operators exist
- [x] Add deterministic style-inference unit coverage and real generated-PDF style round-trip regression
- [x] Run full Jest, generated-PDF, TypeScript, targeted lint, production build, and diff-hygiene validation

#### Cycle 25 implementation notes

- Added optional `ResumeTemplateStyleContract` metadata for measured PDF appearance: page size, conservative text insets, dominant source font metadata/class, body/heading/name sizes, apparent line pitch, between-section spacing, and header alignment.
- `extractResumeLayout()` reads real PDF page viewports through PDF.js. Reconstructed lines retain source font-family metadata, but rendering maps only safe font classes: sans to Inter/Helvetica, serif to built-in Times, and mono to built-in Courier.
- Visual inference filters tiny/footer text and uses bounded geometry heuristics. Exact embedded font names are diagnostic metadata only; font files are never copied or exposed.
- Regression testing found and fixed two real inference issues: `sans-serif` initially matched the `serif` substring, and section spacing initially measured heading-to-body spacing instead of between-section spacing.
- The uploaded renderer now consumes measured page dimensions, margins, type scale, apparent line spacing, section spacing, header alignment, and font class while preserving the contract minimum readable font size.
- `verifyResumeTemplateFidelity()` now checks page dimensions, font class, body/heading/name sizes, header alignment, margins, line spacing, and section spacing in addition to column/region/placement/font-floor checks. Major style drift can block export; noisier margin/spacing drift lowers fidelity without creating false hard failures.
- Colors, backgrounds, rules, icons, and other graphics are deliberately excluded from the verified visual-fidelity claim until trustworthy PDF drawing/operator extraction is implemented.
- Unit coverage verifies non-A4 page dimensions, serif source metadata, type hierarchy, margin signal, and header alignment. The native uploaded-PDF fixture round-trips at 100% combined content + structure + visual-style fidelity.
- Final validation passed: 27/27 Jest suites, 110/110 tests, all built-in generated-PDF checks, uploaded combined fidelity at 100%, scanned-PDF detection, TypeScript, touched-file ESLint, production Next.js build, and `git diff --check`.
- Production build still reports the pre-existing multi-lockfile/Turbopack-root warning and Node `module.register()` deprecation warning; neither is introduced by this phase.

### Phase 18 - Verified PDF Graphic Style Extraction

- [x] Inspect PDF.js operator-list shapes for text colors, strokes, fills, and path geometry
- [x] Add an optional operator-derived graphic-style contract
- [x] Extract dominant body text and accent text colors from rendered text operators
- [x] Extract horizontal divider color and line width from stroke/path operators
- [x] Extract large simple filled background regions with normalized page geometry
- [x] Detect local text color inside filled regions when coordinates are measurable
- [x] Render extracted palette, dividers, and background regions through the uploaded contract renderer
- [x] Repeat full-height backgrounds on continuation pages without repeating first-page header bands
- [x] Extend final fidelity verification to cover colors, divider width, and background color/geometry
- [x] Keep graphic extraction optional so unsupported PDF operators never downgrade text/layout extraction
- [x] Add real colored generated-PDF regression with 100% structure/style/graphics fidelity
- [x] Run full Jest, generated-PDF, TypeScript, targeted lint, production build, and diff-hygiene validation

#### Cycle 26 implementation notes

- Added `ResumeTemplateGraphicStyleContract` with body/accent text colors, divider color/width, and up to three large normalized background regions with optional local text color.
- Graphic extraction uses the first page PDF.js operator list. RGB text/stroke/fill state is tracked directly; `showText` contributes weighted palette samples, and `constructPath` exposes both the paint operator and path bounding box for rules/backgrounds.
- The implementation intentionally ignores tiny fills and near-white page backgrounds, keeps only large simple filled regions, and chooses the longest horizontal stroke as the divider signal.
- PDF coordinate handling required explicit graphics-state transform tracking. React-PDF also exposes text translations as negative offsets from page top while path boxes are already in PDF page space; text samples now normalize that representation without changing ordinary PDF coordinates.
- Regression exposed another renderer-specific detail: React-PDF emits a border stroke at roughly twice the configured `borderBottomWidth`, so the contract renderer compensates when consuming an extracted divider width. The generated PDF now re-extracts the original measured width.
- Region-local text color is derived from text samples that fall inside a detected filled region. This allows dark header/sidebar fills to reuse the observed white/light text rather than blindly applying the global body color.
- The contract renderer now applies extracted body/accent colors to text, links, bullets/list borders, and section rules, and paints detected backgrounds behind content. Full-height backgrounds repeat on continuation pages; short top header bands remain first-page-only.
- `verifyResumeTemplateFidelity()` now compares body/accent colors, divider color/width, and background color/geometry with bounded RGB/ratio tolerances. Missing graphics, major text-palette drift, or missing expected background regions can block uploaded-layout export.
- Graphic extraction is wrapped as optional metadata. Any unsupported operator-list failure leaves the already-valid text/geometry/style contract intact instead of forcing the resume into fallback extraction.
- The native uploaded fixture now includes a dark header with white text, dark body text, blue accents/dividers, and verifies at 100% combined content + structure + typography + graphic fidelity.
- Final validation passed: 27/27 Jest suites, 110/110 tests, all built-in generated-PDF checks, uploaded structure/style/graphics fidelity at 100%, combined export verification, scanned-PDF detection, TypeScript, touched-file ESLint, production Next.js build, and `git diff --check`.
- Production build still reports the pre-existing multi-lockfile/Turbopack-root warning and Node `module.register()` deprecation warning; neither is introduced by this phase.

### Phase 19 - Multi-page Visual Continuation & Operator Coverage

- [x] Bound uploaded per-page graphic inspection to the first three pages
- [x] Preserve an explicit page graphic profile for every inspected page, including pages without extractable graphic metadata
- [x] Normalize PDF CMYK fill/stroke color state into deterministic RGB hex tokens
- [x] Verify continuation-page body palette and large background geometry against the uploaded source profile
- [x] Compare continuation backgrounds bidirectionally so extra repeated artwork is detected, not only missing artwork
- [x] Model the flowing renderer's actual repeat policy: full-height backgrounds repeat, first-page header bands do not
- [x] Add preflight detection for page-specific continuation artwork before PDF generation
- [x] Keep final rendered-PDF verification as the hard export gate when page-specific visuals are not safely reproducible
- [x] Add regressions for safe repeated continuation styling, deliberately incompatible page-specific styling, three-page uploaded resumes, and CMYK conversion
- [x] Run full Jest, generated-PDF, TypeScript, targeted lint, production build, and diff-hygiene validation

#### Cycle 27 implementation notes

- Uploaded graphic inspection remains deliberately bounded to three pages, preventing long resumes from creating unbounded contracts or expensive operator scans.
- `ResumeTemplatePageGraphicProfile` now represents every inspected page explicitly. An inspected page can carry no graphic contract rather than being indistinguishable from a page that was never inspected.
- Added deterministic CMYK-to-RGB normalization for PDF fill/stroke state. Unsupported color spaces continue to fall back without weakening text/layout extraction.
- Added `assessResumeGraphicContinuation()`. It evaluates source continuation pages against the renderer's real policy instead of assuming every page should match page one: only first-page backgrounds covering at least 80% of page height are considered repeatable; short header bands remain first-page-only.
- Uploaded-template preflight now emits `page-graphics-variation` before rendering when inspected continuation pages contain palette/background artwork that cannot be reproduced safely by the flowing renderer. The user is directed toward a built-in template when exact page-specific artwork is required.
- Final fidelity verification now matches large continuation backgrounds in both directions. This closes a false-positive case where the rendered PDF could add a repeated sidebar/background that was absent from the corresponding uploaded source page.
- The native regression renders a long uploaded-layout resume across three pages and verifies page-2/page-3 continuation profiles. Separate unit coverage verifies both repeatable and deliberately page-specific continuation contracts.
- Final validation passed: 27/27 Jest suites, 112/112 tests, generated-PDF regression including 100% uploaded structure/style/graphics fidelity, three-page continuation verification, CMYK normalization, scanned-PDF detection, TypeScript, touched-file ESLint, production Next.js build, and `git diff --check`.
- Production build still reports the pre-existing multi-lockfile/Turbopack-root warning and Node `module.register()` deprecation warning; neither was introduced by this phase.

### Phase 20 - Fidelity Capability Report & Safe Fallback UX

- [x] Add deterministic template capability reporting with preserved, approximated, unsupported, and blocking states
- [x] Report measured structure, page geometry, typography hierarchy, exact-font approximation, verified graphics, and continuation behavior separately
- [x] Detect unsupported raster image/logo operators from the uploaded PDF
- [x] Detect gradients/shading, pattern/special-color operators, and bounded complex vector artwork without attempting unsafe reproduction
- [x] Keep unsupported graphic features informational unless they create a known verification blocker
- [x] Surface the capability report directly in the uploaded-layout editor instead of relying on one opaque fidelity percentage
- [x] Disable verified download when the capability report already knows page-specific continuation artwork is blocking
- [x] Keep preview/editing available when export is blocked so users can inspect the resume or choose another template
- [x] Add real PDF regression for unsupported raster artwork and guard against false-positive unsupported flags on verified dividers/backgrounds
- [x] Run full Jest, generated-PDF, TypeScript, targeted lint, production build, and diff-hygiene validation

#### Cycle 28 implementation notes

- Added `resume-template-capability.service.ts`. The report is deterministic and derives only from the extracted template contract/operator evidence; no LLM is asked to judge visual fidelity.
- Capability items use four explicit states: `preserved`, `approximated`, `unsupported`, and `blocking`. The report summarizes them as `verified`, `limited`, or `blocked`.
- Exact embedded font-family reproduction remains intentionally approximated. PortfolioPilot preserves measured font class and type scale but does not copy embedded font files, avoiding licensing/runtime instability.
- `ResumeTemplateGraphicStyleContract` now records unsupported graphic primitives. PDF.js image operators become `raster-image`; shading operators become `gradient-or-shading`; pattern/special-color operators are recorded separately; significant unrecognized vector paths become `complex-vector-artwork`.
- Unsupported artwork does not silently disappear from the user's mental model anymore. The editor lists the detected limitation and explains that text/layout verification remains available.
- Known page-specific continuation artwork remains a blocking capability because the flowing React-PDF renderer cannot deterministically switch arbitrary artwork by auto-generated page number. The Download PDF action is disabled in that known-blocked state while preview/editing stay available.
- Real generated-PDF regression now proves a text resume containing a raster logo is classified with `raster-image`, while the fully supported uploaded fixture still reports zero unsupported graphic flags.
- Final validation passed: 28/28 Jest suites, 114/114 tests, generated-PDF regression including 100% uploaded structure/style/graphics fidelity, three-page continuation verification, CMYK normalization, unsupported-raster detection, scanned-PDF detection, TypeScript, touched-file ESLint, production Next.js build, and `git diff --check`.
- Production build still reports the pre-existing multi-lockfile/Turbopack-root warning and Node `module.register()` deprecation warning; neither was introduced by this phase.

## 24. Recursive Implementation Loop

After every implementation cycle:

1. Run targeted unit tests.
2. Run TypeScript type-check.
3. Run relevant lint/build checks if bounded execution permits.
4. If passing, mark completed tasks in this document.
5. Record implementation notes and any newly discovered risks.
6. Re-rank remaining tasks by impact, dependency, and regression risk.
7. Implement the next highest-value task.
8. Repeat.

## 25. Current Priority Decision

The next implementation should be **Phase 21 - Template Corpus & Differential Fidelity Benchmarks**.

Reason:

- The pipeline now has deterministic extraction, capability reporting, safe fallbacks, and render verification, but most deep fidelity regression still centers on a small number of controlled layouts.
- The next reliability risk is overfitting: a rule that works for one two-column resume may regress centered single-column, serif, sidebar-heavy, multi-page, or visually minimal resumes.
- A bounded template corpus should exercise structurally different resume families and compare source-contract → rendered-PDF → re-extracted-contract behavior using the same verification services production uses.
- Benchmarks should remain synthetic or sanitized so regression fixtures contain no private resume data.
- Unsupported artwork should continue to be reported rather than forcing the benchmark suite to fake fidelity that PortfolioPilot cannot verify.

## 26. Definition of Done for the Resume/PDF Pipeline

The pipeline is considered robust when:

- the same verified information renders consistently across all templates
- switching templates never changes factual content
- long content paginates instead of overflowing
- unknown terminology is preserved
- non-developer resumes classify correctly
- AI-added factual claims require evidence
- conflicting sources are surfaced rather than silently resolved
- all AI outputs are schema validated
- preview and downloaded PDF match
- preflight reports template fit before download
- automated regression tests cover diverse professions and long/complex resumes
