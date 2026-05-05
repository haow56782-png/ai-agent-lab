# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`ai-agent-lab` — **VIB AI Agent Platform**. AI-driven game prediction platform with intelligent agents.

Architecture: **Claude (planner) → OpenClaw (orchestration) → DeepSeek (executor) → Node.js/TS (runtime)**

## Design System

Figma-based design system lives in `design-system/`. The tokens were extracted directly from the Figma design file via API.

| File | What |
|------|------|
| `design-system/brand.md` | Brand identity, colors, typography, spacing |
| `design-system/tokens/colors.css` | Color tokens (dark theme default) |
| `design-system/tokens/typography.css` | Font: HarmonyOS Sans SC, Inter |
| `design-system/tokens/spacing.css` | Spacing scale, layout, radii |
| `design-system/preview.html` | Visual preview page with dark/light toggle |
| `design-system/pages/mobile-h5.md` | Mobile H5 guidelines |
| `design-system/pages/admin-dashboard.md` | Dashboard guidelines |
| `design-system/pages/data-collection-annotation.md` | Large model AI chat, data collection, quick judgment, voice collection, labeling |
| `design-system/components/README.md` | Component architecture rules |

### Token Usage Rules

1. Use `--vib-*` tokens in CSS, never hardcode color values
2. `[data-theme="dark"]` is the default; light mode overrides via `[data-theme="light"]`
3. All button radii = 30px (`--vib-radius-xl`)
4. Primary brand color: `#4E41FF`, gold accent: `#FFDE6C→#F7981D` gradient

## Product Vision

| Document | What |
|----------|------|
| `docs/vision.md` | Product vision, value proposition, success criteria |
| `docs/personas.md` | User personas (analyst, designer, agent developer) |
| `docs/domain-model.md` | Domain entities (Game, Prediction, Metrics, Task) |
| `docs/roadmap.md` | 2026 Q2 roadmap with milestones and priority matrix |

## Task Catalog

`tasks/catalog.json` defines all tasks the agent can perform. Each task specifies:
- Input parameters and success criteria
- Evaluation method (automated via `evals/`)
- Tags for categorization

| ID | Domain | Description |
|----|--------|-------------|
| TASK-001 | game-prediction | Quick game outcome prediction |
| TASK-002 | game-prediction | Game runtime metrics |
| TASK-003 | design-system | Read design tokens |
| TASK-004 | design-system | Generate component CSS |
| TASK-005 | workflow | Plan→Execute→Review→Refine |

## Evaluation Framework

`evals/runner.ts` runs scenarios against the agent and reports scores.

```bash
npm run dev eval <scenario>   # Run one scenario
npm run dev eval all          # Run all scenarios
npm run dev tasks             # List all registered tasks
```

Scenarios: `prediction-basic`, `prediction-edge`, `ds-read`, `ds-generate`

## Source Code

| Directory | What |
|-----------|------|
| `src/` | Agent backend (entry, agent loop, LLM client, tools, workflow) |
| `src/domain/` | Domain logic (game entities, prediction service, metrics service) |
| `src/tools/` | Tool registry + built-in tools (design-system, game-prediction) |
| `skills/` | OpenClaw skill definitions (design-token, figma-import, game-prediction) |
| `prompts/` | Prompt templates (agent-system, planner, executor, domain) |
| `tests/` | Vitest tests (LLM, agent, tools, workflow, capabilities, evals) |

### Key Files

- `src/index.ts` — Entry point (modes: repl / once / workflow / eval / tasks / check)
- `src/agent.ts` — Core ReAct agent loop
- `src/llm.ts` — DeepSeek API client (OpenAI-compatible)
- `src/tools/index.ts` — Tool registry and execution engine
- `src/workflow.ts` — Plan → Execute → Review → Refine pipeline
- `src/domain/prediction.ts` — Game prediction domain service
- `src/domain/game.ts` — Game entity and type definitions

## Figma Source

- File: `AI Agent 游戏预测` (ShtkcPpmxmu6ThHTc2nn3s)
- Design extracted via Figma API on 2026-05-05
- Key pages: H5 (home/login/agents/chat/data), app ui, settings

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start interactive REPL |
| `npm run dev once <prompt>` | Single prompt execution |
| `npm run dev workflow <task>` | Plan → Execute → Review → Refine |
| `npm run dev eval <scenario>` | Run evaluation scenario (or `all`) |
| `npm run dev tasks` | List all registered tasks |
| `npm run dev check` | Verify LLM connectivity |
| `npm run build` | Compile TypeScript to dist/ |
| `npm test` | Run all tests (vitest) |
| `npm run typecheck` | TypeScript type checking |
| `tsx skills/<name>.ts` | Run a skill directly |

## Environment

Copy `.env.example` to `.env` and fill in API keys. The `.env` file is gitignored.
