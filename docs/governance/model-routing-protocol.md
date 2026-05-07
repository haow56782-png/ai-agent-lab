# Model Routing Protocol v0.2

## Execution Chain

```
Claude Opus → DeepSeek v4 Pro → DeepSeek v4 Flash
```

Three-tier model routing. No exceptions without Architecture Freeze Gate escalation.

## Tier Responsibilities

| Tier | Model | Role | Scope |
|------|-------|------|-------|
| L1 | `claude-opus` | Architecture Governor | Architecture design, type definitions, freeze gate review, Opus arbitration |
| L2 | `deepseek-v4-pro` | Implementation Planner | Domain logic, state machines, test plans, diff-check before execution |
| L3 | `deepseek-v4-flash` | Mechanical Executor | Boilerplate, file creation, test writing, batch eval runs |

## OpenAI Positioning

**OpenAI is an external Cognitive Reviewer, not a layer in the main execution chain.**

- Only participates in the Architecture Freeze Gate
- Not a default execution model
- Cannot rewrite architecture directly
- Only outputs critique, risks, required changes, and a freeze gate verdict

### Reviewer Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| model | `gpt-5.5-thinking` | Reasoning model for deep cognitive review |
| endpoint | `https://api.openai.com/v1/responses` | OpenAI Responses API endpoint |
| timeoutMs | `300000` | 5-minute timeout for review |
| maxRetries | `1` | Single retry on failure |
| fallbackPolicy | `BLOCK_FREEZE` | On failure: prevent freeze, escalate to Opus-only, or defer |

### Fallback Policies

| Policy | Behavior |
|--------|----------|
| `BLOCK_FREEZE` | Architecture freeze is blocked until OpenAI review succeeds |
| `OPUS_ONLY_WITH_WARNING` | Opus performs the review, logged as degraded |
| `DEFER_REVIEW` | Skip review, mark architecture as "not reviewed" in audit log |

## Freeze Gate Integration

```
┌──────────────────────────────────────────────────────────┐
│  Claude Opus Architecture Draft                          │
│       ↓                                                  │
│  OpenAI Cognitive Review  (external, freeze gate only)   │
│       ↓                                                  │
│  Claude Opus Arbitration                                 │
│       ↓                                                  │
│  Architecture Freeze Gate  (approve / reject / changes)  │
│       ↓                                                  │
│  DeepSeek v4 Pro → DeepSeek v4 Flash  (implementation)   │
└──────────────────────────────────────────────────────────┘
```

## Routing Rules

1. **Architecture Governor (Opus)**: All architecture design and type decisions. If task complexity is "architecture", route directly to Opus.
2. **Implementation Planner (Pro)**: Domain logic and state machines. Requires diff-check pass against frozen architecture before execution.
3. **Mechanical Executor (Flash)**: Boilerplate and test scaffolding. Must have approved plan from Pro.
4. **OpenAI Reviewer**: Only invoked during freeze gate review cycle. Not part of the execution chain.

## Anti-Drift Rules

- DeepSeek v4 Pro must pass diff-check before implementing any change to a frozen architecture
- If diff-check returns `requiresThaw = true`, the implementation is blocked — Thaw Protocol must execute first
- Every routing decision is logged to the Routing Audit Log with selectedModel, role, reason, and timestamp
