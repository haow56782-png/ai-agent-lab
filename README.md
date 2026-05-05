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
├── design-system/             # Figma 驱动设计系统
│   ├── brand.md               # 品牌规范
│   ├── tokens/                # 设计 Token (CSS)
│   ├── preview.html           # 可视化预览
│   └── pages/                 # 页面指南
│
├── src/                       # Agent 后端
│   ├── index.ts               # 入口 (REPL / once / workflow)
│   ├── agent.ts               # Agent 核心 (ReAct 循环)
│   ├── llm.ts                 # LLM 客户端 (DeepSeek)
│   ├── tools/                 # 工具注册表
│   │   ├── index.ts           #   注册 + 调用引擎
│   │   ├── design-system.ts   #   设计系统工具
│   │   └── game-prediction.ts #   游戏预测工具
│   └── workflow.ts            # 工作流引擎
│
├── skills/                    # OpenClaw 技能系统
│   ├── manifest.json          # 技能清单
│   ├── design-token.ts        # 设计 Token 技能
│   ├── figma-import.ts        # Figma 导入技能
│   └── game-prediction.ts     # 游戏预测技能
│
├── prompts/                   # 提示词
│   ├── agent-system.md        # Agent 系统提示词
│   ├── planner.md             # 规划阶段提示词
│   ├── executor.md            # 执行阶段提示词
│   └── game-prediction.md     # 游戏预测领域提示词
│
├── tests/                     # 测试
│   ├── llm.test.ts            # LLM 客户端测试
│   ├── agent.test.ts          # Agent 测试
│   ├── tools.test.ts          # 工具测试
│   └── workflow.test.ts       # 工作流测试
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
| `npm run dev workflow <task>` | Run Plan→Execute→Review→Refine |
| `npm run dev check` | Verify LLM connectivity |
| `npm run build` | Compile TypeScript to dist/ |
| `npm test` | Run all tests |
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
