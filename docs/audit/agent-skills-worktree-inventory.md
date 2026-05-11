# Agent Skills Worktree Inventory

## 1. Scope

This inventory covers the remaining non-product-engineering worktree items after the paper formatter cleanup batches:

- `.claude/skills/*`
- `.agents/skills/*`
- `.codex/config.toml`
- `AGENTS.md`

## 2. Immediate Cleanup Decisions

| Path | Finding | Decision | Reason |
|---|---|---|---|
| `AGENTS.md` | Had generated `<claude-mem-context>` session memory appended. | remove generated block | Project instructions should stay stable and should not embed transient session memory. |
| `.codex/config.toml` | Local Codex/Ruflo MCP configuration. | ignore and remove from worktree | Local runtime configuration should not be committed unless promoted to a documented template. |

## 3. Skill Asset Classification

| Asset | Status | Suggested next handling |
|---|---|---|
| `.claude/skills/hooks-automation/SKILL.md` | tracked modified | inspect as skill upgrade batch |
| `.claude/skills/pair-programming/SKILL.md` | tracked modified | inspect as skill upgrade batch |
| `.claude/skills/ruflo-project-orchestration-skill/SKILL.md` | tracked modified | inspect with `.agents` ruflo copy and fixtures |
| `.claude/skills/skill-builder/SKILL.md` | tracked modified | inspect as skill upgrade batch |
| `.claude/skills/sparc-methodology/SKILL.md` | tracked modified | inspect as skill upgrade batch |
| `.claude/skills/stream-chain/SKILL.md` | tracked modified | inspect as skill upgrade batch |
| `.claude/skills/swarm-advanced/SKILL.md` | tracked modified | inspect as skill upgrade batch |
| `.claude/skills/swarm-orchestration/SKILL.md` | tracked modified | inspect as skill upgrade batch |
| `.claude/skills/verification-quality/SKILL.md` | tracked modified | inspect as skill upgrade batch |
| `.claude/skills/governance-memory-skill/SKILL.md` | untracked | compare with `.agents/skills/governance-memory-skill` before deciding canonical location |
| `.agents/skills/*` | untracked skill mirror / alternate root | split into identical copies, divergent copies, and new fixtures before commit/delete |

## 4. `.agents` Comparison Snapshot

Files identical to `.claude/skills` at audit time:

- `context-engineering-skill/SKILL.md`
- `failure-analysis-skill/SKILL.md`
- `product-prd-skill/SKILL.md`
- `swarm-orchestration/SKILL.md`
- `verification-gate-skill/SKILL.md`
- `vib-agent-product-skill/SKILL.md`

Files divergent from `.claude/skills` at audit time:

- `governance-memory-skill/SKILL.md`
- `hooks-automation/SKILL.md`
- `pair-programming/SKILL.md`
- `ruflo-project-orchestration-skill/SKILL.md`
- `skill-builder/SKILL.md`
- `sparc-methodology/SKILL.md`
- `stream-chain/SKILL.md`
- `swarm-advanced/SKILL.md`
- `verification-quality/SKILL.md`

Additional `.agents` fixtures:

- `ruflo-project-orchestration-skill/fixtures/partial-reject-knowledge-archive-v1.1.md`
- `ruflo-project-orchestration-skill/fixtures/pass-signal-distribution-v1.1.md`
- `ruflo-project-orchestration-skill/fixtures/policy-engine-evolution.md`
- `ruflo-project-orchestration-skill/fixtures/reject-bbook-liquidation-v1.1.md`
- `ruflo-project-orchestration-skill/fixtures/reject-oauth-low-subtasks.md`

## 5. Recommended Next Batch

Handle skill assets in this order:

1. Decide canonical skill root: `.claude/skills`, `.agents/skills`, or both with documented purpose.
2. For identical `.agents` copies, either remove them or document why both roots must exist.
3. For divergent skill files, review one skill family at a time and commit only validated upgrades.
4. Treat Ruflo fixtures as a separate methodology/evaluation fixture batch.
