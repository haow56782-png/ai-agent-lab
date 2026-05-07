# ADR-0001: [Architecture Decision Title]

**Status:** ACCEPTED | SUPERSEDED | REJECTED | FROZEN
**Review Level:** L0 | L1 | L2 | L3
**Freeze Version:** v0.0.0
**Date:** YYYY-MM-DD

---

## Context

[Describe the architectural context and motivation for this decision. What problem or constraint drove this choice?]

## Problem Statement

[Clearly state the specific problem being solved.]

## Decision

[State the architectural decision clearly and concisely.]

## Rationale

[Explain why this decision was chosen over alternatives. Include trade-offs considered.]

## Rejected Alternatives

- **[Alternative A]** — rejected because [reason]
- **[Alternative B]** — rejected because [reason]

## External Reviewer Findings

<!-- L2/L3 only: findings from external cognitive review -->
- [Finding 1]
- [Finding 2]

## Arbitration Outcome

<!-- L3 only: outcome of Claude Opus arbitration -->
[Arbitration verdict and rationale]

## Drift Risk

**LOW | MEDIUM | HIGH | CRITICAL**

[Explanation of assessed drift risk.]

## Constitutional Impact

**NONE | BOUNDARY | INVARIANT | AUTHORITY**

[Explanation of constitutional impact if any.]

## Future Constraints

- [Constraint that limits future evolution]
- [Another constraint]

## Reversal Conditions

- Reversal requires: [condition]
- Thaw requires: [condition]

## Related Invariants

- INV-001: Opus owns final arbitration
- INV-003: Governance layer cannot access secrets

## Related ADRs

- SUPERSEDES: ADR-0000
- RELATED: ADR-0002

---

## Machine-Readable Representation

```json
{
  "id": "ADR-0001",
  "title": "...",
  "status": "ACCEPTED",
  "reviewLevel": "L3",
  "freezeVersion": "v0.0.0",
  "timestamp": "YYYY-MM-DDThh:mm:ss.sssZ",
  "decision": "...",
  "context": "...",
  "problemStatement": "...",
  "rationale": "...",
  "rejectedAlternatives": ["..."],
  "externalReviewerFindings": ["..."],
  "arbitrationOutcome": "...",
  "driftRisk": "LOW",
  "constitutionalImpact": "NONE",
  "futureConstraints": ["..."],
  "reversalConditions": ["..."],
  "relatedInvariants": ["INV-001"],
  "relatedADRs": ["ADR-0000"],
  "decisionHash": "a1b2c3d4"
}
```
