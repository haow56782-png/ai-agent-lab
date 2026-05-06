# VIB AI Agent Platform — 项目全览

> 版本 1.0.0 · 2026 Q2 · 架构: Claude (planner) → OpenClaw (orchestration) → DeepSeek (executor) → Node.js/TS (runtime)

---

## 目录

1. [项目总览](#1-项目总览)
2. [Agent Runtime 架构](#2-agent-runtime-架构)
3. [Ruflo / MCP / Skills 说明](#3-ruflo--mcp--skills-说明)
4. [VIB Agent 首次 URL 识别 + 授权绑定流程](#4-vib-agent-首次-url-识别--授权绑定流程)
5. [Eval Fixtures + Regression Baseline](#5-eval-fixtures--regression-baseline)
6. [Trace / Telemetry / Metrics](#6-trace--telemetry--metrics)
7. [ToolContext 解耦说明](#7-toolcontext-解耦说明)
8. [CLI 使用指南](#8-cli-使用指南)
9. [下一阶段 Roadmap](#9-下一阶段-roadmap)

---

## 1. 项目总览

### 一句话愿景

**让每个游戏玩家都能获得 AI 驱动的预测洞察，像看天气预报一样看游戏结果。**

### 核心价值主张

| 维度 | 描述 |
|------|------|
| **For** | 游戏玩家和数据分析师 |
| **Who** | 需要基于数据做出游戏决策，但没有数据科学团队 |
| **The platform** | VIB AI Agent Platform |
| **Is** | 一个 AI 驱动的游戏预测平台 |
| **That** | 自动分析历史模式、实时数据，输出可执行的预测洞察 |
| **Unlike** | 传统统计工具或人工分析 |
| **We** | 用 Claude 做规划推理 + DeepSeek 做批量执行 + 本地 Skill 系统做工具编排 |

### 用户画像

| 角色 | 背景 | 核心诉求 |
|------|------|----------|
| **小王** — 游戏数据分析师 | 熟悉 SQL/Python，非 ML 专家 | 自然语言描述需求，Agent 自动规划、执行、输出 |
| **Linda** — 设计工程师 | 熟悉 Figma + CSS | Figma API 直连 → 自动提取 Token → 生成组件 CSS |
| **Alex** — AI Agent 开发者 | 熟悉 LLM + Agent 架构 | Task Catalog + Evaluation Framework 让能力可量化 |

### 项目规模

| 指标 | 数值 |
|------|------|
| TypeScript 源文件 | 49 文件 |
| 总代码行数 | 4,434 行 |
| 测试用例 | 85 tests |
| Git Commits | 16 commits |
| 注册 Task | 5 tasks |
| Skill 定义 | 9 skills |
| 游戏供应商 | 6 种 (PG_SOFT, JILI, SPADE_GAMING, HABANERO, CQ9, GEMINI) |

---

## 2. Agent Runtime 架构

### 多 Agent 协作架构

```
┌──────────────────────────────────────────────────┐
│                  规划层 Planning                   │
│  ┌────────────────┐     ┌──────────────────┐      │
│  │ Claude (Planner)│ →  │ DeepSeek (Executor)│     │
│  │ 架构推理/规划   │     │ 批量生成/低成本   │      │
│  └────────────────┘     └──────────────────┘      │
└──────────────────────┬───────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│                  编排层 Orchestration              │
│  ┌────────────────┐     ┌──────────────────┐      │
│  │   OpenClaw     │ ↔   │ Swarm Coordinator│      │
│  │ Skill 编排/路由 │     │ 多Agent并行/共识  │      │
│  └────────────────┘     └──────────────────┘      │
└──────────────────────┬───────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│                  工具层 Tool System                │
│  Tool Registry → predict_game_outcome /           │
│  get_game_metrics / read_design_tokens /           │
│  generate_component_css                           │
└──────────────────────┬───────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────┐
│                  技能层 Skills                     │
│  design-token / game-prediction / figma-import    │
│  swarm-orchestration / stream-chain / ...         │
└──────────────────────────────────────────────────┘
```

### 执行循环 (ReAct Loop)

```
用户输入 → LLM 推理 → 工具调用? → 执行工具 → 返回结果
                  ↘ 否 → 直接回复
```

### 核心模块 (src/)

| 文件 | 职责 | 关键设计 |
|------|------|----------|
| `src/index.ts` | 入口 | REPL / once / workflow / eval / tasks / check / log / metrics / trace 9 种模式 |
| `src/agent.ts` | ReAct Agent 循环 | 最大迭代次数可配，tool call 解析，tracer 集成，logger 埋点 |
| `src/llm.ts` | DeepSeek API 客户端 | retry (exponential backoff, max 3), timeout (30s), telemetry 记录 |
| `src/workflow.ts` | Plan→Execute→Review→Refine | 否定词感知的 `needsRefinement()`，`safeChat()` 容错包装 |
| `src/config.ts` | 配置管理器 | env > config.yaml > defaults 三级覆盖 |
| `src/logger.ts` | 结构化日志 | JSONL 输出到 stderr，带 traceId 关联 |
| `src/tracer.ts` | 执行追踪 | 嵌套 span，flamegraph 格式输出 |
| `src/telemetry.ts` | 指标收集 | LLM 调用/工具调用计数、延迟、Token 用量 |

### 数据流

```
用户 Prompt → System + Tools 上下文 → LLM Chat Completion → 工具调用 JSON
  → ToolContext.fs 注入 → 结构化日志
```

### Agent Runtime 配置

全部配置项及默认值：

| Key | 默认值 | 说明 | Env Override |
|-----|--------|------|-------------|
| `llm.temperature` | 0.7 | LLM 温度 | `LLM_TEMPERATURE` |
| `llm.maxTokens` | 4096 | 最大 Token 数 | `LLM_MAX_TOKENS` |
| `llm.model` | deepseek-chat | 模型名 | `LLM_MODEL` |
| `llm.timeoutMs` | 30000 | 超时毫秒 | `LLM_TIMEOUT_MS` |
| `llm.retry.max` | 3 | 最大重试次数 | `LLM_RETRY_MAX` |
| `llm.retry.delayMs` | 1000 | 重试基准延迟 | `LLM_RETRY_DELAY_MS` |
| `llm.retry.backoff` | 2 | 退避因子 | `LLM_RETRY_BACKOFF` |
| `agent.maxIterations` | 10 | Agent 循环上限 | `AGENT_MAX_ITERATIONS` |
| `log.level` | info | 日志级别 | `LOG_LEVEL` |

---

## 3. Ruflo / MCP / Skills 说明

### 三层能力体系

```
┌──────────────────────────────────────────────────┐
│                   Skills (技能层)                  │
│  OpenClaw Skills + Claude Code Skills              │
│  定义 Agent 可执行的能力单元                         │
├──────────────────────────────────────────────────┤
│                   MCP (模型上下文协议)               │
│  claude-mem MCP search / memory / smart-search     │
│  提供持久化记忆和代码搜索能力                         │
├──────────────────────────────────────────────────┤
│                  Ruflo (编排层)                     │
│  V3 Swarm + stream-chain + workflow 模板           │
│  多 Agent 协调、顺序/并行管道、生命周期管理          │
└──────────────────────────────────────────────────┘
```

### Skill 清单

项目定义了 9 个 Claude Code Skills 和 3 个 OpenClaw Skills：

| Skill | 类型 | 说明 |
|-------|------|------|
| `design-token` | OpenClaw | Figma Token 处理 |
| `game-prediction` | OpenClaw | 游戏预测推理 + 指标 |
| `figma-import` | OpenClaw | Figma API 增量导入 |
| `swarm-orchestration` | Claude | 多 Agent 编排 (hierarchical-mesh) |
| `stream-chain` | Claude | 顺序执行管道 |
| `swarm-advanced` | Claude | 高级并行模式 |
| `pair-programming` | Claude | 结对编程 + TDD |
| `verification-quality` | Claude | 真值评分 + 回滚 |
| `hooks-automation` | Claude | 生命周期钩子自动化 |
| `sparc-methodology` | Claude | SPARC 方法论模板 |
| `skill-builder` | Claude | 技能工厂 (meta-skill) |
| `vib-agent-product-skill` | Claude | **产品领域定义**（账号绑定/PRD 模板/领域模型） |

### Skill 发现机制

Claude Code 使用单层 glob 扫描：`.claude/skills/*/SKILL.md`。嵌套子目录不会被自动发现。分类通过 YAML frontmatter 中的 `category` 字段区分。

### Ruflo V3 Swarm

Ruflo V3 提供 15 个 Agent 的多层网格协调能力：

- **hierarchical-mesh 拓扑**: 分层 + 网格混合，兼具效率和灵活性
- **8 个内置 Workflow 模板**: research, codegen, review, test, debug, refactor, document, deploy
- **运行时目录**: `.claude-flow/` (agents/, workflows/, swarm/, tasks/, data/, logs/, sessions/)

### MCP Tools (claude-mem)

| MCP 工具 | 说明 |
|----------|------|
| `search() / get_observations()` | 内存搜索 + 详情获取 |
| `timeline()` | 获取上下文时间线 |
| `smart_search()` | 基于 tree-sitter AST 的代码搜索 |
| `smart_outline()` | 文件结构概览（符号级折叠） |
| `build_corpus()` | 构建可查询的知识库 |

---

## 4. VIB Agent 首次 URL 识别 + 授权绑定流程

### 核心设计理念

**不是让用户从下拉列表选平台，而是让 AI 先识别真实站点，再以授权方式建立账号数据连接。**

### 流程状态机

```
                    ┌──────────────┐
                    │     INIT     │
                    └──────┬───────┘
                           │ 用户输入 URL
                           ▼
                    ┌──────────────┐
                    │  URL_INPUT   │
                    └──────┬───────┘
                      ┌────┴────┐
                      │         │
                   无效        有效
                      │         │
                      ▼         ▼
               ┌──────────┐ ┌──────────────────┐
               │INVALID_   │ │SITE_RECOGNIZING  │
               │  URL      │ │ 自动识别站点/检测 │
               └──────────┘ └────────┬─────────┘
                                  ┌──┴──┐
                                  │     │
                               不支持  识别成功
                                  │     │
                                  ▼     ▼
                          ┌──────────┐ ┌──────────────────┐
                          │UNSUPPORT-│ │ SITE_RECOGNIZED  │
                          │ ED_SITE  │ │ 展示识别结果      │
                          └──────────┘ └────────┬─────────┘
                                                │
                                                ▼
                                      ┌──────────────────┐
                                      │AUTH_CONFIRM_     │
                                      │  REQUIRED        │
                                      │ 等待用户授权确认  │
                                      └────────┬─────────┘
                                           ┌───┴───┐
                                           │       │
                                        拒绝    确认同意
                                           │       │
                                           ▼       ▼
                                   ┌──────────┐ ┌──────────────────┐
                                   │AUTH_     │ │THIRD_PARTY_      │
                                   │ REJECTED │ │ AUTHORIZING      │
                                   └──────────┘ │ OAuth/令牌获取   │
                                                 └────────┬─────────┘
                                                      ┌───┴───┐
                                                      │       │
                                                   失败     成功
                                                      │       │
                                                      ▼       ▼
                                              ┌──────────┐ ┌──────────────────┐
                                              │ AUTH_    │ │ACCOUNT_INFO_    │
                                              │ FAILED   │ │ FETCHING        │
                                              └──────────┘ └────────┬─────────┘
                                                                 ┌───┴───┐
                                                                 │       │
                                                              失败     成功
                                                                 │       │
                                                                 ▼       ▼
                                                         ┌──────────┐ ┌──────────────────┐
                                                         │ACCOUNT_  │ │ACCOUNT_BIND_    │
                                                         │FETCH_    │ │ CONFIRM         │
                                                         │ FAILED   │ │ 写入持久化存储  │
                                                         └──────────┘ └────────┬─────────┘
                                                                              ┌───┴───┐
                                                                              │       │
                                                                           失败     成功
                                                                              │       │
                                                                              ▼       ▼
                                                                      ┌──────────┐ ┌──────────────┐
                                                                      │ BIND_    │ │ACCOUNT_BOUND │
                                                                      │ FAILED   │ │ 绑定完成     │
                                                                      └──────────┘ └──────┬───────┘
                                                                                           │
                                                                                           ▼
                                                                                  ┌──────────────────┐
                                                                                  │ AGENT_ANALYZING  │
                                                                                  │ 加载历史数据/基线 │
                                                                                  └────────┬─────────┘
                                                                                           │
                                                                                           ▼
                                                                                  ┌──────────────────┐
                                                                                  │  SIGNAL_READY    │
                                                                                  │ ★ 最终状态       │
                                                                                  └──────────────────┘
```

### 状态定义 (11 个正常状态 + 7 个异常状态)

| 状态 | 说明 | 用户可见 |
|------|------|----------|
| `INIT` | 初始状态，等待输入 URL | 输入框 |
| `URL_INPUT` | 输入 + 校验 URL 格式 | 输入中 + 实时校验 |
| `SITE_RECOGNIZING` | 系统自动识别站点 | 加载动画 + "正在识别..." |
| `SITE_RECOGNIZED` | 识别完成，展示站点信息 | 平台名称/LOGO/游戏/支持列表 |
| `AUTH_CONFIRM_REQUIRED` | 等待用户授权确认 | 授权范围 + 安全声明 + [确认/拒绝] |
| `THIRD_PARTY_AUTHORIZING` | 执行三方授权 | OAuth 跳转/加载 |
| `ACCOUNT_INFO_FETCHING` | 获取三方账号基本信息 | 加载中 |
| `ACCOUNT_BIND_CONFIRM` | 写入绑定数据 | — |
| `ACCOUNT_BOUND` | 绑定完成，数据可用 | "绑定成功" |
| `AGENT_ANALYZING` | Agent 首次分析数据 | "正在分析数据..." |
| `SIGNAL_READY` | **终态** — Agent 就绪 | "就绪，开始预测" |

### 异常状态

| 异常 | 触发条件 | 可恢复 | 恢复路径 |
|------|----------|--------|----------|
| `INVALID_URL` | URL 格式错误 | 是 | 重新输入 |
| `UNSUPPORTED_SITE` | 站点不在支持列表 | 是 | 重新输入 |
| `AUTH_REJECTED` | 用户拒绝授权 | 是 | 重新发起授权 |
| `AUTH_FAILED` | OAuth 超时/令牌获取失败 | 是 | 重试 |
| `ACCOUNT_FETCH_FAILED` | 三方 API 超时/数据异常 | 是 | 重试 |
| `ACCOUNT_ALREADY_BOUND` | 该账号已绑定（跨阶段检测） | 条件性 | 查看/解绑 |
| `BIND_FAILED` | 持久化写入失败 | 是 | 重试 |

### 授权数据边界

**允许读取：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `platformUserId` | string | 三方平台用户 ID |
| `nickname` | string | 用户昵称 |
| `avatar` | string | 头像 URL |
| `gameAccountId` | string | 游戏账号 ID |
| `siteDomain` | string | 站点域名 |
| `supportedGames` | string[] | 支持的游戏列表 |
| `authorizationStatus` | enum | 授权状态 |
| `bindTime` | DateTime | 绑定时间 |

**明确禁止：** 密码 / 私钥/API Key / 支付权限 / 提现权限 / 个人身份信息 (PII)

### 领域实体: ThirdPartyAccount

```typescript
interface ThirdPartyAccount {
  bindingId: string;              // 唯一绑定标识
  platformUserId: string;         // 三方平台用户 ID
  nickname: string;               // 用户昵称
  avatar: string;                 // 头像 URL
  gameAccountId: string;          // 游戏账号 ID
  siteDomain: string;             // 站点域名
  provider: GameProvider;         // 平台类型 (PG_SOFT/JILI/...)
  supportedGames: string[];       // 支持的游戏列表
  authorizationStatus: AuthorizationStatus;  // AUTHORIZED/EXPIRED/REVOKED/PENDING
  authorizationMethod: AuthorizationMethod;  // OAUTH/COOKIE/API_KEY
  bindTime: string;               // ISO-8601 绑定时间
  lastVerifiedAt: string;         // 最近授权验证时间
  createdAt: string;              // ISO-8601
  updatedAt: string;              // ISO-8601
}
```

### 授权范围声明

> **VIB AI Agent 将获取以下权限：**
> - 读取游戏账号基础信息（昵称、头像、账号 ID）
> - 读取游戏历史数据和统计数据
> - 基于数据提供 AI 预测分析
>
> **VIB AI Agent 不会：**
> - 读取或存储您的密码
> - 执行任何支付或提现操作
> - 在您的账号上执行游戏操作
> - 将数据分享给第三方

---

## 5. Eval Fixtures + Regression Baseline

### Fixture 分类体系

评估夹具 (fixtures) 是纯数据对象，用于验证评估管线而无需真实 LLM 调用。

| 分类 | 文件 | 数量 | 用途 |
|------|------|------|------|
| `prediction-success` | `evals/fixtures/prediction-success.ts` | 3 | 标准预测成功场景的回归校验 |
| `prediction-failure` | `evals/fixtures/prediction-failure.ts` | 3 | 边界/异常预测场景 |
| `empty-results` | `evals/fixtures/empty-results.ts` | 3 | NaN 回归检测、空结果健壮性 |
| `baseline-comparison` | `evals/fixtures/baseline-comparison.ts` | 3 | 内部一致性校验 |

### Fixture 结构

```typescript
interface EvalFixture {
  id: string;                    // 唯一标识 (PRED-SUCCESS-001)
  taskId: string;                // 任务 ID
  category: string;              // 分类
  input: string;                 // Agent 输入
  expectedOutput?: string;       // 预期输出 (可选)
  expectedBehavior: string;      // 预期行为描述
  score: number;                 // 分数 0.0–1.0
  confidence: number;            // 置信度 0.0–1.0
  actualOutcome: string;         // 实际结果描述
  tags: string[];                // 标签
}
```

### 回归校验项

| 校验 | 说明 |
|------|------|
| Schema 校验 | score/confidence 范围 [0,1], taskId 非空, input 为字符串 |
| NaN 回归 | `summarize([])` 不产生 NaN, 空结果完整性 |
| 校准排除 | 非 PRED 前缀的 taskId 排除在校准计算外 |
| 最小校准点 | < 3 个数据点不生成校准图 |
| 内部一致性 | SUCCESS → score >= 0.5, FAILURE → score <= 0.5 |

### 运行命令

```bash
npm run dev eval fixtures     # 运行所有 fixture 回归校验
npm run dev eval load-test    # 10 次连续预测 + 延迟分布
npm run dev eval all          # 运行所有评测场景
```

---

## 6. Trace / Telemetry / Metrics

### 结构化日志 (src/logger.ts)

JSONL 格式输出到 stderr (stdout 保持纯净用于 Agent 响应)：

```json
{"t":"2026-05-06T01:20:00Z","l":"INFO","m":"agent.run.start","traceId":"abc123","data":{"input":"预测 Gemini"}}
{"t":"2026-05-06T01:20:03Z","l":"WARN","m":"llm.retry","traceId":"abc123","data":{"attempt":2,"error":"429 rate limit"}}
{"t":"2026-05-06T01:20:05Z","l":"ERROR","m":"tool.failed","traceId":"abc123","data":{"tool":"predict_game","error":"timeout"}}
```

查看方式：
```bash
npm run dev once "预测结果" 2>&1 | grep '{"t":' | jq .
npm run dev log              # 解析格式化显示最近日志
```

### 执行追踪 (src/tracer.ts)

嵌套 Span 记录每次 Agent 迭代、LLM 调用、工具执行的耗时：

```
Trace: abc123

─ agent.iteration (1200ms) {"iteration":1}
  └─ llm.chat (800ms) {"model":"deepseek-chat","totalTokens":156}
    └─ llm.retry (200ms) {"attempt":2}
  └─ tool.predict_game (300ms) {"args":{...}}
```

查看方式：
```bash
npm run dev trace             # 显示当前会话追踪树
```

### 指标收集 (src/telemetry.ts)

| 指标 | 范围 | 说明 |
|------|------|------|
| LLM 调用计数 | 会话 | 总调用次数 |
| 平均延迟 | 会话 | LLM 和工具的平均响应时间 |
| Token 用量 | 会话 | prompt/completion/total tokens |
| 成功率 | 会话 | 成功调用 / 总调用比例 |
| 按工具细分 | 会话 | 每个工具的调用次数/延迟/成功率 |

查看方式：
```bash
npm run dev metrics           # 显示会话指标面板
```

### 数据持久化

每次 run 结束自动保存到 `$TMPDIR/vib-ai-agent/`：
- `last-trace.json` — 最后一次执行的 span 数据
- `last-metrics.json` — 最后一次执行的指标数据

跨进程共享：`once` 模式写完数据后，`metrics`/`trace` 模式可读取。

---

## 7. ToolContext 解耦说明

### 问题

`src/tools/design-system.ts` 原代码直接 `import { readFile } from "node:fs/promises"`，导致：
1. **不可测试** — 单元测试需要真实文件系统
2. **硬编码依赖** — 无法替换文件系统实现
3. **上下文耦合** — 工具与运行时环境紧绑定

### 解决方案: FsAdapter 接口

```typescript
// src/tools/fs-adapter.ts
export interface FsAdapter {
  readFile(path: string): Promise<string>;
}
```

### 实现

| 类 | 说明 |
|------|------|
| `NodeFsAdapter` | 生产环境 — 惰性动态 `import("node:fs/promises")`，避免启动时加载 |
| `MockFsAdapter` | 测试环境 — 内存 `Map<string, string>`，支持 `setFile()` 注入假数据 |

### 注入点: ToolContext.fs

```typescript
// src/tools/index.ts
export interface ToolContext {
  projectRoot: string;
  designSystemPath: string;
  fs?: { readFile(path: string): Promise<string> };  // DI 注入点
}
```

`design-system.ts` 使用：
```typescript
const resolver = ctx.fs ?? NodeFsAdapter;  // 有注入用注入，无注入用默认
```

### 测试示例

```typescript
const mockFs = new MockFsAdapter({
  "/root/design-system/tokens/colors.css": "--vib-color-primary: #4E41FF;",
});
const ctx: ToolContext = {
  projectRoot: "/root",
  designSystemPath: "/root",
  fs: mockFs,
};
const result = await handler({ category: "colors" }, ctx);
expect(result).toContain("#4E41FF");
```

### 解耦效果

| 指标 | 重构前 | 重构后 |
|------|--------|--------|
| 直接 node:fs 依赖 | design-system.ts | fs-adapter.ts (集中) |
| 文件系统 mock | 不可能 | 3 行构造 |
| 工具可测试性 | 需真实文件 | 内存 mock, 0 I/O |
| 新增文件系统适配 | 修改工具代码 | 只加 FsAdapter 实现 |

---

## 8. CLI 使用指南

### 启动方式

```bash
npm run dev                    # 交互式 REPL 模式
npm run dev once <prompt>      # 单次执行
npm run dev workflow <task>    # Plan→Execute→Review→Refine 工作流
```

### 评估命令

```bash
npm run dev eval all           # 运行全部评测
npm run dev eval fixtures      # 运行 Fixture 回归校验
npm run dev eval load-test     # 负载测试 (10 次连续预测)
```

### 工具与检查

```bash
npm run dev tasks              # 列出所有注册 Task
npm run dev check              # 验证 LLM 连通性
```

### 可观测性

```bash
npm run dev log                # 查看结构化日志
npm run dev metrics            # 查看会话指标
npm run dev trace              # 查看执行追踪树
```

### 开发命令

| 命令 | 说明 |
|------|------|
| `npm run build` | TypeScript 编译 |
| `npm run typecheck` | 类型检查 (`tsc --noEmit`) |
| `npm test` | 运行全部测试 (vitest) |
| `npm run test:watch` | 监听模式 |
| `npx tsx skills/<name>.ts` | 运行单个 Skill |

### 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `DEEPSEEK_API_KEY` | 是 | — | DeepSeek API Key |
| `LLM_BASE_URL` | 否 | `https://api.deepseek.com` | API 端点 |
| `LLM_MODEL` | 否 | `deepseek-chat` | 模型名称 |
| `LLM_TEMPERATURE` | 否 | `0.7` | 温度参数 |
| `LLM_TIMEOUT_MS` | 否 | `30000` | 超时（毫秒） |

### 注册 Task

| ID | Name | 领域 | 输入 |
|----|------|------|------|
| TASK-001 | game-prediction-quick | game-prediction | game (required), mode (optional) |
| TASK-002 | game-metrics | game-prediction | game (required), timeframe (optional) |
| TASK-003 | read-design-tokens | design-system | category (optional) |
| TASK-004 | generate-component-css | design-system | component (required), variant (optional) |
| TASK-005 | workflow-plan-execute-review | workflow | task (required) |

---

## 9. 下一阶段 Roadmap

### Milestone 1: Foundation ✅ (当前 — 2026-05-10)

- [x] 项目骨架 (package.json, tsconfig, env)
- [x] Agent 核心 (ReAct loop, LLM client, workflow)
- [x] 设计系统 (Figma tokens, preview, brand)
- [x] OpenClaw + Claude Code Skills 框架
- [x] Task Catalog (5 tasks)
- [x] Evaluation Framework + Fixture Regression
- [x] Baseline Benchmark (82.5%)

### Milestone 2: Agent Capability (2026-05 中旬)

| 目标 | 说明 |
|------|------|
| 游戏预测 domain logic | 从 placeholder 启发式 → 真实 DeepSeek 模型推理 |
| 设计系统 → Agent 直通 | 自然语言 → Token CSS 全自动 |
| Figma 增量导入 | 检测变更而非全量提取 |
| Task Success Rate | ≥ 60% |

### Milestone 3: Production Ready (2026-05 底)

| 目标 | 说明 |
|------|------|
| 10+ 注册任务 | 全部可跑通 |
| Task Success Rate | ≥ 85% |
| CI 评测流水线 | 自动触发 + 报告 |
| 游戏供应商 | 支持 > 3 个 (当前 6 个已建模) |
| Agent 记忆 | claude-mem 深度集成 |

### 优先级矩阵

```
高影响 ┼──────────────────────────────────
      │                                │
      │  QUICK WIN                    │  MAJOR
      │  • Task Catalog ✅            │  • Game prediction logic
      │  • Eval framework ✅          │  • CI evaluation pipeline
      │  • Domain model ✅            │
      │                                │
      ├────────────────────────────────┤
      │                                │
      │  FILL-IN                      │  INVESTIGATE
      │  • More scenarios             │  • Multi-game support
      │  • Benchmark reports          │  • claude-mem deep integration
      │                                │
  低   └────────────────────────────────┘
      低  努力度                      高  努力度
```

### 当前缺口 (7 个工程维度)

| 维度 | 状态 | 说明 |
|------|------|------|
| **可观测性** | ✅ | Logger + Tracer + Telemetry 完成 |
| **配置管理** | ✅ | env → yaml → default 三级 |
| **容错设计** | ✅ | LLM 重试 + timeout + workflow safeChat |
| **依赖注入** | ✅ | FsAdapter + ToolContext 解耦 |
| 状态持久化 | ❌ | 当前内存存储，无数据库 |
| 并发控制 | ❌ | 单用户场景优先级低 |
| 版本兼容 | ❌ | 出现后再处理 |

---

> 文档版本: 1.0 · 最后更新: 2026-05-06 · 更多信息: `docs/` 目录
>
> 架构可视化: `docs/multi-agent-architecture.html` (浏览器打开)
> 领域模型: `docs/domain-model.md`
> 状态机: `docs/signal-flow-state-machine.md`
> PRD 模板: `docs/vib-agent-prd-template.md`
