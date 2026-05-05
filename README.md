# VIB AI Agent Platform

> AI-driven game prediction platform with intelligent agents.
> Architecture: **Claude (planner) + DeepSeek (executor) + OpenClaw (skills) + Node.js/TS (runtime)**

---

## Architecture

```
你的 Mac
├── Claude Code        → 架构推理 / 复杂规划
├── DeepSeek API       → 低成本批量生成 / 执行
├── OpenClaw           → Skills / 工具编排 / 本地任务
├── Node.js / TS       → Agent 后端骨架
├── .env               → 管理 API Key
└── 本地项目目录        → 代码、Prompt、Skill、记忆文件
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure API keys (edit .env)
DEEPSEEK_API_KEY=sk-your-key-here

# 3. Start interactive REPL
npm run dev

# 4. Or run a one-shot prompt
npm run dev once "分析当前项目的设计系统结构"

# 5. Or run the workflow engine
npm run dev workflow "生成一个 VIB 主题的按钮组件"

# 6. Check connectivity
npm run dev check
```

## Project Structure

```
ai-agent-lab/
├── CLAUDE.md                  # Claude Code 项目指令
├── docs/                      # 产品定义文档
│   ├── vision.md              #   产品愿景 + 成功标准
│   ├── personas.md            #   用户画像
│   ├── domain-model.md        #   领域模型 (Game/Prediction/Metrics)
│   └── roadmap.md             #   路线图 + 优先级矩阵
│
├── design-system/             # Figma 驱动设计系统
│   ├── brand.md               #   品牌规范
│   ├── tokens/                #   设计 Token (CSS)
│   ├── preview.html           #   可视化预览
│   └── pages/                 #   页面指南
│
├── tasks/                     # 任务注册表
│   ├── catalog.json           #   所有 Agent 任务的清单
│   ├── TASK-gemini.md         #   游戏预测任务定义
│   ├── TASK-design-token.md   #   设计 Token 任务定义
│   ├── TASK-component-css.md  #   组件 CSS 任务定义
│   └── TASK-workflow.md       #   工作流任务定义
│
├── evals/                     # 评测框架
│   ├── runner.ts              #   评测运行器
│   ├── metrics.ts             #   指标定义 (accuracy/latency/completeness)
│   ├── scenarios/             #   评测场景
│   │   ├── prediction-basic.ts
│   │   ├── prediction-edge.ts
│   │   └── design-system.ts
│   └── reports/               #   评测报告
│
├── src/                       # Agent 后端
│   ├── index.ts               #   入口 (repl/once/workflow/eval/tasks/check)
│   ├── agent.ts               #   Agent 核心 (ReAct 循环)
│   ├── llm.ts                 #   LLM 客户端 (DeepSeek)
│   ├── domain/                #   领域逻辑
│   │   ├── game.ts            #     Game 实体 + Enums
│   │   ├── prediction.ts      #     预测服务
│   │   └── metrics.ts         #     指标聚合服务
│   ├── tools/                 #   工具注册表
│   │   ├── index.ts           #     注册 + 调用引擎
│   │   ├── design-system.ts   #     设计系统工具
│   │   └── game-prediction.ts #     游戏预测工具
│   └── workflow.ts            #   工作流引擎
│
├── skills/                    # OpenClaw 技能系统
│   ├── manifest.json          #   技能清单
│   ├── design-token.ts        #   设计 Token 技能
│   ├── figma-import.ts        #   Figma 导入技能
│   └── game-prediction.ts     #   游戏预测技能
│
├── prompts/                   # 提示词
│   ├── agent-system.md        #   Agent 系统提示词
│   ├── planner.md             #   规划阶段提示词
│   ├── executor.md            #   执行阶段提示词
│   └── game-prediction.md     #   游戏预测领域提示词
│
├── tests/                     # 测试 (24 tests)
│   ├── capabilities/          #   能力验证测试
│   │   ├── prediction.test.ts
│   │   ├── design-system.test.ts
│   │   └── workflow.test.ts
│   ├── evals/                 #   评测框架测试
│   │   └── runner.test.ts
│   ├── llm.test.ts
│   ├── agent.test.ts
│   ├── tools.test.ts
│   └── workflow.test.ts
│
├── tutorial-screenshots/      # CLD 安装教程
├── .env                       # API 密钥 (不提交)
├── .env.example               # 环境变量模板
├── package.json               # 依赖管理
├── tsconfig.json              # TypeScript 配置
└── vitest.config.ts           # Vitest 配置
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start interactive REPL |
| `npm run dev once <prompt>` | Run one-shot prompt |
| `npm run dev workflow <task>` | Plan→Execute→Review→Refine |
| `npm run dev eval <scenario>` | Run evaluation scenario (`all` for all) |
| `npm run dev tasks` | List registered tasks |
| `npm run dev check` | Verify LLM connectivity |
| `npm run build` | Compile TypeScript to dist/ |
| `npm test` | Run all tests (24 total) |
| `npm run typecheck` | TypeScript type checking |

## Design System

The design system lives in `design-system/` and was extracted from the Figma file **"AI Agent 游戏预测"** (`ShtkcPpmxmu6ThHTc2nn3s`) via API.

| File | Description |
|------|-------------|
| `tokens/colors.css` | Color tokens (dark default, light override) |
| `tokens/typography.css` | HarmonyOS Sans SC + Inter |
| `tokens/spacing.css` | Spacing scale, layout, radii |
| `brand.md` | Brand identity guidelines |
| `preview.html` | Visual preview with dark/light toggle |
| `pages/mobile-h5.md` | Mobile H5 guidelines |
| `pages/admin-dashboard.md` | Admin dashboard guidelines |
| `pages/data-collection-annotation.md` | Data pipeline docs |

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js v25, TypeScript |
| LLM API | DeepSeek (OpenAI-compatible) |
| Agent Framework | Claude Code + Custom Agent |
| Skills | OpenClaw |
| Test | Vitest |
| Design | Figma → CSS Tokens → Tailwind |
