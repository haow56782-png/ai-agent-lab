# 多 Agent 编排执行 — 实践指南与经验技巧

> 基于 VIB AI Agent Platform 的真实项目经验 · 2026 Q2
> 架构: Claude (Planner) → OpenClaw/Ruflo (Orchestration) → DeepSeek (Executor) → Node.js/TS (Runtime)

---

## 目录

1. [架构决策篇](#1-架构决策篇)
2. [编排模式篇](#2-编排模式篇)
3. [执行反馈篇](#3-执行反馈篇)
4. [容错与可观测性篇](#4-容错与可观测性篇)
5. [测试与评估篇](#5-测试与评估篇)
6. [Skill 工程篇](#6-skill-工程篇)
7. [经验陷阱篇](#7-经验陷阱篇)

---

## 1. 架构决策篇

### 1.1 为什么选 Claude + DeepSeek 双模型

**决策：** Claude Code 做规划推理 (Planner)，DeepSeek API 做批量执行 (Executor)。

**原因：**

| 维度 | Claude (Planner) | DeepSeek (Executor) |
|------|-------------------|---------------------|
| 推理深度 | 强 — 擅长复杂任务分解 | 中 — 适合明确指令 |
| 成本 | 高 (按次计费) | 低 (~1/10 成本) |
| 上下文窗口 | 大 (200K) | 中 (128K) |
| 速度 | 中 | 快 |
| 适用场景 | 架构设计、任务规划、代码审查 | 批量生成、内容执行、数据提取 |

**经验：** 不要在 Executor 上做规划推理，也不要在 Planner 上做批量生成。边界清晰的"规划-执行"分离是双模型架构成功的前提。一个典型反例：让 DeepSeek 自行规划多步骤任务 → 输出质量不稳定。

### 1.2 ReAct Loop 的迭代上限

```typescript
// src/agent.ts — 核心循环
for (let i = 0; i < maxIterations; i++) {
  const response = await llm.chat(messages);
  // 检测工具调用模式: {"tool":"...","args":{...}}
  const toolMatch = response.match(/\{"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{.*?\})\s*\}/s);
  if (!toolMatch) return response; // 无工具调用 → 直接返回
  // 执行工具 → 结果追加到 messages → 下一轮迭代
}
```

**经验：** `maxIterations` 默认 10 是合理值。低于 3 会让复杂任务无法完成，高于 20 会在异常循环中浪费大量 Token。实际观测中，大部分任务在 2-4 次迭代内完成。

### 1.3 工具调用格式选择

**决策：** 使用 JSON 内联格式 `{"tool":"name","args":{...}}` 而非 OpenAI 原生的 `tool_calls` 参数。

**原因：**
- 原生 `tool_calls` 强依赖 OpenAI SDK 的请求格式，切换模型时需要重写客户端
- JSON 内联格式与模型无关 — Claude、DeepSeek、本地模型都能用
- 解析简单，调试时肉眼可读

**代价：** LLM 偶尔会生成格式错误的 JSON（引号不匹配、多行换行），需要 fallback 处理。解决方案：当 JSON.parse 失败时直接将响应作为文本返回，而不是报错。

```typescript
try {
  args = JSON.parse(toolMatch[2]!);
} catch {
  return response; // 格式错误 → 当作普通文本返回
}
```

---

## 2. 编排模式篇

### 2.1 三层编排体系

```
┌──────────────────────────────────────────────────────┐
│  Layer 1: Skill 编排 (OpenClaw / Claude Code Skills) │
│  能力单元注册 + 自动发现                               │
├──────────────────────────────────────────────────────┤
│  Layer 2: Workflow 编排 (Plan→Execute→Review→Refine) │
│  顺序管道 + 条件分支                                   │
├──────────────────────────────────────────────────────┤
│  Layer 3: Swarm 编排 (Ruflo V3)                      │
│  多 Agent 并行 + 分层网格 + 共识协调                   │
└──────────────────────────────────────────────────────┘
```

**经验：** 三层分层是必须的。跳过 Swarm 层做简单任务浪费资源，在 Workflow 层做复杂并行又不够灵活。原则：简单任务用 Layer 1，中等复杂度用 Layer 2，复杂多步骤用 Layer 3。

### 2.2 Plan → Execute → Review → Refine 工作流

```typescript
// src/workflow.ts — 核心流程
const plan = await safeChat(llm, [...], "[Plan failed]");
const output = await safeChat(llm, [...], "[Execute failed]");
const review = await safeChat(llm, [...], "[Review failed]");
if (needsRefinement(review)) {
  refined = await safeChat(llm, [...], "[Refine failed]");
}
```

**关键发现：** LLM 的 Review 阶段经常说"没问题"但实际上有问题。我们的否定词感知方案：

```typescript
const NEGATION_PATTERNS = [
  "no issue", "no fix", "no error", "no bug",
  "all good", "looks good", "no need",
  "nothing to", "doesn't require",
];

export function needsRefinement(review: string): boolean {
  const lower = review.toLowerCase();
  const hasSignal =
    lower.includes("issue") || lower.includes("fix") ||
    lower.includes("error") || lower.includes("bug");
  if (!hasSignal) return false;
  return !NEGATION_PATTERNS.some((p) => lower.includes(p));
}
```

**经验：** 踩过一个坑 — 最开始 NEGATION_PATTERNS 里没有 "no bug"，导致 "No bug detected" 触发了 refine。实践中需要持续补充否定词表，每发现一个 false positive 就加一条。

### 2.3 每个 Stage 独立容错

```typescript
async function safeChat(llm, messages, fallback): Promise<string> {
  try { return await llm.chat(messages); }
  catch (err) {
    return `${fallback}: ${err.message}`;
  }
}
```

**经验：** 不这么做的话，任何一个 LLM 调用失败都会导致整个 workflow 崩溃，前面所有 stage 白做。实际运营中，Plan 阶段的失败率约 2%，Review 阶段约 5%（因为上下文更长）。独立容错让失败 stage 输出占位符，不影响其他 stage 的结果。

---

## 3. 执行反馈篇

### 3.1 工具执行的反馈闭环

```
LLM 输出工具调用 → Runtime 执行 → 结果追加到 messages → LLM 继续推理
                                 ↓
                          失败时追加错误信息
```

**经验：** 工具执行结果直接 append 到 `messages` 数组是 ReAct 模式的核心。这里有两个实践要点：

1. **成功和失败都追加** — 失败信息包含 error message，让 LLM 可以自行调整策略
2. **结果要结构化** — 用 markdown code block 包裹工具返回，方便 LLM 解析

```typescript
// 成功
messages.push({
  role: "user",
  content: `Tool "${toolName}" returned:\n\`\`\`\n${result}\n\`\`\`\nContinue with the task.`,
});
// 失败
messages.push({
  role: "user",
  content: `Tool "${toolName}" error: ${err}`,
});
```

### 3.2 LLM 调用重试策略

```typescript
// src/llm.ts — 重试逻辑
function isRetryable(error): boolean {
  if (error instanceof OpenAI.APIError) {
    return error.status === 429 || (error.status >= 500 && error.status < 600);
  }
  if (error instanceof TypeError) return true; // 网络错误
  return false;
}

// 指数退避
const delay = retryDelayMs * Math.pow(2, attempt - 1);
// 实际: 1000ms → 2000ms → 4000ms
```

**经验：**

| 错误码 | 是否重试 | 说明 |
|--------|----------|------|
| 429 Rate Limit | 是 | DeepSeek 常见，等 1-2 秒通常解决 |
| 5xx Server Error | 是 | 偶尔出现，重试通常成功 |
| 401/403 Auth | 否 | API Key 问题，重试无意义 |
| 400 Bad Request | 否 | 请求参数问题，重试无意义 |
| ECONNRESET | 是 | 网络抖动，重试通常成功 |

**重要：** 不要对所有错误重试。对我们早期日志的分析显示，约 15% 的 LLM 调用发生过重试，其中 429 占 60%，网络错误占 30%，5xx 占 10%。不重试 4xx 错误避免了无意义的重复调用。

### 3.3 指标驱动改进

每次 Agent run 结束后自动收集指标，数据驱动优化：

```bash
── LLM Calls ──────────────────────
  Count:          12
  Avg Latency:    2,341ms
  Success Rate:   92%
  Total Tokens:   45,678
  Last Model:     deepseek-chat

── Tool Calls ─────────────────────
  Count:          4
  Avg Latency:    156ms
  Success Rate:   100%

── Per-Tool Breakdown ────────────────
  predict_game_outcome: 2 calls, 180ms avg, 100% success
  read_design_tokens: 2 calls, 132ms avg, 100% success
```

**经验：** 从指标中我们发现：LLM 调用延迟的 P95 是 P50 的 3 倍（8s vs 2.5s），说明有长尾问题。定位后发现是某些请求的上下文特别长（累加多轮工具调用结果）。解决方案：考虑在 Milestone 2 实现消息窗口压缩。

---

## 4. 容错与可观测性篇

### 4.1 结构化日志实践

**原则：** stdout 留给 Agent 响应，stderr 输出结构化日志。

```typescript
// 日志格式：一行 JSON，可 pipe 到 jq
{"t":"2026-05-06T01:20:00Z","l":"INFO","m":"agent.run.start","traceId":"a1b2","data":{"input":"..."}}
{"t":"2026-05-06T01:20:03Z","l":"WARN","m":"llm.retry","traceId":"a1b2","data":{"attempt":2}}
{"t":"2026-05-06T01:20:05Z","l":"ERROR","m":"tool.failed","traceId":"a1b2","data":{"tool":"predict"}}
```

**经验：**
- **traceId 串联所有事件** — 没有 traceId 的日志几乎无法调试多步骤 Agent
- **三个级别足矣** — DEBUG 用于开发，INFO/WARN 用于日常，ERROR 用于告警
- **不要 log 敏感信息** — API Key、密码、私钥绝对不能进日志

### 4.2 嵌套 Span 追踪

```typescript
const span = beginSpan("llm.chat", { model: "deepseek-chat", messageCount: 5 });
// ... 执行 ...
endSpan(span, { latencyMs: 1200, totalTokens: 456 });
```

输出：
```
Trace: a1b2c3d4

─ agent.iteration (2450ms) {"iteration":1}
  └─ llm.chat (2100ms) {"model":"deepseek-chat","totalTokens":456}
  └─ tool.predict_game (180ms) {"args":{"game":"Gemini"}}
```

**经验：** Span 嵌套深度通常 2-3 层就够了。最深的情况是 `agent.iteration → llm.chat → llm.retry`，3 层。不需要过度嵌套。

### 4.3 Graceful Degradation

**原则：** 系统局部失败不应该导致整体不可用。

| 组件 | 降级策略 |
|------|----------|
| LLM API | 重试 3 次 → 返回占位符 |
| 工具执行 | 返回错误信息给 LLM，由 LLM 决定替代方案 |
| Workflow Stage | 单个 stage 失败返回 `[Stage failed]`，不影响其他 stage |
| 文件系统 | 依赖注入，可回退到默认适配器 |
| 配置文件 | 配置文件缺失 → 使用代码内默认值 |

---

## 5. 测试与评估篇

### 5.1 无 LLM 的 Fixture 回归测试

**核心思想：** 绝大多数测试不应该调用真实的 LLM API。用预定义的 fixture 数据验证管线逻辑。

```typescript
interface EvalFixture {
  id: string;
  taskId: string;
  category: "prediction-success" | "prediction-failure" | "empty-results" | "baseline-comparison";
  input: string;
  expectedBehavior: string;
  score: number;        // 0.0–1.0
  confidence: number;   // 0.0–1.0
  actualOutcome: string;
  tags: string[];
}
```

**校验内容：**
1. **Schema 校验** — score/confidence 在 [0,1] 范围内
2. **NaN 回归** — `summarize([])` 不会产生 NaN
3. **校准排除** — 非 PRED 的 taskId 排除在校准计算外
4. **最小校准点** — < 3 个数据点不生成校准图
5. **内部一致性** — SUCCESS → score >= 0.5, FAILURE → score <= 0.5

**经验：** 曾经有一个 bug — `summarize([])` 返回 `{ mean: NaN, stddev: NaN }`，导致下游图表渲染崩溃。Fixture runner 专门加了一个分类 "empty-results" 来检测这类空输入问题。建议每个数据管线都配一个空输入 fixture。

### 5.2 CI 集成

```yaml
# .github/workflows/ci.yml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
        env: { CI: "true" }
```

**经验：** 集成测试（需要真实 LLM API）在 CI 中用 `process.env.CI ? it.skip : it` 自动跳过。这避免了 CI 环境中需要配置 API Key，同时保留了本地开发时的端到端验证能力。

---

## 6. Skill 工程篇

### 6.1 Skill 发现机制的限制

**发现机制：** Claude Code 使用 `glob('.claude/skills/*/SKILL.md')` 发现 Skill。这是**单层 glob**，递归子目录不会被自动发现。

**影响：**
- `.claude/skills/my-skill/SKILL.md` ✅ 被发现
- `.claude/skills/my-skill/sub/NESTED.md` ❌ 不会被发现
- `.claude/skills/category/my-skill/SKILL.md` ❌ 不会被发现

**解决方案：** 使用 YAML frontmatter 的 `category` 字段做分类，而不是物理目录结构：

```yaml
---
name: "VIB Agent Product Domain"
description: "产品领域定义"
category: project-domain
---
```

**经验：** 想用子目录做分类是第一个本能反应，但 Claude Code 的 glob 不支持。用 frontmatter metadata 替代目录分类是更可靠的方案。

### 6.2 技能粒度控制

| Skill 大小 | 建议 | 说明 |
|-----------|------|------|
| < 50 行 | 太简单 | 考虑合并到相关 Skill |
| 50-200 行 | 合适 | 单领域知识，自包含 |
| 200-500 行 | 偏大 | 考虑拆分子领域 |
| > 500 行 | 危险 | 上下文占用太多，必须拆分 |

**经验：** 项目中最小的 Skill 是 `hooks-automation`（~60 行），最大的是 `sparc-methodology`（~300 行）。超过 200 行的 Skill 加载时会占用显著的系统提示空间，需要权衡领域完整性和上下文效率。

### 6.3 通用 vs 领域 Skill

```
通用 Skill（工具类）:
  pair-programming — 结对编程方法论，与具体项目无关
  skill-builder — 技能工厂模板，与具体项目无关
  
领域 Skill（业务类）:
  vib-agent-product-skill — 账号绑定领域定义，强依赖本项目
  game-prediction — 游戏预测业务逻辑，强依赖本项目
```

**经验：** 通用 Skill 可以跨项目复用（放在 `~/.claude/CLAUDE.md` 的全局配置中）。领域 Skill 应该随项目代码库一起提交（放在项目的 `.claude/skills/` 中）。我们在实战中把 product-domain skill 提交到了仓库中而把 pair-programming 保留在全局。

---

## 7. 经验陷阱篇

### 7.1 踩过的坑

#### 坑 1：LLM Chat 返回为空

**现象：** `response.choices[0]?.message?.content` 返回 `""`（空字符串）或 `null`。

**结论：** DeepSeek API 偶尔返回空 content（尤其是当 tool_calls 参数存在但没有实际工具调用时）。解决方案：

```typescript
const content = response.choices[0]?.message?.content ?? "";
```

**教训：** 永远为可选链加上 ?? fallback。LLM API 的响应格式不能假设 100% 一致。

#### 坑 2：否定词导致误触发

**现象：** Review 输出 "No bug detected" 触发了 Refine 阶段，实际上 reviewer 认为代码没问题。

**根因：** `needsRefinement()` 只检查了关键词 `"bug"`，没有检查否定前缀。

**修复：** 加入否定词表，并且持续更新。

**教训：** LLM 输出中的关键词检测必须考虑否定语境。这不是 AI 理解问题，是工程防御问题。

#### 坑 3：node:fs 直接依赖导致工具不可测试

**现象：** `design-system.ts` 单元测试需要实际文件系统，无法在 CI 中可靠运行。

**根因：** 工具代码直接 `import { readFile } from "node:fs/promises"`。

**修复：** `FsAdapter` 接口 + `MockFsAdapter` 内存实现 + `ToolContext.fs` 注入点。

**教训：** 任何 I/O 操作（文件系统、网络、数据库）都应该通过可替换的接口进行。这不只是"最佳实践"——是让测试变得简单、快速、可靠的必要条件。

#### 坑 4：workflow 状态命令崩溃

**现象：** `ruflo workflow status` 报 `TypeError: Cannot read properties of undefined (reading 'duration')`。

**根因：** 没有运行过的 workflow 其 `result.metrics` 是 `undefined`，代码直接 `.duration` 解引用。

**修复：** `result.metrics ? result.metrics.duration : '-'` 和 `result.stages ?? []`。

**教训：** 任何来自 JSON parse 或运行时状态的数据，使用前都要假设可能为 null/undefined。

#### 坑 5：Task catalog JSON 中的数组方法

**现象：** Ruflo Task runtime 中 `.join()` 在 `undefined` 上调用。

**根因：** 任务数据中的 tags 数组在某些 task 定义中不存在。

**修复：** 5 处 null-guard 补丁，全部来自 `undefined.join()` 模式。

**教训：** JavaScript 的 `.` 运算符不会自动 null-check。TypeScript 的 `strictNullChecks` 在运行时不能救命——从 JSON 解析的数据类型只是"声明"，不是"保证"。

### 7.2 经验法则总结

| 法则 | 说明 |
|------|------|
| **所有 API 调用都要重试** | LLM API 的不可靠是常态，不是异常。3 次指数退避是基线 |
| **不要假设 LLM 输出格式** | JSON 可能格式错误，内容可能为空，工具调用可能有语法错误 |
| **日志必须带 traceId** | 没有关联 ID 的日志在多步骤 Agent 调试中基本没用 |
| **I/O 要依赖注入** | 文件系统、HTTP 请求、数据库都需要可替换接口 |
| **空输入要有 fixture** | `summarize([])` 不产生 NaN 是基本功，但容易忽略 |
| **否定词表要持续维护** | 每发现一个 false positive 就加一条规则 |
| **单层 glob 是硬约束** | Claude Code Skill 发现不支持递归子目录 |
| **成本数据指导架构** | Planner 用强模型、Executor 用低成本模型的分层策略来自实际成本分析 |
| **Stage 独立容错** | Workflow 的每个阶段独立 try-catch，防止单点拖垮全局 |
| **不要对 4xx 重试** | 401/403/400 是客户端问题，重试只会浪费时间和配额 |

### 7.3 推荐的工具链

| 工具 | 用途 | 备注 |
|------|------|------|
| `tsx` | TypeScript 直接运行 | 比 ts-node 快 10x，REPL 模式好 |
| `vitest` | 测试框架 | 兼容 jest API，原生 ESM 支持 |
| `jq` | JSON 日志解析 | `npm run dev 2>&1 \| grep '{"t":' \| jq .` |
| `gh` | GitHub CLI | PR/Issue/CI 全链路 |
| `ruflo` | Agent 工作流编排 | V3 支持 swarm 并行 + Workflow 模板 |
| `claude-mem MCP` | 持久化记忆 + 代码搜索 | `smart_search()` 基于 tree-sitter |

---

> 最后更新: 2026-05-06 · 持续迭代中
>
> 相关文档：`docs/notion-import-vib-agent-platform.md` (项目全览) · `docs/multi-agent-architecture.html` (架构可视化)
