---
name: word-system-skill
version: 0.1.0
status: draft
description: Word thesis formatting, structure recognition, rule validation, auto-fix and evaluation skill.
owner: paper-formatter
runtime: node-typescript
inputs:
  - docx
  - ruleProfile
  - schoolProfile
outputs:
  - structureJson
  - warningReport
  - fixReport
  - evaluationReport
permissions:
  - read_docx
  - write_docx
  - read_rules
  - write_reports
dependencies:
  - mammoth
  - docx
  - fast-xml-parser
  - zod
quality_gates:
  - p0_f1_threshold
  - warning_valid_rate
  - regression_pass
cost_tracking:
  enabled: true
---

# Word System Skill

## 1. Purpose

Build a verifiable Word thesis formatting system for structure recognition, rule validation, automatic repair planning, and regression evaluation. The skill treats a thesis as a set of identifiable objects: headings, body paragraphs, figures, captions, tables, continuation tables, references, headers, footers, catalog entries, abstracts, keywords, appendix, and acknowledgements.

## 2. When to Use

Use this skill when a task involves `.docx` thesis formatting, school rule matching, GB baseline checks, CAFA rules, object graph recognition, continuation table detection, warning generation, auto-fix planning, or regression scoring.

Do not use it for generic copywriting or PDF-only visual review unless a Word structure model is also required.

## 3. Inputs

- `docx`: Word document path or parsed Word intermediate representation.
- `ruleProfile`: selected user, school, CAFA, GB, or system rule profile.
- `schoolProfile`: school metadata and rule package, including aliases and effective version.

## 4. Outputs

- `structureJson`: normalized thesis object subset.
- `warningReport`: structured warning list with source, evidence, adopted rule, and overridden rules.
- `fixReport`: proposed and executed auto-fix actions.
- `evaluationReport`: JSON and Markdown reports with precision, recall, accuracy, F1, warning valid rate, rule hit rate, fix success rate, and manual override rate.

## 5. Preconditions

- The document must be available as `.docx` or as an equivalent parsed structure.
- Rule sources must identify `ruleSource`, `ruleLevel`, and `priority`.
- No conflict may be silently resolved; every conflict emits a structured warning.
- Any claim about recognition quality must be backed by evaluation output.

## 6. Workflow

1. Parse Word content into paragraphs, tables, images, captions, headers, footers, and object graph hints.
2. Resolve rules by priority: explicit user rule, school rule, CAFA rule, GB standard, system default.
3. Detect thesis objects with evidence and confidence.
4. Validate detected objects against the resolved rules.
5. Emit warnings for conflicts, low confidence, and unsafe auto-fix boundaries.
6. Build fix plans only for fixable rules.
7. Evaluate recognition and repair against expected fixtures.
8. Generate JSON and Markdown reports.

School rule intake workflow:

1. Read an official school template or a verified thesis `.docx`.
2. Extract layout, body style, heading spacing, figure/table caption, reference, and header/footer signals.
3. Compare extracted signals with existing canonical registry matches.
4. Emit candidate rules with confidence and evidence.
5. Write a `draft_from_docx` canonical profile draft.
6. Human review is required before merging the draft into official `canonical-school-profiles`.

School rule approval workflow:

1. Review the generated `*.profile-draft.json`.
2. Run `approve-school-rule-draft.ts` with explicit `--approve`.
3. The script appends the approved seed to `canonical-school-profiles.ts` only when the `schoolId` is not already present.
4. The script copies the source `.docx` into `fixtures/samples`.
5. The script generates an expected regression baseline and updates `sample-manifest.json`.
6. Run the Word System regression script before committing.

## 7. Rule Layer

Rule sources are layered:

- CAFA rules
- School rules
- GB standards
- User custom rules
- System default rules

Priority order is:

1. User explicitly selected rules
2. School rules
3. CAFA rules
4. GB standards
5. System default rules

Each rule must include `ruleId`, `ruleName`, `ruleSource`, `ruleLevel`, `targetObject`, `condition`, `expectedFormat`, `priority`, `conflictPolicy`, `warningCode`, `fixable`, `autoFixStrategy`, and `evidence`.

When rules conflict, the engine records the conflict source, adopted rule, and overridden rules. The overwritten rules are retained in the warning payload.

Continuation table authority follows structure-first scoring:

- Structure signals: `tblHeader`, `tblLook`, `columnCount`, `headerTextHash`, adjacent tables, no non-empty body paragraph between tables, and no new independent caption on the later table.
- Text signals: caption contains `续表`, caption number inherits previous table, caption has no new independent title.
- `continuationConfidence = structureScore * 0.7 + textScore * 0.3`.
- `>= 85`: auto continuation.
- `70-84`: suspected continuation warning.
- `50-69`: low-confidence warning, do not merge automatically.
- `< 50`: normal table.

## 8. Recognition Layer

Recognition outputs are evidence-first. The detectors in `src/` return stable IDs, page and paragraph anchors, confidence, issues, and warnings.

Required detectors:

- Headings: level 1-3, broken headings, manual numbering, style headings, centered headings, TOC pseudo-heading exclusion.
- Body paragraphs: text, style, font, size, line spacing, indent, alignment, empty paragraphs, soft returns, tab indent.
- Figures: inline, floating, anchored, watermark/background exclusion, seal/complex layer tags, figure-caption binding.
- Tables: ordinary tables, cross-page tables, continuation tables, merged cells, header rows, captions, numbering, style.
- References: reference section, item index, GB/T 7714 tendency, hanging indent, punctuation, Chinese/English entries, URL/DOI.
- Headers and footers: section, page, text, page number, section breaks, odd/even differences, first-page special mode.

## 9. Evaluation Layer

The thesis object subset is the minimum object set that can be recognized, extracted, validated, repaired, and regression-tested.

P0 object subset: headings, body paragraphs, figures, figure captions, tables, table captions, continuation tables, references, headers/footers, and catalog.

P1 object subset: abstract, keywords, formulas, notes, appendix, acknowledgements, and cover fields.

P2 object subset: floating layers, watermarks, seals, merged cells, multi-column layout, section breaks, complex numbering, and abnormal styles.

Metrics:

- `precision = truePositive / predictedPositive`
- `recall = truePositive / actualPositive`
- `accuracy = correctDecision / totalDecision`
- `f1 = 2 * precision * recall / (precision + recall)`
- `warningValidRate = validWarning / totalWarning`
- `ruleHitRate = matchedRule / totalRule`
- `fixSuccessRate = successfulFix / attemptedFix`
- `manualOverrideRate = manualOverrideCount / totalDecision`

P0 release thresholds:

- Heading F1 >= 98%
- Body F1 >= 96%
- Figure F1 >= 95%
- Figure caption F1 >= 96%
- Table F1 >= 97%
- Continuation table F1 >= 92%
- Reference F1 >= 95%
- Header/footer F1 >= 98%
- Catalog F1 >= 98%
- Auto-fix success rate >= 95%
- Warning valid rate >= 90%
- Manual override rate <= 10%

## 10. Warning Protocol

Warnings are structured. A warning is not a string. It must contain an ID, warning code, severity, message, source, evidence, and recovery action.

Rules that conflict produce `RULE_CONFLICT`. Continuation table ambiguity produces `CONTINUATION_AMBIGUOUS`. Low confidence recognition produces `LOW_CONFIDENCE_RECOGNITION`.

## 11. Auto Fix Protocol

Only `fixable=true` rules may produce auto-fix actions. Auto-fix must preserve original content unless the rule explicitly permits rewriting. Unsafe or ambiguous cases become manual-review warnings.

Auto-fix strategy values:

- `style_update`
- `numbering_update`
- `caption_reposition`
- `table_continuation_merge`
- `reference_format_update`
- `header_footer_update`
- `manual_review`

## 12. Regression Test Protocol

Regression fixtures live under `fixtures/word-system` or the skill-local `fixtures/` directory.

Each expected JSON includes metadata, expected headings, paragraphs, figures, tables, continuation tables, references, headers/footers, and warnings.

The minimum regression matrix covers:

- Heading hierarchy recognition
- Body style recognition
- Figure-caption binding
- Table-caption binding
- Continuation table recognition
- Reference recognition
- Header/footer recognition
- Warning output
- Rule conflict handling
- Auto-fix result
- Before/after diff

School rule intake regression must cover:

- Real `.docx` sample can generate candidate rules.
- Draft profile contains `rulesJson` and `styleMap`.
- Low confidence candidates are marked for review, not silently promoted.
- Generated draft is not written into official backend seeds automatically.
- Approved drafts require explicit `--approve`, create a regression fixture, and remain test-gated.

## 13. Quality Gates

- `p0_f1_threshold`: P0 object subset metrics must meet the threshold table.
- `warning_valid_rate`: structured warnings must be valid and useful.
- `regression_pass`: unit and regression tests must pass.
- `schema_valid`: structure, rule, warning, and evaluation outputs must validate against schemas.

## 14. Failure Modes

- `RULE_CONFLICT_UNRESOLVED`: Conflict exists but no adopted rule is marked.
- `OBJECT_ANCHOR_MISSING`: A detected object lacks a stable paragraph or page anchor.
- `CONTINUATION_LOW_CONFIDENCE`: Continuation evidence is insufficient for automatic merge.
- `AUTO_FIX_UNSAFE`: Fix would delete content, move objects outside the page, or alter thesis meaning.
- `EVALUATION_THRESHOLD_FAILED`: One or more P0 metrics fall below release threshold.

## 15. Handoff Protocol

Handoff to parser engineering when object anchors are missing. Handoff to rule authoring when a school rule cannot be represented with the current schema. Handoff to review UI when a finding requires manual confirmation. Handoff to QA when thresholds fail or warning validity drops below the release bar.
