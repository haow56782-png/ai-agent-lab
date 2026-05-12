# Non-Product Assets Disposition

## Scope

This note records how we are treating non-product-line assets that are still dirty in the workspace after the paper formatter batches were submitted.

The goal is to keep `paper-formatter` product work separate from agent/runtime assets, local mirrors, and experimental skill drafts.

## Decision Summary

| Asset group | Decision | Reason | Next handling |
|---|---|---|---|
| `.agents/` | `ignore` | Local runtime mirror of skill assets; not product code and not a stable repo baseline | Added to `.gitignore` |
| Untracked skill drafts under `.claude/skills/` | `archive` | Useful references, but not ready to become canonical runtime skills | Moved to `docs/archive-candidates/agent-assets/` |
| Modified tracked skills under `.claude/skills/` | `defer` | Large diffs, mixed sources, and partially divergent from `.agents/` copies | Review in a dedicated skill-baseline batch |
| `AGENTS.md` runtime memory appendix | `inspect` | Looks like volatile session memory appended into a governance file | Resolve in a dedicated governance-doc batch |

## Actions Taken

### 1. Ignored local mirror

Added this rule:

```gitignore
.agents/
```

Rationale:

- `.agents/skills/*` is not part of the paper formatter product line.
- Several entries duplicate or partially diverge from `.claude/skills/*`.
- Keeping it visible in normal `git status` adds noise and increases accidental-commit risk.

### 2. Archived untracked skill candidates

Moved these out of the live runtime path into archive candidates:

- `docs/archive-candidates/agent-assets/git-commit-formatter/`
- `docs/archive-candidates/agent-assets/governance-memory-skill/`
- `docs/archive-candidates/agent-assets/skill-builder-docs/`

Rationale:

- They may still be useful as future references.
- They are not part of the current product baseline.
- Leaving them under `.claude/skills/` makes them look deployable when they are not yet vetted.

## Deferred / Needs Manual Review

### Tracked skill rewrites in `.claude/skills/`

These remain dirty and should be reviewed in a separate batch:

- `.claude/skills/hooks-automation/SKILL.md`
- `.claude/skills/pair-programming/SKILL.md`
- `.claude/skills/skill-builder/SKILL.md`
- `.claude/skills/sparc-methodology/SKILL.md`
- `.claude/skills/stream-chain/SKILL.md`
- `.claude/skills/swarm-advanced/SKILL.md`
- `.claude/skills/swarm-orchestration/SKILL.md`
- `.claude/skills/verification-quality/SKILL.md`

Why deferred:

- The diffs are large.
- Some files diverge from `.agents/skills/*`, while others match.
- This needs a canonical-root decision plus actual content review, not a drive-by commit.

### `AGENTS.md`

Current issue:

- A volatile `<claude-mem-context>` block has been appended.

Why inspect instead of auto-revert:

- It is clearly not product code.
- But it is a tracked governance file, so removing it should happen in an explicit governance-doc cleanup step rather than being bundled with paper formatter work.

## Recommended Next Batch

1. Review `AGENTS.md` and decide whether session-memory appendices are ever allowed in tracked governance docs.
2. Choose the canonical skill root for repo-managed skills.
3. Review the tracked `.claude/skills/*` rewrites one batch at a time, or archive them if they are just local experiments.
