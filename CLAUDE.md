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

## Source Code

| Directory | What |
|-----------|------|
| `src/` | Agent backend (entry, agent loop, LLM client, tools, workflow) |
| `src/tools/` | Tool registry + built-in tools (design-system, game-prediction) |
| `skills/` | OpenClaw skill definitions (design-token, figma-import, game-prediction) |
| `prompts/` | Prompt templates (agent-system, planner, executor, domain) |
| `tests/` | Vitest tests (LLM, agent, tools, workflow) |

### Key Files

- `src/index.ts` — Entry point (modes: repl / once / workflow / check)
- `src/agent.ts` — Core ReAct agent loop
- `src/llm.ts` — DeepSeek API client (OpenAI-compatible)
- `src/tools/index.ts` — Tool registry and execution engine
- `src/workflow.ts` — Plan → Execute → Review → Refine pipeline

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
| `npm run dev check` | Verify LLM connectivity |
| `npm run build` | Compile TypeScript to dist/ |
| `npm test` | Run all tests (vitest) |
| `npm run typecheck` | TypeScript type checking |
| `tsx skills/<name>.ts` | Run a skill directly |

## Environment

Copy `.env.example` to `.env` and fill in API keys. The `.env` file is gitignored.
