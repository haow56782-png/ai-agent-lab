# Skill Root Canonical Decision

## 1. Decision

The canonical repository skill root is:

```text
.claude/skills
```

`.agents/skills` is treated as an import / runtime mirror until each divergent skill family is explicitly reconciled.

## 2. Rationale

- `AGENTS.md` mandatory reads point to `.claude/skills`, so repository governance already depends on that root.
- `.claude/skills` is the tracked, reviewable source-of-truth for workflow skills in this repository.
- `.agents/skills` currently contains a mix of identical copies, divergent drafts, and extra fixtures. Committing both roots would create two competing sources of truth.
- Skill promotion should happen one family at a time: compare `.agents`, absorb validated assets into `.claude`, then remove or ignore the mirrored `.agents` copy after reconciliation.

## 3. First Promoted Batch

Ruflo is the first promoted skill family.

Promoted canonical assets:

- `.claude/skills/ruflo-project-orchestration-skill/SKILL.md`
- `.claude/skills/ruflo-project-orchestration-skill/fixtures/partial-reject-knowledge-archive-v1.1.md`
- `.claude/skills/ruflo-project-orchestration-skill/fixtures/pass-signal-distribution-v1.1.md`
- `.claude/skills/ruflo-project-orchestration-skill/fixtures/policy-engine-evolution.md`
- `.claude/skills/ruflo-project-orchestration-skill/fixtures/reject-bbook-liquidation-v1.1.md`
- `.claude/skills/ruflo-project-orchestration-skill/fixtures/reject-oauth-low-subtasks.md`

## 4. Import Policy

For future skill batches:

1. Compare `.agents/skills/<skill>` against `.claude/skills/<skill>`.
2. Promote only validated changes into `.claude/skills`.
3. Keep generated runtime config and transient memory out of version control.
4. Do not commit `.agents/skills` as a parallel canonical root.

## 5. Deferred Cleanup

`.agents/skills` remains untracked until all divergent skill families are reconciled. After reconciliation, either remove it from the worktree or add a narrow ignore rule if the local runtime recreates it.
