# Remaining Worktree Inventory

Source: `/tmp/remaining-status.txt`

Scope: classify remaining modified and untracked paths only. This inventory does not stage, commit, or change business code.

Legend:

- Recommendation: `commit` = likely intentional and should be reviewed for commit; `ignore` = likely local/generated; `defer` = keep out of current phase; `inspect` = needs owner review before decision.
- Phase: `Phase 2` = likely belongs to next finding-centric integration/UI phase; `Pause` = should be held back from Phase 1; `Phase 1` = likely data-contract/supporting baseline.

## A. Infrastructure / Deployment

| Status | Path | Recommendation | Phase marker | Notes |
|---|---|---|---|---|
| M | `.github/workflows/ci.yml` | inspect | Pause | CI changes can affect all lanes; review separately before including. |
| M | `paper-formatter/docker-compose.yml` | inspect | Pause | Deployment/runtime change, outside current Phase 1 data contract. |
| ?? | `paper-formatter/.env.production.example` | commit | Pause | Production env template, useful for deployment phase after review. |
| ?? | `paper-formatter/.gitignore` | commit | Pause | Repo hygiene; verify it does not hide required source files. |
| ?? | `paper-formatter/.vscode/` | inspect | Pause | Local/editor config; decide team policy before commit. |
| ?? | `paper-formatter/Makefile` | commit | Pause | Developer/deploy workflow entrypoint; review targets. |
| ?? | `paper-formatter/README.md` | commit | Pause | Project documentation; not part of current data-contract gate. |
| ?? | `paper-formatter/deploy/` | inspect | Pause | Deployment assets should be reviewed as a separate deployment batch. |
| ?? | `paper-formatter/docker-compose.prod.yml` | commit | Pause | Production compose file; review together with deployment docs. |
| ?? | `paper-formatter/services/api-gateway/.env.example` | commit | Pause | Backend env template; review for secret safety. |
| ?? | `paper-formatter/services/api-gateway/Dockerfile` | commit | Pause | Backend containerization; deployment phase. |
| ?? | `paper-formatter/services/api-gateway/package-lock.json` | inspect | Pause | Dependency lock; commit only with matching package.json review. |
| ?? | `paper-formatter/services/api-gateway/package.json` | inspect | Pause | Backend package scripts/deps; not current Phase 1 scope. |
| ?? | `paper-formatter/services/api-gateway/tsconfig.json` | commit | Pause | Backend TypeScript config; review with API gateway batch. |
| ?? | `paper-formatter/services/client/.gitignore` | commit | Pause | Client repo hygiene. |
| ?? | `paper-formatter/services/client/README.md` | commit | Pause | Client documentation. |
| ?? | `paper-formatter/services/client/eslint.config.js` | inspect | Pause | Lint config can change quality gates; review separately. |
| ?? | `paper-formatter/services/client/index.html` | commit | Pause | Client app shell; likely required for app baseline. |
| ?? | `paper-formatter/services/client/package-lock.json` | inspect | Pause | Dependency lock; commit with package.json only after review. |
| ?? | `paper-formatter/services/client/package.json` | inspect | Pause | Client scripts/deps; changing test scope should be deliberate. |
| ?? | `paper-formatter/services/client/playwright.config.ts` | inspect | Phase 2 | Behavior/visual test config likely belongs to UI validation phase. |
| ?? | `paper-formatter/services/client/public/` | inspect | Pause | Static assets; inspect for generated or large files. |
| ?? | `paper-formatter/services/client/tsconfig.app.json` | commit | Pause | Client TS config; review with client baseline. |
| ?? | `paper-formatter/services/client/tsconfig.json` | commit | Pause | Client TS config; review with client baseline. |
| ?? | `paper-formatter/services/client/tsconfig.node.json` | commit | Pause | Client TS config; review with client baseline. |
| ?? | `paper-formatter/services/client/vite.config.ts` | commit | Pause | Build config; review with client baseline. |
| ?? | `paper-formatter/test-batch.sh` | inspect | Pause | Local batch test helper; decide if should be formalized. |
| ?? | `paper-formatter/test-client.html` | inspect | Pause | Local manual test artifact; likely defer or ignore. |

## B. API Gateway Backend

| Status | Path | Recommendation | Phase marker | Notes |
|---|---|---|---|---|
| M | `paper-formatter/services/api-gateway/src/db.ts` | inspect | Phase 1 | DB access boundary; review against canonical document/finding contract. |
| M | `paper-formatter/services/api-gateway/src/routes/profiles.ts` | inspect | Pause | Profile route change outside current Phase 1 finding contract. |
| D | `paper-formatter/services/api-gateway/src/services/jobs.ts` | inspect | Pause | Deleted service file; confirm replacement path before committing. |
| ?? | `paper-formatter/packages/shared-types/src/finding-contract.ts` | commit | Phase 1 | Shared finding contract likely belongs to data contract baseline. |
| ?? | `paper-formatter/packages/shared-types/src/job-contract.ts` | commit | Phase 1 | Shared job contract likely belongs to data contract baseline. |
| ?? | `paper-formatter/services/api-gateway/src/config.ts` | commit | Pause | Backend config surface; review with deployment/API batch. |
| ?? | `paper-formatter/services/api-gateway/src/dto/` | commit | Phase 1 | DTO split appears aligned with data-contract work; inspect contents before commit. |
| ?? | `paper-formatter/services/api-gateway/src/index.ts` | commit | Pause | API entrypoint; backend baseline, not current test-boundary scope. |
| ?? | `paper-formatter/services/api-gateway/src/middleware/` | commit | Pause | Middleware baseline; inspect for auth/error behavior. |
| ?? | `paper-formatter/services/api-gateway/src/parser/parse.py` | inspect | Pause | Parser bridge; not Phase 1 finding contract unless used by DTO tests. |
| ?? | `paper-formatter/services/api-gateway/src/redis.ts` | inspect | Pause | Runtime infra dependency; review with deployment/backing services. |
| ?? | `paper-formatter/services/api-gateway/src/repositories/documents.ts` | commit | Phase 1 | Document identity/canonical ID repository likely contract-adjacent. |
| ?? | `paper-formatter/services/api-gateway/src/repositories/jobs.ts` | commit | Phase 1 | Job repository likely contract-adjacent. |
| ?? | `paper-formatter/services/api-gateway/src/repositories/share.ts` | inspect | Pause | Share feature outside finding contract. |
| ?? | `paper-formatter/services/api-gateway/src/routes/analytics.ts` | defer | Pause | Analytics route should not block Phase 1. |
| ?? | `paper-formatter/services/api-gateway/src/routes/documents.ts` | commit | Phase 1 | Document API route likely needed for canonical document flow. |
| ?? | `paper-formatter/services/api-gateway/src/routes/feedback.ts` | defer | Pause | Feedback route outside current finding-centric contract. |
| ?? | `paper-formatter/services/api-gateway/src/routes/findings.ts` | commit | Phase 1 | Finding route belongs to data-contract/API boundary. |
| ?? | `paper-formatter/services/api-gateway/src/routes/jobs.ts` | commit | Phase 1 | Job route belongs to contract/API boundary. |
| ?? | `paper-formatter/services/api-gateway/src/routes/share.ts` | defer | Pause | Share route outside current finding contract. |
| ?? | `paper-formatter/services/api-gateway/src/schemas/` | commit | Phase 1 | Request/response schemas likely contract baseline. |
| ?? | `paper-formatter/services/api-gateway/src/services/job-orchestrator.ts` | commit | Phase 1 | Orchestrator naming and command contract likely belongs to Phase 1 backend boundary. |
| ?? | `paper-formatter/services/api-gateway/src/storage.ts` | inspect | Pause | Storage adapter; verify no download-guard side effects before commit. |
| ?? | `paper-formatter/services/api-gateway/tests/documents-routes.test.ts` | commit | Phase 1 | API integration test for document route. |
| ?? | `paper-formatter/services/api-gateway/tests/finding-document-requests-dto.test.ts` | commit | Phase 1 | DTO parser test aligned with Phase 1. |
| ?? | `paper-formatter/services/api-gateway/tests/findings-routes.test.ts` | commit | Phase 1 | Finding route integration test. |
| ?? | `paper-formatter/services/api-gateway/tests/job-document-requests-dto.test.ts` | commit | Phase 1 | Job DTO parser test aligned with Phase 1. |
| ?? | `paper-formatter/services/api-gateway/tests/jobs-routes.test.ts` | commit | Phase 1 | Job route integration test. |
| ?? | `paper-formatter/services/api-gateway/tests/parser.test.ts` | inspect | Pause | Parser-specific test; review separately. |
| ?? | `paper-formatter/services/api-gateway/tests/profile-share-document-requests-dto.test.ts` | defer | Pause | Profile/share DTO test outside core finding contract. |

## C. Client UI / Product Flow

| Status | Path | Recommendation | Phase marker | Notes |
|---|---|---|---|---|
| M | `paper-formatter/services/client/src/api/client.ts` | inspect | Phase 1 | API client naming boundary may be contract-adjacent; review before commit. |
| M | `paper-formatter/services/client/src/components/AppFrame.tsx` | inspect | Phase 2 | App state/document identity boundary can affect UI flow; likely next phase. |
| M | `paper-formatter/services/client/src/components/RulesModal.tsx` | defer | Pause | UI copy/modal polish; not Phase 1. |
| M | `paper-formatter/services/client/src/screens/Step1Upload.tsx` | defer | Phase 2 | Upload interaction bug/polish belongs to product-flow phase. |
| M | `paper-formatter/services/client/src/screens/Step2Profile.tsx` | defer | Phase 2 | Profile UI decomposition/polish belongs to product-flow phase. |
| ?? | `paper-formatter/services/client/remei-biz-prompts/` | inspect | Pause | Prompt assets; inspect ownership before commit. |
| ?? | `paper-formatter/services/client/remei-prompts/` | inspect | Pause | Prompt assets; inspect ownership before commit. |
| ?? | `paper-formatter/services/client/src/App.tsx` | commit | Phase 2 | Main app flow; review with UI phase. |
| ?? | `paper-formatter/services/client/src/api/analytics.ts` | defer | Pause | Analytics client outside current finding contract. |
| ?? | `paper-formatter/services/client/src/components/BaseStandardSelector.tsx` | defer | Phase 2 | Step2 component extraction. |
| ?? | `paper-formatter/services/client/src/components/ChangesView.tsx` | defer | Phase 2 | Diff/review UI. |
| ?? | `paper-formatter/services/client/src/components/Common.tsx` | inspect | Phase 2 | Shared UI primitives; review for broad impact. |
| ?? | `paper-formatter/services/client/src/components/DeliveryHeader.tsx` | defer | Phase 2 | Step5/6 product flow UI. |
| ?? | `paper-formatter/services/client/src/components/DetectionBanner.tsx` | defer | Phase 2 | Step2 UI extraction. |
| ?? | `paper-formatter/services/client/src/components/DiffPage.tsx` | defer | Phase 2 | Diff UI. |
| ?? | `paper-formatter/services/client/src/components/DiffToolbar.tsx` | defer | Phase 2 | Diff UI. |
| ?? | `paper-formatter/services/client/src/components/DraftProfileCard.tsx` | defer | Phase 2 | Profile/product UI. |
| ?? | `paper-formatter/services/client/src/components/ExportConfirmCard.tsx` | defer | Phase 2 | Step5/6 CTA flow. |
| ?? | `paper-formatter/services/client/src/components/ExportConfirmDialog.tsx` | defer | Phase 2 | Step5/6 CTA flow. |
| ?? | `paper-formatter/services/client/src/components/ExportOverlay.tsx` | defer | Phase 2 | Export UI. |
| ?? | `paper-formatter/services/client/src/components/FixBottomBar.tsx` | defer | Phase 2 | Step4 repair UI. |
| ?? | `paper-formatter/services/client/src/components/FixInfoCard.tsx` | defer | Phase 2 | Step4 repair UI. |
| ?? | `paper-formatter/services/client/src/components/FixPaywallCard.tsx` | defer | Pause | Paywall/upgrade edge; not core finding contract. |
| ?? | `paper-formatter/services/client/src/components/FixStepRow.tsx` | defer | Phase 2 | Step4 repair UI. |
| ?? | `paper-formatter/services/client/src/components/FixSummaryCard.tsx` | defer | Phase 2 | Step4/Step5 summary UI. |
| ?? | `paper-formatter/services/client/src/components/FixTimeline.tsx` | defer | Phase 2 | Step4 runtime playback UI. |
| ?? | `paper-formatter/services/client/src/components/MetricsCard.tsx` | defer | Pause | Metrics UI; not finding-centric core. |
| ?? | `paper-formatter/services/client/src/components/ParseResults.tsx` | defer | Phase 2 | Step3 result UI. |
| ?? | `paper-formatter/services/client/src/components/ParseTimeline.tsx` | defer | Phase 2 | Step3 runtime UI. |
| ?? | `paper-formatter/services/client/src/components/PenCursor.tsx` | defer | Phase 2 | Repair animation UI. |
| ?? | `paper-formatter/services/client/src/components/PrintPreviewModal.tsx` | defer | Phase 2 | Export/preview UI. |
| ?? | `paper-formatter/services/client/src/components/ProfileField.tsx` | defer | Phase 2 | Step2 component extraction. |
| ?? | `paper-formatter/services/client/src/components/ProfileSelectionPanel.tsx` | defer | Phase 2 | Step2 component extraction. |
| ?? | `paper-formatter/services/client/src/components/RulePanel.tsx` | defer | Phase 2 | Rule UI; should later subscribe to finding ruleId. |
| ?? | `paper-formatter/services/client/src/components/SchoolListItem.tsx` | defer | Phase 2 | Step2 component extraction. |
| ?? | `paper-formatter/services/client/src/components/SelectedProfileSummary.tsx` | defer | Phase 2 | Step2 component extraction. |
| ?? | `paper-formatter/services/client/src/components/ShareModal.tsx` | defer | Pause | Share edge-touchpoint copy/UI. |
| ?? | `paper-formatter/services/client/src/components/Sidebar.tsx` | defer | Phase 2 | Product navigation UI. |
| ?? | `paper-formatter/services/client/src/components/StructPanel.tsx` | defer | Phase 2 | Step3/structure UI. |
| ?? | `paper-formatter/services/client/src/components/TopBar.tsx` | defer | Phase 2 | Global navigation UI. |
| ?? | `paper-formatter/services/client/src/components/WarningCard.tsx` | defer | Phase 2 | Shared UI warning component. |
| ?? | `paper-formatter/services/client/src/components/fix-runtime/` | defer | Phase 2 | Step4 runtime decomposition. |
| ?? | `paper-formatter/services/client/src/components/review-workbench/` | defer | Phase 2 | Finding-centric review UI workbench. |
| ?? | `paper-formatter/services/client/src/hooks/` | inspect | Phase 2 | Hooks may include runtime/focus behavior; inspect before commit. |
| ?? | `paper-formatter/services/client/src/index.css` | defer | Phase 2 | Visual system/CSS; review with screenshots. |
| ?? | `paper-formatter/services/client/src/main.tsx` | commit | Phase 2 | Client entrypoint; likely required for app baseline. |
| ?? | `paper-formatter/services/client/src/mock/` | inspect | Phase 2 | Mock paper/finding data; useful but verify no large fixtures. |
| ?? | `paper-formatter/services/client/src/screens/Step3Parse.tsx` | defer | Phase 2 | Step3 runtime/product flow. |
| ?? | `paper-formatter/services/client/src/screens/Step4Diff.tsx` | defer | Phase 2 | Step4/5 review boundary and finding-centric migration. |
| ?? | `paper-formatter/services/client/src/screens/Step4Fix.tsx` | defer | Phase 2 | Step4 repair runtime UI. |
| ?? | `paper-formatter/services/client/src/screens/step4-diff/` | defer | Phase 2 | Step4Diff decomposition. |
| ?? | `paper-formatter/services/client/src/screens/step4-fix/` | defer | Phase 2 | Step4Fix decomposition. |
| ?? | `paper-formatter/services/client/src/stores/` | inspect | Phase 1 | Review/finding store may be Phase 1 contract-adjacent; inspect before commit. |
| ?? | `paper-formatter/services/client/src/test-support/` | inspect | Phase 2 | UI test helpers. |
| ?? | `paper-formatter/services/client/test-p0-1.mjs` | inspect | Pause | Local/manual test script; decide whether formal. |
| ?? | `paper-formatter/services/client/test-p0-2.mjs` | inspect | Pause | Local/manual test script; decide whether formal. |
| ?? | `paper-formatter/services/client/test-p1.mjs` | inspect | Pause | Local/manual test script; decide whether formal. |
| ?? | `paper-formatter/services/client/test-results/` | ignore | Pause | Generated Playwright/test output should usually be ignored. |
| ?? | `paper-formatter/services/client/tests/helpers/` | commit | Phase 2 | Behavior/visual test helpers. |
| ?? | `paper-formatter/services/client/tests/step1-upload.spec.ts` | commit | Phase 2 | Upload behavior regression. |
| ?? | `paper-formatter/services/client/tests/step4-flow.spec.ts` | commit | Phase 2 | Step4 flow behavior regression. |
| ?? | `paper-formatter/services/client/tests/step5-visual.spec.ts` | commit | Phase 2 | Step5 visual baseline test. |
| ?? | `paper-formatter/services/client/tests/step5-visual.spec.ts-snapshots/` | inspect | Phase 2 | Visual snapshots; commit only if baseline is approved. |

## D. Agent / Skills / Orchestration

| Status | Path | Recommendation | Phase marker | Notes |
|---|---|---|---|---|
| M | `.claude/skills/hooks-automation/SKILL.md` | inspect | Pause | Agent skill change; review separately from product code. |
| M | `.claude/skills/pair-programming/SKILL.md` | inspect | Pause | Agent skill change; review separately. |
| M | `.claude/skills/ruflo-project-orchestration-skill/SKILL.md` | inspect | Pause | Orchestration skill change; review separately. |
| M | `.claude/skills/skill-builder/SKILL.md` | inspect | Pause | Skill authoring change; review separately. |
| M | `.claude/skills/sparc-methodology/SKILL.md` | inspect | Pause | Methodology skill change; review separately. |
| M | `.claude/skills/stream-chain/SKILL.md` | inspect | Pause | Workflow skill change; review separately. |
| M | `.claude/skills/swarm-advanced/SKILL.md` | inspect | Pause | Swarm orchestration skill change; review separately. |
| M | `.claude/skills/swarm-orchestration/SKILL.md` | inspect | Pause | Swarm orchestration skill change; review separately. |
| M | `.claude/skills/verification-quality/SKILL.md` | inspect | Pause | Verification skill change; review separately. |
| M | `AGENTS.md` | inspect | Pause | Top-level execution governance changed; needs manual review. |
| ?? | `.agents/` | inspect | Pause | Agent metadata/skills; review contents and ownership. |
| ?? | `.claude/skills/governance-memory-skill/` | inspect | Pause | New governance skill; review before commit. |
| ?? | `.codex/` | ignore | Pause | Local Codex state usually should not be committed unless intentionally configured. |
| ?? | `docs/audit/` | commit | Phase 1 | Audit artifacts; inspect generated docs and commit as governance evidence. |
| ?? | `paper-formatter/AGENTS.md` | commit | Pause | Project-specific execution guidance; review with governance docs. |
| ?? | `paper-formatter/docs/api-spec.md` | commit | Pause | Product/API documentation. |
| ?? | `paper-formatter/docs/client-implementation.md` | commit | Pause | Client implementation documentation. |
| ?? | `paper-formatter/docs/coding-baseline-v2.md` | commit | Phase 1 | Coding baseline may support architecture governance. |
| ?? | `paper-formatter/docs/coding-baseline.md` | commit | Phase 1 | Coding baseline may support architecture governance. |
| ?? | `paper-formatter/docs/system-architecture.md` | commit | Phase 1 | Architecture documentation likely supports finding-centric baseline. |

## E. Unknown / Need Manual Review

| Status | Path | Recommendation | Phase marker | Notes |
|---|---|---|---|---|
| M | `paper-formatter/services/formatter/app.py` | inspect | Pause | Formatter service behavior change; inspect diff before categorizing. |
| M | `paper-formatter/services/formatter/docx_formatter.py` | inspect | Pause | DOCX formatter behavior change; high-risk output path. |
| ?? | `paper-formatter/batch-results/` | ignore | Pause | Likely generated batch artifacts; inspect before deleting/ignoring. |
| ?? | `paper-formatter/services/docx-parser/` | inspect | Pause | Separate parser service; ownership and phase unclear. |

## Phase 2 Candidates

Likely Phase 2 paths:

- `paper-formatter/services/client/src/components/review-workbench/`
- `paper-formatter/services/client/src/screens/Step4Diff.tsx`
- `paper-formatter/services/client/src/screens/step4-diff/`
- `paper-formatter/services/client/src/screens/Step4Fix.tsx`
- `paper-formatter/services/client/src/screens/step4-fix/`
- `paper-formatter/services/client/src/components/fix-runtime/`
- `paper-formatter/services/client/src/stores/`
- `paper-formatter/services/client/tests/step1-upload.spec.ts`
- `paper-formatter/services/client/tests/step4-flow.spec.ts`
- `paper-formatter/services/client/tests/step5-visual.spec.ts`

## Should Be Paused / Held Back

Hold back from Phase 1 commit until separately reviewed:

- Deployment/runtime infrastructure: Docker, CI, env, deploy directory.
- Agent/skill/governance changes under `.claude/`, `.agents/`, `.codex/`.
- Formatter/parser service changes under `paper-formatter/services/formatter/` and `paper-formatter/services/docx-parser/`.
- Generated or local artifacts: `batch-results/`, `test-results/`, local `.mjs` scripts.
- UI polish and CTA flow files that belong to Phase 2 rather than Phase 1 data contract.
