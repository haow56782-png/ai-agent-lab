# AI Agent 项目转型实录 — 从单 Agent Demo 到可观测可编排平台

> 项目: VIB AI Agent Platform · 转型周期: 2026 Q2 · 基线: 单 Agent Demo → 生产级多 Agent 编排平台

---

## 转型全景

```
转型前 (Demo)                               转型后 (Platform)
─────────────────                        ─────────────────────
单 Agent ReAct Loop                       Claude + DeepSeek + Swarm
console.log 调试                          结构化 JSON 日志 + traceId 串联
无测试                                    85 tests + fixture 回归基线
硬编码配置                                env → yaml → default 三级覆盖
工具直接 import node:fs                   FsAdapter 接口 + DI 注入
无 Skill 体系                             12 个 Skills + MCP 工具链
无编排能力                                OpenClaw + Ruflo V3 + Workflow
无评估                                    5 个注册 Task + Eval Framework
无记忆                                    claude-mem 持久化搜索
无 CI                                     GitHub Actions 自动化
```

---

## 第一章：转型方法论

### 1.1 缺口驱动转型

转型不是一次"大爆炸"重写，而是逐个填补工程缺口的迭代过程。我们从 7 个维度评估项目健康度：

```
可观测性 ████████░░  80%  ← 本次补完
容错     ██████░░░░  60%  ← 本次补完
配置管理  ████████░░  80%  ← 本次补完
依赖注入  ██████░░░░  60%  ← 本次补完
状态持久化 ░░░░░░░░░░   0%  ← 下一阶段
并发控制  ░░░░░░░░░░   0%  ← 延后
版本兼容  ░░░░░░░░░░   0%  ← 延后
```

**核心原则：按成本/杠杆排序，先补性价比最高的缺口。**

| 优先级 | 维度 | 成本 | 杠杆 | 理由 |
|--------|------|------|------|------|
| P0 | 可观测性 | 低 | 高 | 否则改进全在瞎猜 |
| P0 | 配置管理 | 低 | 高 | 消灭硬编码，一次投入永久受益 |
| P0 | 容错设计 | 中 | 高 | LLM API 不可靠是常态 |
| P0 | 依赖注入 | 中 | 高 | 让测试成为可能 |
| P1 | 状态持久化 | 高 | 中 | 需要数据库选型 |
| P2 | 并发控制 | 高 | 低 | 当前单用户场景 |
| P2 | 版本兼容 | 中 | 低 | 出现后再处理 |

### 1.2 缺口优先级决策流程

发现缺口后，按以下流程决定"修不修、何时修"：

```
                    ┌──────────────┐
                    │  发现缺口     │
                    │  (维度评分<60%)│
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  评估影响范围  │
                    │  哪些模块受影响 │
                    │  用户是否感知  │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │  成本/杠杆分析    │
                    │  成本: 低/中/高   │
                    │  杠杆: 低/中/高   │
                    └──────┬───────┘
                           │
                     ┌─────┴──────┐
                     │            │
                  高杠杆        低杠杆
                     │            │
                     ▼            ▼
              ┌──────────┐  ┌──────────┐
              │  P0/P1   │  │   暂缓   │
              │  立即修复  │  │  记录待办 │
              └────┬─────┘  └──────────┘
                   │
                   ▼
         ┌────────────────────┐
         │  制定修复计划       │
         │  接口 → 测试 → 实现 │
         └────────────────────┘
```

**决策要点：**

| 因素 | 倾向立即修复 | 倾向暂缓 |
|------|-------------|----------|
| 影响用户 | 是（功能不可用） | 否（内部质量属性） |
| 阻塞其他改进 | 是（前置依赖） | 否（独立维度） |
| 修复成本当前低 | 是（趁代码还少） | 否（需架构评审） |
| 数据可衡量 | 是（有指标可验证） | 否（效果无法量化） |

### 1.3 每个缺口的标准处理流程

```
                    ┌──────────────────────────────────┐
                    │  ① 评估影响范围                   │
                    │  扫描代码库: 哪些文件直接依赖？     │
                    │  哪些文件间接依赖？哪些文件需要修改？│
                    └──────────────┬───────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────┐
                    │  ② 设计接口/抽象层                │
                    │  先定义 interface/type            │
                    │  思考: 调用方需要什么？            │
                    │  不思考: 实现方有什么？            │
                    └──────────────┬───────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────┐
                    │  ③ 编写测试 (Mock 依赖)           │
                    │  验证接口语义:                     │
                    │  - 正常路径 → 期望结果             │
                    │  - 空输入 → 不崩溃                │
                    │  - 错误输入 → 明确错误             │
                    └──────────────┬───────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────┐
                    │  ④ 实现生产代码                   │
                    │  按接口契约实现                    │
                    │  保持实现简单                      │
                    └──────────────┬───────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────┐
                    │  ⑤ 验证                          │
                    │  tsc --noEmit → vitest →         │
                    │  npm run dev eval fixtures        │
                    └──────────────┬───────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────┐
                    │  ⑥ 提交 + 更新文档                │
                    │  git commit, 记录 WHY 而非 WHAT  │
                    └──────────────────────────────────┘
```

### 1.4 "先接口后实现"原则

这是转型中最关键的工程纪律。每个工程缺口的修复都遵循：

```
1. 定义接口 (interface/type)
2. 写测试 (mock 实现)
3. 写默认实现
4. 注册到系统
```

**实际案例 — FsAdapter：**

```
① interface FsAdapter { readFile(path: string): Promise<string> }
② MockFsAdapter implements FsAdapter (内存 Map, 用于测试)
③ NodeFsAdapter implements FsAdapter (惰性 import node:fs)
④ ToolContext.fs?: FsAdapter (注入点)
   const resolver = ctx.fs ?? NodeFsAdapter;
```

**为什么这是关键：** 如果先写默认实现再抽象接口，会不自觉把实现细节带入接口设计。先定义接口强迫你思考"调用方需要什么"而非"实现方有什么"。

---

## 第二章：可观测性转型

### 2.1 Agent 执行数据流

```
                      ┌──────────────────────────────────────┐
                      │          用户输入 Prompt              │
                      └──────────────────┬───────────────────┘
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │       Agent Runtime (agent.ts)        │
                      │                                      │
                      │  ① logger.info("agent.run.start")    │
                      │  ② traceId = beginTrace()            │
                      │  ③ metrics.setSession(sessionId)     │
                      └──────────────────┬───────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │             迭代循环                      │
                    │                                         │
                    │  ┌────────────┐    ┌──────────────┐      │
                    │  │ LLM Chat   │ →  │ 含工具调用?   │      │
                    │  │ span+logger│    │ JSON 解析     │      │
                    │  └────────────┘    └──────┬───────┘      │
                    │                           │              │
                    │                     ┌─────┴──────┐       │
                    │                     │            │       │
                    │                   有工具调用    无工具调用 │
                    │                     │            │       │
                    │                     ▼            ▼       │
                    │              ┌──────────┐   ┌──────────┐ │
                    │              │ 执行工具  │   │ 返回结果  │ │
                    │              │ execute  │   │ endSpan  │ │
                    │              │ ToolCall │   │ logger   │ │
                    │              │ .complete│   │          │ │
                    │              └────┬─────┘   └──────────┘ │
                    │                   │                       │
                    │            ┌──────┴──────┐                │
                    │            │             │                │
                    │          成功           失败              │
                    │            │             │                │
                    │            ▼             ▼                │
                    │    ┌────────────┐  ┌────────────┐        │
                    │    │ 追加结果到  │  │ 追加错误到  │        │
                    │    │ messages   │  │ messages   │        │
                    │    └────────────┘  └────────────┘        │
                    │           │             │                 │
                    └───────────┴──────┬──────┘────────────────┘
                                       │
                                       ▼
                      ┌──────────────────────────────────────┐
                      │      Agent Run 完成                    │
                      │  logger.info("agent.run.complete")    │
                      │  persistRunData()                     │
                      │  (保存 trace + metrics 到 tmpdir)      │
                      └──────────────────────────────────────┘
```

**三件套在流程中的角色：**

```
Logger:    agent.run.start → llm.chat → tool.call → agent.run.complete
           每个事件一行 JSON 到 stderr，traceId 串联所有事件

Tracer:    beginTrace() → beginSpan("agent.iteration")
            → beginSpan("llm.chat") → endSpan → endSpan
           嵌套 span，记录每个步骤的耗时

Telemetry: recordLLMCall({ model, latencyMs, tokens, success })
           recordToolCall({ name, latencyMs, success })
           退出时 formatMetrics() 输出统计面板
```

### 2.2 从 console.log 到结构化日志

**转型前：**
```typescript
console.log("Agent started, input:", input);
console.log("Tool call:", toolName);
console.error("Error:", err);
// → 无法 grep, 无法关联, 无法结构化分析
```

**转型后：**
```typescript
logger.setTraceId(traceId);
logger.info("agent.run.start", { input: userInput });
logger.warn("llm.retry", { attempt: 2, error: err.message });
logger.error("tool.failed", { tool: "predict_game", error: err.message });
// → {"t":"ISO","l":"INFO","m":"agent.run.start","traceId":"abc","data":{...}}
```

### 2.3 三件套设计

| 组件 | 职责 | 输出 | 查看命令 |
|------|------|------|----------|
| **Logger** | 事件记录 | JSONL → stderr | `npm run dev log` |
| **Tracer** | 嵌套耗时追踪 | Span 树 | `npm run dev trace` |
| **Telemetry** | 指标聚合 | LLM/Tool 统计面板 | `npm run dev metrics` |

### 2.4 关键决策：stdout vs stderr 分离

**决策：** 日志输出到 stderr，Agent 响应保持在 stdout。

**原因：** 避免日志污染 Agent 输出。当 Agent 输出被 pipe 到其他工具或保存到文件时，日志行不应该混入。

```bash
# 查看日志
npm run dev once "预测" 2>&1 | grep '{"t":' | jq .

# 只看 Agent 输出
npm run dev once "预测" 2>/dev/null

# 日志到文件，输出到终端
npm run dev once "预测" 2>agent.log
```

---

## 第三章：评估体系转型

### 3.1 测试策略决策流程

每次新增功能时，按以下流程决定测试策略：

```
                    ┌──────────────────────────────┐
                    │    新增功能 / 修复 Bug         │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  代码中是否涉及 I/O 或 LLM？    │
                    │  (文件/网络/API/数据库)         │
                    └──────────────┬───────────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     │                           │
                     是                          否
                     │                           │
                     ▼                           ▼
      ┌────────────────────────┐    ┌────────────────────────┐
      │  I/O 层可以抽象接口吗？  │    │  纯函数逻辑            │
      └────────────┬───────────┘    │  直接写单元测试         │
                   │                └────────────────────────┘
              ┌────┴────┐
              │         │
             能抽象     不能抽象
              │         │
              ▼         ▼
     ┌────────────┐  ┌────────────────┐
     │ 接口 + Mock │  │ 集成测试       │
     │ 单元测试    │  │ (需要真实依赖)  │
     │ CI 必跑    │  │ CI 跳过        │
     └────────────┘  └────────────────┘
                          │
                          ▼
                   ┌──────────────────────┐
                   │  LLM 调用是核心吗？    │
                   └──────────┬───────────┘
                          ┌───┴───┐
                          │       │
                         是      否
                          │       │
                          ▼       ▼
                ┌────────────┐ ┌────────────┐
                │ 少量 E2E   │ │ 普通集成   │
                │ fixture 可 │ │ 测试       │
                │ 替代? 是   │ └────────────┘
                │ → fixture │
                └────────────┘
```

**决策原则：能用 fixture 验证的就不用集成测试，能用接口 Mock 的就不用真实依赖。**

### 3.2 Fixture 回归校验流程

```
Fixture 定义 (evals/fixtures/*.ts)
         │
         ▼
loadAllFixtures() → 合并所有分类的 fixture
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  对每个 fixture 执行:                                │
│                                                     │
│  ┌─── Schema 校验 ──────────────────────────────┐   │
│  │  score ∈ [0,1]?  confidence ∈ [0,1]?         │   │
│  │  taskId 非空?  input 是 string?               │   │
│  └──────────────────────────────────────────────┘   │
│                           │                          │
│  ┌─── 分类专项校验 ────────────────────────────┐   │
│  │  empty-results → NaN 回归检测               │   │
│  │  prediction → 校准排除 + 可解析置信度       │   │
│  │  baseline → 内部一致性 (SUCCESS→score>=0.5) │   │
│  └──────────────────────────────────────────────┘   │
│                           │                          │
│  ┌─── 全局管线校验 ────────────────────────────┐   │
│  │  summarize([]) 不产生 NaN                    │   │
│  │  computeCalibration(<3点) 不生成图表         │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
                 生成 FixtureRegressionReport
                  passed / failed / errors / summary
```

### 3.3 从"手动测试"到"自动化评估"

**转型前：** 每次改完代码手动跑几个 prompt，看输出"感觉对不对"。

**转型后：** 85 个自动化测试 + 12 个 fixture 回归校验。

### 3.5 Fixture 驱动的回归思想

传统单元测试验证代码逻辑，Fixture 回归验证**数据管线的完整性**：

```
Fixture 定义 (纯数据)
  ├─ Schema 校验 (字段类型、范围)
  ├─ NaN 回归检测 (空输入不产生 NaN)
  ├─ 内部一致性校验 (SUCCESS→score>=0.5)
  ├─ 校准排除逻辑 (非 PRED 排除)
  └─ 最小数据点强制 (>3 才生成图表)
```

### 3.6 不调用 LLM 的评估

**核心洞察：** 评估管线本身（数据加载、校验、聚合、格式化）与 LLM 推理是正交的。绝大多数 bug 发生在管线逻辑中，而非 LLM 响应中。

```
测试金字塔 (AI Agent 项目)
┌──────────────────────────┐
│   集成测试 (需要 LLM)      │  ← 少量, CI 跳过
│    5-10 个场景             │
├──────────────────────────┤
│    Fixture 回归           │  ← 无 LLM, CI 必跑
│    12 个 fixture          │
├──────────────────────────┤
│    单元测试               │  ← 无 LLM, CI 必跑
│    70+ 测试用例           │
└──────────────────────────┘
```

### 3.7 注册任务 + 验收标准

每个 Task 在 `catalog.json` 中注册，包含明确的验收标准：

```json
{
  "id": "TASK-001",
  "name": "game-prediction-quick",
  "success_criteria": {
    "output_contains": ["game", "prediction", "confidence", "factors"],
    "confidence_range": [0.0, 1.0],
    "factors_min": 1,
    "latency_ms_max": 10000
  }
}
```

---

## 第四章：可扩展性转型

### 4.1 从硬编码到配置驱动

**转型前：**
```typescript
const maxTokens = 4096;
const temperature = 0.7;
const retryMax = 3;
```

**转型后：**
```typescript
const temperature = getConfig<number>("llm.temperature");  // 0.7
const retryMax = getConfig<number>("llm.retry.max");       // 3
// 覆盖方式: LLM_TEMPERATURE=0.1 npm run dev ...
```

三级覆盖策略：

```
代码默认值  ←  最低优先级
    ↑
config.yaml  ←  文件覆盖
    ↑
环境变量     ←  最高优先级 (LLM_TEMPERATURE)
```

### 4.2 从直接依赖到接口注入

**转型前：**
```typescript
import { readFile } from "node:fs/promises";
// → 测试必须访问真实文件系统
```

**转型后：**
```typescript
// 工具代码不知道也不关心文件来自哪里
const resolver = ctx.fs ?? NodeFsAdapter;
const content = await resolver.readFile(path);

// 测试代码
const mockFs = new MockFsAdapter({ "/path/file": "content" });
const result = await handler(args, { fs: mockFs, ... });
```

### 4.3 从单一模型到多模型协作

```
转型前:           转型后:
DeepSeek API     Claude (规划层) → DeepSeek (执行层)
                  ↑ 架构推理/复杂规划    ↑ 批量生成/低成本推理
                  
                  OpenClaw (编排层) → Swarm (并行层)
                  ↑ Skill 路由/组合      ↑ 多 Agent 共识/协调
```

**为什么不是单一模型？** 成本分析：

| 模型 | 100 次调用成本 | 推理质量 | 适合场景 |
|------|---------------|----------|----------|
| DeepSeek | ~$0.14 | 中 | 批量执行、内容生成 |
| Claude | ~$3.00 | 高 | 架构规划、代码审查 |

在一个 5 Task 的典型会话中，约 20% 的调用需要 Claude 级别的推理，80% 可以用 DeepSeek 完成。分层后可节省约 60% 的 API 成本。

---

## 第五章：MCP 编排转型

### 5.1 从无记忆到知识检索

**转型前：** 每次会话从零开始，不记得前一次的分析结果。

**转型后：** `claude-mem` MCP 提供持久化记忆：

```
搜索流程:
search(query) → 获取 ID 索引 (~50 tokens/result)
  ↓
timeline(anchor=ID) → 获取上下文 (~200 tokens)
  ↓
get_observations([IDs]) → 获取详情 (按需)
```

**关键设计：** 3 层搜索工作流控制 Token 消耗。不一次获取全部详情，而是先搜索索引，再精选少量 ID 获取详情。这个模式比一次性搜索节省约 90% 的 Token。

### 5.2 从无 Skill 到 12 Skill

**转型路径：**

```
Iteration 1: 直接写工具代码 (tools/)
  → 函数式, 无元数据, 无描述
  ↓
Iteration 2: Tool Registry (registerTool)
  → 注册制, 带 name/description/parameters
  ↓
Iteration 3: OpenClaw Skills (skills/)
  → TypeScript skill 定义, 可独立运行
  ↓
Iteration 4: Claude Code Skills (.claude/skills/)
  → SKILL.md 文件, Frontmatter 元数据, 自动发现
  ↓
Iteration 5: 领域 Skill (vib-agent-product-skill)
  → 产品领域定义, PRD 模板, 状态机文档
```

**每轮迭代的驱动力：**

| 迭代 | 痛点 | 解决方案 |
|------|------|----------|
| 1→2 | 工具散落各处，LLM 不知道有哪些工具 | Tool Registry + 描述 |
| 2→3 | 工具只能被 Agent 调用，不能独立运行 | OpenClaw Skills (tsx 直接跑) |
| 3→4 | 技能和工具概念重叠，发现不一致 | Claude Code Skills 统一发现 |
| 4→5 | 产品领域知识在代码中隐式存在 | 领域 Skill 显式文档化 |

### 5.3 从顺序执行到并行编排

| 模式 | Ruflo Skill | 适用场景 |
|------|-------------|----------|
| 顺序管道 | `stream-chain` | 有依赖的多步骤流程 |
| 多 Agent 并行 | `swarm-orchestration` | 独立任务的并行执行 |
| 高级并行 | `swarm-advanced` | 动态任务分配和共识 |
| 结对编程 | `pair-programming` | TDD + 代码审查 |
| 质量验证 | `verification-quality` | 真值评分 + 回滚 |

---

## 第六章：工程文化转型

### 6.1 从"能用就行"到"可观测才存在"

**转型前后思维对比：**

| 场景 | 转型前 | 转型后 |
|------|--------|--------|
| Agent 行为异常 | "重新跑一次" | 查 trace 看哪步耗时异常 |
| 工具调用失败 | "可能是 API 问题" | 查日志确认错误码和重试历史 |
| 性能问题 | "感觉变慢了" | 看 metrics 面板确认 P50/P95 |
| 测试失败 | "手动验证下" | `npm test` + `npm run dev eval fixtures` |

### 6.2 从"改完就提交"到"验证闭环"

```
转型前:
改代码 → git add → git commit

转型后:
改代码 → 类型检查 → 跑测试 → fixture 回归 → 文档更新 → git add → git commit
          ↑             ↑         ↑
        tsc --noEmit  vitest    npm run dev eval fixtures
```

### 6.3 从"问题驱动"到"缺口驱动"

**转型前：** 出了问题才解决（被动消防）。导致的后果：
- 同样的 bug 在不同地方反复出现（undefined.join 在 5 处 crash）
- 系统越来越脆弱，不敢重构

**转型后：** 从 7 个工程维度评估缺口，按 ROI 排序主动填补。效果：
- 可观测性补全 → 定位问题从小时级降到分钟级
- 容错设计补全 → LLM API 故障不再导致系统崩溃
- 依赖注入补全 → 测试覆盖率从 0 到 85 tests

---

## 第七章：具体经验数据

### 7.1 代码量增长轨迹

```
阶段         文件数  代码行  测试数
Demo           12     ~800     0
+ToolContext   15     ~1,200   12
+Observability 19     ~1,800   24
+Skills        22     ~2,200   24
+CI+Eval       27     ~2,800   57
+Fixtures      30     ~3,200   71
+Domain Doc    35     ~3,800   81
+Product Skill 39     ~4,434   85
```

**关键观察：** 测试代码的增长速度是业务代码的 1.5 倍。这不是"开销"，而是项目健康度的核心指标。

### 7.2 Bug 分布分析

在转型过程中修复的 bug 分类：

| Bug 类型 | 数量 | 根因模式 |
|----------|------|----------|
| `undefined.*` 操作 | 8 | 从 JSON/API 获取的数据假设存在 |
| LLM 输出格式异常 | 4 | LLM 返回空/格式错误的 JSON |
| 否定词误判 | 3 | 关键词检测未考虑否定语境 |
| I/O 路径错误 | 2 | 硬编码路径在不同环境下失效 |
| NaN 传播 | 2 | 空数组的统计计算产生 NaN |

**教训：** 70% 的 bug 属于"防御性编程不足"。不是逻辑复杂，是边界情况没处理。

### 7.3 测试投资回报

| 测试类型 | 编写耗时 | 发现 Bug | 运行时间 | ROI |
|----------|----------|----------|----------|-----|
| 单元测试 (70) | 4h | 12 | 3s | 高 |
| Fixture 回归 (12) | 1.5h | 5 | 0.5s | 极高 |
| 集成测试 (3) | 1h | 2 | 15s+LLM | 中 |

**结论：** Fixture 回归是 ROI 最高的测试类型。极低的维护成本，捕获了数据管线的关键 bug。

---

## 第八章：难点与注意事项（全领域）

### 8.1 可观测性难点

#### 日志量失控

**问题：** 加上结构化日志后，一次 Agent run 可能产生 20-50 行日志。如果每行都带完整的 traceId + data，单个会话可能产生数 MB 日志。

**实践方案：**

```
日志级别控制:
  DEBUG → 开发环境, 详细的 span start/end
  INFO  → 生产默认, agent.run.start/complete + tool.call
  WARN  → 重试、降级、非致命错误
  ERROR → 致命错误、LLM API 故障

实施:
  logger.debug("span.start", ...)  ← DEBUG, 默认不输出
  logger.info("tool.call", ...)    ← INFO, 始终输出
  getConfig<LogLevel>("log.level") ← 可配置
```

**注意：** 不要在热路径（hot path）中调用 `JSON.stringify` 构造大对象日志。`logger.info("data", { fullResponse })` 如果 `fullResponse` 包含 LLM 的完整输出（数千 token），每次日志都会序列化一次。解决方案：只记录摘要字段（token 数、延迟），完整内容通过 trace 文件持久化。

#### traceId 传递丢失

**问题：** traceId 通过模块级变量保存（`let _traceId`），在异步边界（async/await、Promise.all、事件回调）中可能丢失。

```typescript
// 危险模式: 异步操作中 traceId 可能被覆盖
logger.info("outer", { traceId });
await Promise.all([
  doSomething(),  // 内部可能 setTraceId(newId)
  doOther(),      // traceId 已被覆盖
]);
```

**实践方案：**
- 每个 Agent run 开始时 `setTraceId()`，结束时清除
- 避免在同一个 session 中并发修改 traceId
- Logger 的 `setTraceId` 设计为简单覆盖，不维护栈

#### 敏感信息过滤

**问题：** 日志中可能意外记录 API Key、用户输入中的密码、Token 等。

**实践方案：**

```
必须过滤的数据:
  - DEEPSEEK_API_KEY / 任何 API Key
  - 用户输入的密码/私钥（ThirdPartyAccount 禁止字段）
  - OAuth Token、Session Token

过滤策略:
  在 logger 入口处添加关键词过滤，对 data 对象递归扫描
  但实践中更可靠的方式是: 调用方保证不传敏感信息
```

### 8.2 评估体系难点

#### Fixture 过拟合

**问题：** 当 fixture 越来越多，测试可能只验证 fixture 定义的行为，而忽略真实场景的偏差。我们把这种情况称为"fixture 过拟合"。

```
症状:
  - 所有 fixture 都通过，但真实 LLM 调用结果不符合预期
  - 修改 fixture 数据让测试通过，而不是修改代码修 bug
  - fixture 数量增长但真实 bug 捕获率下降

预防:
  - fixture 只验证管线逻辑（数据加载、校验、聚合）
  - 不试图用 fixture 模拟 LLM 行为
  - 定期用真实 LLM 调用跑集成测试做校准
```

#### Fixture 维护成本

**问题：** 每个新功能都需要新增 fixture。如果 fixture 的定义成本过高，团队会绕过它。

**实践方案：**
- 每个 fixture 尽量简单（5-10 行数据定义）
- 用工厂函数创建 fixture，减少重复
- 新 fixture 必须至少覆盖一种异常路径

```typescript
// 好的 fixture: 简单、明确、突出变异点
{
  id: "PRED-SUCCESS-002",
  taskId: "PRED-002",
  category: "prediction-success",
  input: "predict Gemini outcome",
  expectedBehavior: "returns valid prediction",
  score: 0.85,
  confidence: 0.72,
  actualOutcome: "HIGH_PROBABILITY",
  tags: ["quick-mode", "known-game"],
}
```

#### CI 环境差异

**问题：** 本地通过的测试在 CI 中可能因为路径分隔符（`/` vs `\`）、时区、Node 版本差异而失败。

**实践方案：**
- 所有路径用 `node:path` 的 `join()` 构建
- 时间断言用 ISO-8601 字符串比较，不用 `new Date()` 隐式转换
- CI 使用 Node 20 LTS（与本地开发一致）

### 8.3 容错设计难点

#### 重试风暴

**问题：** 当 LLM API 出现大规模故障（不是单个请求超时，而是整个区域不可用），所有客户端同时重试会加剧服务端压力。

```
正常:     请求 → 超时 → 等1s → 重试 → 成功
重试风暴: 请求 → 超时 → 等1s → 重试 → 超时 → 等2s → 重试 → ...
          100个客户端同时这个模式 → API 更慢 → 更多超时
```

**实践方案：**
- 基础退避：`delayMs * 2^(attempt-1)` = 1s, 2s, 4s
- 加入 jitter（随机抖动）：`delay * (0.5 + Math.random() * 1.0)`
- 设最大重试次数（3 次），超限后快速失败
- 不重试 4xx 错误 —— 这是最重要的规则

#### 超时设置冲突

**问题：** LLM 调用超时设太短 → 正常慢响应也被截断；设太长 → 故障恢复慢。

```typescript
// 权衡:
timeoutMs: 30000
// 30s 足够覆盖 95% 的 DeepSeek 调用
// 但 P99 调用可能需要 60s+（长上下文 + 复杂推理）
```

**实践方案：**
- 默认 30s（覆盖 P95）
- 通过 `llm.timeoutMs` 可配置
- 长文档/复杂任务场景通过 config override 延长

#### Graceful Degradation 的边界

**问题：** 降级到什么程度用户还能接受？workflow 的 safeChat 返回 `[Plan failed]`，下游 stage 拿到这个占位符怎么办？

```
safeChat fallback: "[Plan failed]: connection timeout"
         ↓
Execute stage 输入:
  Task: 分析游戏数据
  Plan: [Plan failed]: connection timeout
         ↓
Execute 可能输出: "无法执行，因为没有计划"
         ↓
最终输出: 对用户完全无用的结果
```

**实践方案：**
- Fallback 文本要包含足够信息让下游能继续
- 但承认某些场景下降级就是不可用——这时候与其输出垃圾，不如直接报错
- 方案：`safeChat` 返回占位符，但在最终结果中暴露各 stage 是否成功的元数据

```typescript
return {
  plan: "[Plan failed]",
  output: "...",
  review: "...",
  stages: 4,
  stageStatus: {        // 新增元数据
    plan: "failed",
    execute: "ok",
    review: "ok",
    refine: "skipped",
  },
};
```

### 8.4 依赖注入难点

#### 接口粒度选择

**问题：** FsAdapter 目前只定义了 `readFile`。但未来需要 `writeFile`、`mkdir`、`exists` 时，是扩展现有接口还是定义新接口？

```
选择 A: 扩展现有接口
  interface FsAdapter {
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;  // 新增
    mkdir(path: string): Promise<void>;                       // 新增
  }
  优点: 统一入口
  缺点: 实现类必须实现所有方法，即使不需要

选择 B: 按用途拆分
  interface ReadOnlyFs { readFile(path: string): Promise<string>; }
  interface WritableFs extends ReadOnlyFs { writeFile(...); mkdir(...); }
  优点: 调用方只依赖自己需要的接口
  缺点: 接口数量膨胀
```

**实践方案：** 当前选 A（统一接口），因为:
- 当前只有 readFile 一个方法，接口很薄
- 等需要 writeFile 时再扩展，不提前设计
- YAGNI（You Ain't Gonna Need It）原则

#### Mock 与真实行为的偏差

**问题：** `MockFsAdapter` 模拟文件系统，但真实 `NodeFsAdapter` 的行为细节（编码、权限、符号链接）mock 无法覆盖。

```typescript
// Mock 通过
mockFs.setFile("/path/file.txt", "content");
await mockFs.readFile("/path/file.txt"); // "content" ✅

// 真实可能失败
// 1. 文件编码不是 UTF-8 → 返回乱码
// 2. 文件是符号链接 → 权限错误
// 3. 路径包含 ..→ 解析方式不同
```

**实践方案：**
- Mock 测试验证"接口语义"（参数传递、返回值结构、错误类型）
- 真实文件系统行为通过集成测试验证（少量，CI 可跳过）
- 不要试图让 Mock 完全模拟真实行为 —— 这会导致 Mock 比实现还复杂

### 8.5 配置管理难点

#### 类型安全

**问题：** `getConfig<T>("llm.temperature")` 返回类型是 `T`，但运行时值可能和类型不匹配。

```typescript
getConfig<number>("llm.temperature")
// 如果 LLM_TEMPERATURE="abc"，coerceValue 返回 "abc" (string)
// 调用方拿到 string 当 number 用 → NaN → 静默失败
```

**实践方案：**
- `coerceValue` 尝试类型转换（`"0.7"` → `0.7`）
- 但是当转换失败时保留原始字符串——这可能会导致下游 NaN
- 更严格的方案：转换失败时 fallback 到默认值

```typescript
function coerceValue(key: string, raw: string): unknown {
  const def = DEFAULTS[key];
  if (typeof def === "number") {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) return parsed;
    // 转换失败 → 写警告日志，用默认值
    console.warn(`Config ${key}: cannot parse "${raw}" as number, using default ${def}`);
    return def;
  }
  // ...
}
```

#### 敏感配置泄露

**问题：** `DEEPSEEK_API_KEY` 在 env 中，但 `getAll()` 可能把全部配置暴露给调试接口或日志。

**实践方案：**
- API Key 直接从 `process.env` 读取，不经过 config 管理器
- `config.ts` 不管理任何 secret
- `getAll()` / `formatConfig()` 只输出非敏感配置

#### 变更传播

**问题：** 改了 `config.yaml` 但 Agent 进程没重启，新配置不生效。

**实践方案：**
- 当前设计：配置在模块加载时读取一次，进程生命周期内不变
- 如需热加载：用文件 watch + 事件通知，但当前场景不需要
- 规则：改配置后 restart 进程

### 8.6 Skill 工程难点

#### 上下文膨胀

**问题：** 每个 Skill 的 SKILL.md 都被加载到 Claude Code 的系统提示中。12 个 Skill 加起来可能占用 3K-5K tokens。

```
12 Skills × 平均 200 行 × 每行估算 5 tokens ≈ 12,000 tokens
这还没算文档引用的内容（状态机、PRD 模板等）
```

**实践方案：**
- Skill frontmatter 中的 `description` 要精确——它决定了 Claude Code 是否加载这个 skill
- 把大量细节放在链接文档中，SKILL.md 只放摘要和目录
- 定期审查每个 Skill 的上下文贡献，合并或裁剪

#### 技能间依赖

**问题：** `vib-agent-product-skill` 引用了 `docs/domain-model.md` 和 `docs/signal-flow-state-machine.md`。如果这些文档改了，但 SKILL.md 没更新，引用就断了。

**实践方案：**
- Skill 与引用文档放在同一个 repo 中（一起提交一起更新）
- 文档变更时检查引用的 SKILL.md 是否需要同步更新
- 使用相对路径引用（`docs/domain-model.md`），而不是绝对路径

#### 发现限制

**问题：** Claude Code 的 glob `*.claude/skills/*/SKILL.md*` 只匹配一层。`*.claude/skills/category/vib-agent/SKILL.md*` 不会被发现。

```
不被发现的:
  .claude/skills/category/my-skill/SKILL.md      ❌
  .claude/skills/my-skill/sub/nested.md          ❌

需要变通:
  .claude/skills/vib-agent-product-skill/SKILL.md ✅
  
分类替代方案:
  全部平放在 skills/ 下，用 frontmatter category 区分
  category: project-domain → 产品领域
  category: engineering    → 工程实践
```

### 8.7 MCP 编排难点

#### Token 消耗管理

**问题：** `search()` 单次返回 ~50 tokens/result，但如果 limit 设太大，一次搜索可能消耗数千 token。

```
search(query="account binding", limit=50)
→ 50 results × 平均 50 tokens = 2,500 tokens
→ 即使只用其中 3 条，仍然消耗了 2,500 tokens
```

**实践方案：**
- 默认 limit=20，精确搜索用 limit=5
- 3 层搜索工作流：search → timeline → get_observations
- 第一层 search 用宽查询（召回多），后续用 ID 精确获取（按需）

#### 搜索精度

**问题：** 语义搜索可能返回不相关的结果。搜索 "prediction error" 可能返回 "error handling in workflow"，而不是 "prediction metrics error"。

**实践方案：**
- 搜索词要具体，用领域术语
- 先 `search()` 看返回结果的标题，不相关就调整查询
- `get_observations()` 只获取精选后的 ID，避免一次加载太多噪声

#### 知识时效

**问题：** 内存中的知识可能过期。昨天的观察说 "CI pipeline 故障"，今天已经修复了，但搜索还是返回旧结果。

**实践方案：**
- 关键状态变更后删除或更新旧 memory
- 搜索时注意 date 过滤
- 对时间敏感的信息（如 "CI 状态"）不依赖 memory，直接运行时检查

### 8.8 多模型协作难点

#### 输出格式不一致

**问题：** Claude 和 DeepSeek 对同一个 prompt 的输出格式可能不同。Claude 倾向于用 Markdown，DeepSeek 倾向于用更简洁的文本。

**实践方案：**
- Planner→Executor 传参时用 JSON，不用自然语言
- 不在模型间传递格式敏感内容（不对 LLM 的输出做 LLM 解析）
- 工具调用的格式固定为 `{"tool":"name","args":{...}}`，与模型无关

#### 成本跟踪

**问题：** 双模型架构下，成本分散在两个 API 账单中，容易失控。

**实践方案：**
- Telemetry 记录每次 LLM 调用的 model 名和 token 数
- `npm run dev metrics` 显示当前会话的 Token 消耗
- 设定每次 session 的 Token 预算上限（配置化）

#### 调度开销

**问题：** Planner 拆解任务 → 分派给 Executor → 收集结果 → 汇总。这个调度本身有延迟（尤其是多次往返）。

```
Claude 规划 (8s) → 拆成 3 个子任务
  → DeepSeek 执行任务1 (3s)
  → DeepSeek 执行任务2 (3s)
  → DeepSeek 执行任务3 (3s)
  → Claude 汇总 (5s)
总计: 22s (如果串行)
```

**实践方案：**
- 独立子任务用并行执行（Promise.all）
- Planner 只在"需要拆解"时才调用 —— 简单任务直接走单模型
- 调度策略可配置：`workflow.mode: "auto" | "direct" | "split"`

### 8.9 防坑清单（更新版）

```
LLM 相关:
  □ 所有 API 调用的返回值用 ?? "" 兜底，不假设 content 一定存在
  □ JSON 解析用 try-catch，格式错误时降级为文本返回
  □ 重试策略区分 retryable (429/5xx) 和 non-retryable (4xx)
  □ 日志不记录完整 LLM 响应体（记录 token 数和延迟即可）

数据相关:
  □ 任何从 JSON.parse 得到的数据先检查是否为 null/undefined
  □ 数组方法 (.join, .map, .filter) 前确保数组存在
  □ 统计计算 (mean, stddev) 对空输入返回 0 不返回 NaN
  □ 路径用 node:path.join 构建，不用字符串拼接

测试相关:
  □ 每个 fixture 至少覆盖一条异常路径
  □ summarize([]) 必须有 fixture 验证
  □ 不要用 fixture 模拟 LLM 行为 —— fixture 只验证管线逻辑
  □ CI 和本地用同一个 Node 版本（20 LTS）

I/O 相关:
  □ 所有文件系统操作通过 FsAdapter 接口
  □ Mock 和真实实现的行为差异用集成测试覆盖
  □ 配置中的路径在进程启动时解析，运行时不变
```

---

## 第九章：方法论总结

### 9.1 转型四步法

```
┌──────────────────────────────────────────────┐
│  ① 评估缺口                                    │
│  从 7 个维度评估: 可观测性/容错/配置/DI/持久化/  │
│  并发/版本。按成本/杠杆排序。                    │
├──────────────────────────────────────────────┤
│  ② 设计接口                                    │
│  先定义 interface，再写实现。接口是契约，         │
│  实现是可替换的。                                │
├──────────────────────────────────────────────┤
│  ③ 测试先行                                    │
│  Mock 依赖 → 验证接口语义 → 覆盖边界情况。        │
│  测试存证了接口设计是否正确。                     │
├──────────────────────────────────────────────┤
│  ④ 渐进替换                                    │
│  旧代码和新接口并存 → 逐个迁移 → 删除旧代码。      │
│  每一步都可验证，每一步都可回滚。                  │
└──────────────────────────────────────────────┘
```

### 9.2 适用于其他项目的检查清单

```
□ 有结构化日志 (JSONL) + traceId 串联吗？
□ 有执行追踪 (nested spans) 吗？
□ 有指标聚合 (调用计数/延迟/成功率) 吗？
□ 所有 I/O 都通过可替换的接口吗？
□ 有回归测试 (无 LLM 调用) 吗？
□ 配置是三级覆盖 (env > file > default) 吗？
□ LLM 调用有重试 + timeout 吗？
□ 关键数据流的空输入有 fixture 验证吗？
□ 有 CLI 查看日志/追踪/指标的命令吗？
□ CI 会自动跑类型检查 + 测试吗？
```

### 9.3 一句话总结

> **从"能用"到"可信"，差的不是 AI 能力，是工程基础设施。**
>
> 可观测性让你知道系统在做什么，评估体系让你知道系统好不好，依赖注入让你敢改代码，容错设计让系统在失败时仍然可用。这些和 LLM 的推理能力无关，但它们决定了项目能否持续进化。

---

> 文档版本: 1.0 · 最后更新: 2026-05-06
>
> 相关文档:
> - `docs/notion-import-vib-agent-platform.md` — 项目全览
> - `docs/multi-agent-practice-guide.md` — 实践指南与经验技巧
> - `docs/multi-agent-architecture.html` — 架构可视化
