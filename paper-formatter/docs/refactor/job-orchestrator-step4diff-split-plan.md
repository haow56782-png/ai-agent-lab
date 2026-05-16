# Job Orchestrator / Step4Diff Split Plan

## 1. Scope

This plan covers the two largest active business files:

| File | Current size | Primary risk |
|---|---:|---|
| `services/api-gateway/src/services/job-orchestrator.ts` | 964 lines | Job lifecycle, parser, formatter, rule detection, fix artifacts, and persistence are mixed in one service. |
| `services/client/src/screens/Step4Diff.tsx` | 908 lines | Finding data adaptation, store sync, keyboard behavior, download gating, modal state, and rendering are mixed in one page. |

The split must be incremental. Do not rewrite behavior. Each slice should preserve public API contracts and existing UI behavior.

---

## 2. Naming Baseline

Use one authoritative name for each business concept.

| Concept | Canonical name | Do not introduce |
|---|---|---|
| Legacy uploaded document id | `legacyDocId` | `docId` for commands, `id`, `documentId` when legacy-only |
| Canonical document id | `canonicalDocumentId` | `docId` when UUID canonical is meant |
| Analyze job id | `analyzeJobId` | generic `jobId` in client state unless local function scope is job-agnostic |
| Format job id | `formatJobId` | generic `jobId` for format-specific flow |
| Fix job id | `fixJobId` | generic `jobId` for fix-specific flow |
| Finding identifier | `findingId` / `finding_id` at API boundary | `reviewItemId`, `uiId`, `cardId` as business identity |
| Canonical school rule id | `canonicalRuleId` | `rule`, `mappedId`, `targetId` |
| Detector rule id | `detectorRuleId` | `legacyRuleId`, `sourceRule` |

No new `data`, `item`, `temp`, `flag` names in extracted code. Use domain nouns.

---

## 3. Backend Split Plan: `job-orchestrator.ts`

### Current responsibilities

1. Public job creation: `startAnalyzeJob`, `startFormatJob`, `startFixJob`.
2. Document resolution and storage download.
3. Python parser temp-file execution.
4. Object graph extraction and fallback.
5. Analyze rule detection, canonical mapping, finding creation, rule snapshots.
6. No-profile auto format issue generation.
7. Formatter HTTP call and multipart parsing.
8. Fix source context, fix event/artifact construction, fix progress JSON.
9. Output upload and report persistence.
10. Profile usage tracking.

### Target module boundary

```text
services/api-gateway/src/services/jobs/
  job-service.ts                  # public startAnalyzeJob/startFormatJob/startFixJob facade
  job-progress-writer.ts          # typed job update helpers
  document-loader.ts              # resolve document + download upload buffer
  analyze-job-runner.ts           # processAnalyzeJob orchestration only
  format-job-runner.ts            # processFormatJob orchestration only
  fix-job-runner.ts               # processFixJob orchestration only
  formatter-client.ts             # callFormatterService
  fix-source-context.ts           # getFixSourceContext + source snippet/chapter selection
  fix-artifact-builder.ts         # FIX_SUMMARIES, FIX_ARTIFACT_DETAILS, makeFixArtifact
  no-profile-format-evaluator.ts  # buildAutoFormatIssues
  parser-runner.ts                # runPythonParser temp-file wrapper
```

Keep `services/api-gateway/src/services/job-orchestrator.ts` as a compatibility facade during migration:

```ts
export { startAnalyzeJob, startFormatJob, startFixJob, FIX_FREE_LIMIT, SUPPORTED_FIX_TYPES } from './jobs/job-service.js';
```

### Slice B1: Extract parser and document loading

Move:

- `DOCX_PARSER_SCRIPT`
- `TEMP_DIR`
- `ensureTempDir`
- `runPythonParser`
- `resolveDocument`
- upload buffer loading pattern

Target files:

- `services/api-gateway/src/services/jobs/parser-runner.ts`
- `services/api-gateway/src/services/jobs/document-loader.ts`

Acceptance:

- Analyze, format, and fix still load the same `DocumentRecord` and buffer.
- No API route change.
- Tests: `npm test -- --run tests/jobs-routes.test.ts tests/parser.test.ts`.

### Slice B2: Extract formatter client

Move:

- `FORMATTER_URL`
- `callFormatterService`
- formatter context serialization
- multipart fallback handling

Target file:

- `services/api-gateway/src/services/jobs/formatter-client.ts`

Acceptance:

- `processFormatJob` and `processFixJob` share the same client.
- Finding context serialization keeps `finding_id`, `rule_id`, `rule_group`, `rule_text`, `rule_description`, `evidence_snapshot`.
- Tests: formatter/fix related route tests and `npm run build`.

### Slice B3: Extract analyze runner internals

Move analyze-only helpers into:

- `analyze-job-runner.ts`
- `no-profile-format-evaluator.ts`

Keep `runFormatRuleDetectors`, canonical mapping, finding builder, and snapshot writer wired in runner, but runner should read as:

```ts
load document -> parse -> build object graph -> detect rules -> persist findings -> write snapshots -> complete job
```

Acceptance:

- `processAnalyzeJob` equivalent stays under 180 lines.
- `buildAutoFormatIssues` no longer lives in the orchestrator facade.
- Tests: `tests/analyze-job-regression.test.ts`, `tests/format-rule-detectors.test.ts`, `tests/rule-sets.test.ts`.

### Slice B4: Extract fix runtime builders

Move:

- `FIX_SUMMARIES`
- `FIX_ARTIFACT_DETAILS`
- `makeFixEvent`
- `getFixSourceContext`
- `pickSourceLine`
- `makeFixArtifact`

Target files:

- `fix-source-context.ts`
- `fix-artifact-builder.ts`

Acceptance:

- Fix runner keeps finding/action progress semantics unchanged.
- No generic `item` naming in extracted builders.
- Tests: `tests/jobs-routes.test.ts`, client `step4-fix-runtime-adapter.spec.ts` if needed.

### Slice B5: Final facade cleanup

Move public starts into `job-service.ts`; keep old import path re-exporting.

Acceptance:

- `job-orchestrator.ts` becomes a compatibility export file under 40 lines.
- Routes importing `job-orchestrator.ts` do not need immediate changes.
- `npm run build` passes.

---

## 4. Frontend Split Plan: `Step4Diff.tsx`

### Current responsibilities

1. Build review items from formatter diffs, findings, or legacy rule groups.
2. Convert review items to finding contracts.
3. Hydrate review store and sync server findings.
4. Fetch diff result.
5. Persist accept/reject/self-edit actions.
6. Keyboard shortcuts.
7. P1 exemption modal state and validation.
8. Export filename and format job creation.
9. Banner/footer derived copy.
10. Render all modals and three-column workbench.

### Target module boundary

```text
services/client/src/screens/step4-diff/
  Step4DiffPage.tsx                  # layout only, replaces large page body
  useStep4DiffDataSource.ts          # diff fetch + server findings fetch
  useStep4FindingViewModel.ts        # canonical findings -> review-store findings
  useStep4FindingPersistence.ts      # syncFindings + disposition persistence
  useStep4KeyboardShortcuts.ts       # Enter/Esc/arrows/PageUp/PageDown/Cmd shortcuts
  useStep4ExportFlow.ts              # export file name + format job creation
  useP1ExemptionFlow.ts              # exemption modal state + validation
  diffBannerViewModel.ts             # banner derived state/copy
  diffFooterViewModel.ts             # footer derived state/download guard view
  findingIdentity.ts                 # toStableFindingId and rule id fallback helpers
```

Keep `services/client/src/screens/Step4Diff.tsx` as the route-level shell until the split finishes.

### Slice F1: Extract identity helpers

Move:

- `toContractRuleId`
- `toStableFindingId`

Target:

- `services/client/src/screens/step4-diff/findingIdentity.ts`

Acceptance:

- No behavior change.
- Tests: existing `step4-flow.spec.ts` canonical finding id cases.

### Slice F2: Extract data source hook

Move:

- `diffResult` state and `api.getDiff(formatJobId)` effect
- `serverFindings` state and `api.listFindings(...)` effect

Target:

- `useStep4DiffDataSource.ts`

Hook input names:

```ts
analyzeJobId
formatJobId
canonicalDocumentId
parseResultFindingCount
showToast
```

Hook output names:

```ts
diffResult
serverFindings
```

Acceptance:

- No `cards[0]` or implicit fallback in hook.
- No generic `items` return name.
- Tests: `step4-flow.spec.ts` hash/finding behavior.

### Slice F3: Extract finding view model

Move:

- `canonicalFindings`, `ruleGroups`, `formatterFindingDiffs`, `reviewItems`, `paperPages`, `findings`, `effectiveFindings` derivation.

Target:

- `useStep4FindingViewModel.ts`

Hook output should use explicit names:

```ts
paperPages
reviewFindings
effectiveFindings
pendingFindings
severityBuckets
allRuleRows
```

Acceptance:

- `focusFindingId` remains store SSOT; no independent `currentPage` introduced.
- Finding identity remains canonical `finding_id` first.
- Tests: `step4-flow.spec.ts` canonical finding id, canvas anchors, hash restore.

### Slice F4: Extract persistence hook

Move:

- `shouldPersistFindings`
- `api.syncFindings(...)` effect
- `persistFindingDisposition`

Target:

- `useStep4FindingPersistence.ts`

Acceptance:

- Server state sync does not overwrite local user choices.
- Function names must be action-specific: `persistFindingDisposition`, not `saveData`.
- Tests: Step5 persistence/restore tests already covering related state should stay green.

### Slice F5: Extract keyboard shortcuts

Move window keydown effect into:

- `useStep4KeyboardShortcuts.ts`

Inputs must be refs or stable callbacks:

```ts
focusFindingIdRef
findingsRef
pendingFindingCount
isDownloadAllowed
openExport
openAcceptAllConfirm
persistFindingDisposition
```

Acceptance:

- Enter accepts, Esc rejects, arrows switch finding, Cmd/Ctrl+Enter accept-all, Cmd/Ctrl+S export.
- Tests: `step4-flow.spec.ts` and Step5 keyboard accessibility tests.

### Slice F6: Extract export and P1 exemption flows

Move:

- export filename state
- `buildDefaultExportFileName`
- `openExport`
- `doExport`
- P1 exemption state and `confirmP1Exemption`

Targets:

- `useStep4ExportFlow.ts`
- `useP1ExemptionFlow.ts`

Acceptance:

- P0 cannot be bypassed.
- P1 requires reason and risk acknowledgement.
- Format job creation still uses `analyzeJobId`, `legacyDocId`, and `profileId`.

### Slice F7: Extract modal/layout components

Move modal render blocks into components:

- `AcceptAllConfirmModal.tsx`
- `P1ExemptionModal.tsx`
- route layout can become `Step4DiffPage.tsx`

Acceptance:

- `Step4Diff.tsx` under 220 lines.
- No UI copy duplicated between page and modal components.
- `npm run build` and targeted Playwright pass.

---

## 5. Execution Order

1. B1 parser/document loader extraction.
2. B2 formatter client extraction.
3. F1 identity helper extraction.
4. F2 data source hook extraction.
5. F3 finding view-model hook extraction.
6. B3 analyze runner extraction.
7. B4 fix runtime builder extraction.
8. F4 persistence hook extraction.
9. F5 keyboard hook extraction.
10. F6/F7 export, P1, and modal split.
11. B5 final backend facade cleanup.

This order reduces risk because shared pure helpers move first, then side-effect hooks/runners, then final facade cleanup.

---

## 6. Verification Matrix

| Slice | Required commands |
|---|---|
| Backend B1-B2 | `cd services/api-gateway && npm run build` |
| Backend analyze B3 | `cd services/api-gateway && npm test -- --run tests/analyze-job-regression.test.ts tests/format-rule-detectors.test.ts tests/rule-sets.test.ts` |
| Backend fix B4 | `cd services/api-gateway && npm test -- --run tests/jobs-routes.test.ts tests/job-queries.test.ts` |
| Frontend F1-F3 | `cd services/client && npm run build && npx playwright test tests/step4-flow.spec.ts --reporter=line` |
| Frontend F4-F7 | `cd services/client && npm run build && npx playwright test tests/step4-flow.spec.ts tests/step1-upload.spec.ts --reporter=line` |

---

## 7. Non-goals

- Do not rename public API fields in this refactor.
- Do not change database schema.
- Do not change finding-centric store semantics.
- Do not redesign Step4 UI while splitting.
- Do not remove legacy fallback paths until behavior tests prove canonical paths are complete.

---

## 8. Done Criteria

- `job-orchestrator.ts` is a facade or under 120 lines.
- `Step4Diff.tsx` is a route shell under 220 lines.
- No extracted file exceeds 450 lines in this pass.
- Analyze/format/fix API behavior remains unchanged.
- Step4 finding id, canvas anchor, hash restore, accept/reject, P1 guard, and download flow tests pass.
