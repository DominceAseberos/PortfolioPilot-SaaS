# PortfolioPilot Resume Intelligence & PDF Architecture

> Status: Active implementation plan
> Last updated: 2026-08-12
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

The first implementation should be **Phase 1 - Safe PDF layout foundation**.

Reason:

- It has immediate user-visible benefit.
- It does not require replacing the current AI pipeline.
- It reduces overflow and blank-page risk.
- It creates reusable primitives needed by later template intelligence.
- It is testable with deterministic unit tests.
- It has lower regression risk than immediately replacing the resume data model.

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
