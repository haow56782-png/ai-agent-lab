# VIB AI Agent — Roadmap 2026 Q2

## Milestone 1: Foundation (当前)
> 目标：项目闭环可运行，评测可量化
>
> **ETA**: 2026-05-10

- [x] 项目骨架 (package.json, tsconfig, env)
- [x] Agent 核心 (ReAct loop, LLM client, workflow)
- [x] 设计系统 (Figma tokens, preview, brand)
- [x] OpenClaw Skills 框架
- [ ] **Task Catalog (≥ 5 tasks)** ← 当前
- [ ] **Evaluation Framework** ← 当前
- [ ] **Baseline Benchmark** ← 当前

## Milestone 2: Agent Capability (2026-05中旬)
> 目标：Agent 能完成实际任务，不是 placeholder

- [ ] 游戏预测 domain logic（非 placeholder）
- [ ] 设计系统 → Agent 直通（自然语言 → Token CSS）
- [ ] Figma 增量导入（检测变更而非全量提取）
- [ ] Task Success Rate ≥ 60%

## Milestone 3: Production Ready (2026-05底)
> 目标：可演示、可部署、可扩展

- [ ] 10+ 注册任务全部可跑通
- [ ] Task Success Rate ≥ 85%
- [ ] CI 评测流水线
- [ ] 支持 > 3 个游戏供应商
- [ ] Agent 记忆持续优化（claude-mem 深度集成）

## Priority Matrix

```
高影响 ┼──────────────────────────────
      │                            │
      │  QUICK WIN                │  MAJOR
      │  • Task Catalog           │  • Game prediction logic
      │  • Eval framework         │  • CI evaluation pipeline
      │  • Domain model           │
      │                            │
      ├────────────────────────────┤
      │                            │
      │  FILL-IN                  │  INVESTIGATE
      │  • More scenarios         │  • Multi-game support
      │  • Benchmark reports      │  • claude-mem deep integration
      │                            │
  低   └────────────────────────────┘
      低 努力度                    高 努力度
```
