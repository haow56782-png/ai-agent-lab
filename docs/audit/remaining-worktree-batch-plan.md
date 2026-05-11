# Remaining Worktree Batch Plan

## Summary

This inventory records the remaining uncommitted work after the following clean batches were committed:

- `76b9ac2 test(client): add Step5 visual baseline CI gate`
- `d8d2b7a feat(api): add document finding and share routes`
- `351e7d8 chore(deploy): add paper formatter production stack`
- `883406a docs(audit): record Step4 finding migration phases`
- `255f5a6 fix(formatter): harden docx upload handling`

The remaining files should not be committed as one mixed batch. They include governance skill rewrites, memory context files, local artifacts, exploratory docs, and scripts.

## A. Skills / Agent Governance

| Path | Status | Recommendation | Reason |
|---|---|---|---|
| `AGENTS.md` | modified | inspect | Contains appended session memory context; should not be committed without deciding whether memory snapshots belong in repository policy files. |
| `.claude/skills/hooks-automation/SKILL.md` | modified | defer | Large protocol rewrite; requires dedicated skill validation. |
| `.claude/skills/pair-programming/SKILL.md` | modified | defer | Large protocol rewrite; requires dedicated skill validation. |
| `.claude/skills/ruflo-project-orchestration-skill/SKILL.md` | modified | defer | Large orchestration contract changes; needs separate review. |
| `.claude/skills/skill-builder/SKILL.md` | modified | defer | Skill authoring contract change; needs separate review. |
| `.claude/skills/sparc-methodology/SKILL.md` | modified | defer | Methodology rewrite; should be its own governance commit. |
| `.claude/skills/stream-chain/SKILL.md` | modified | defer | Workflow skill change; should be validated separately. |
| `.claude/skills/swarm-advanced/SKILL.md` | modified | defer | Swarm protocol changes; needs separate review. |
| `.claude/skills/swarm-orchestration/SKILL.md` | modified | defer | Swarm protocol changes; needs separate review. |
| `.claude/skills/verification-quality/SKILL.md` | modified | defer | Verification system changes; needs dedicated validation. |
| `.claude/skills/governance-memory-skill/` | untracked | inspect | New skill; should be reviewed with the broader governance skill batch. |
| `.agents/` | untracked | inspect | Mirrors or exports skill assets; decide whether repository should track this duplicate skill root. |
| `.codex/` | untracked | ignore | Local Codex state/config should not be committed unless a specific project-level config is intentionally created. |

## B. Paper Formatter Docs

| Path | Status | Recommendation | Reason |
|---|---|---|---|
| `paper-formatter/AGENTS.md` | untracked | inspect | Includes memory context plus coding baseline notes; decide whether to keep a project-local AGENTS file without volatile memory. |
| `paper-formatter/docs/api-spec.md` | untracked | commit-next | Useful project documentation; should be reviewed for alignment with current API route paths first. |
| `paper-formatter/docs/client-implementation.md` | untracked | inspect | Contains older implementation plan; may be stale after Step4/Step5 finding-centric work. |
| `paper-formatter/docs/coding-baseline-v2.md` | untracked | commit-next | Active coding baseline referenced by project notes; good candidate for a docs-only commit. |
| `paper-formatter/docs/coding-baseline.md` | untracked | commit-next | Legacy baseline with pointer to v2; can go with v2 if reviewed. |
| `paper-formatter/docs/system-architecture.md` | untracked | inspect | Architecture doc may predate current implementation; review before committing. |

## C. Client Adjacent Artifacts

| Path | Status | Recommendation | Reason |
|---|---|---|---|
| `paper-formatter/services/client/README.md` | untracked | defer | Vite template README; should be replaced with project-specific client README before commit. |
| `paper-formatter/services/client/eslint.config.js` | untracked | inspect | Lint config is useful, but CI does not run lint yet; add in a dedicated lint gate batch. |
| `paper-formatter/services/client/remei-biz-prompts/` | untracked | defer | Product prompt drafts; not required for CI/runtime. |
| `paper-formatter/services/client/remei-prompts/` | untracked | defer | Product prompt drafts; not required for CI/runtime. |
| `paper-formatter/services/client/test-p0-1.mjs` | untracked | defer | Manual test script; needs purpose and owner before tracking. |
| `paper-formatter/services/client/test-p0-2.mjs` | untracked | defer | Manual test script; needs purpose and owner before tracking. |
| `paper-formatter/services/client/test-p1.mjs` | untracked | defer | Manual test script; needs purpose and owner before tracking. |
| `paper-formatter/services/client/test-results/` | untracked | ignore | Playwright runtime artifact; should remain untracked. |

## D. Parser / Batch Artifacts

| Path | Status | Recommendation | Reason |
|---|---|---|---|
| `paper-formatter/services/docx-parser/` | untracked | inspect | Potentially separate parser service; needs architectural decision before adding. |
| `paper-formatter/test-batch.sh` | untracked | inspect | Useful operational script, but references local files and live services; should be cleaned before commit. |
| `paper-formatter/test-client.html` | untracked | defer | Manual demo page; likely superseded by React client. |
| `paper-formatter/batch-results/` | untracked | ignore | Generated batch run outputs; should not be committed. |

## E. Local Editor / Runtime

| Path | Status | Recommendation | Reason |
|---|---|---|---|
| `paper-formatter/.vscode/` | untracked | ignore | Local editor settings; only commit if normalized team settings are intentionally defined. |

## Recommended Next Batches

1. Docs baseline batch: review and commit `paper-formatter/docs/coding-baseline*.md` plus a cleaned `paper-formatter/AGENTS.md` without memory context.
2. Lint batch: review `services/client/eslint.config.js`, wire `npm run lint` into CI, and fix/record lint findings.
3. Governance skill batch: review `.claude/skills/*` and `.agents/` together with a validation command.
4. Parser service decision: decide whether `services/docx-parser/` is a real service or should be folded into `api-gateway/src/parser`.
5. Artifact cleanup: remove or ignore `batch-results/`, `test-results/`, `.codex/`, and local editor/runtime files.
