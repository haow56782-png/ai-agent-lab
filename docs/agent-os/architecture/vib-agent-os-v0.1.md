# VIB Agent OS Architecture v0.1

Agent OS 是 VIB AI Agent 平台的智能体操作系统。它不是"一个 AI 聊天机器人"——它是一个 7 层操作系统，管理 Agent 的执行、工具、技能、编排、领域智能、评估和记忆。

---

## 架构总览：7 层栈

```
┌─────────────────────────────────────────────────────────────────────┐
│  L7  MEMORY SYSTEM        持久化 / 知识库 / 外部存储                │
│      Notion · Obsidian · State Store (Sqlite/Memory)                │
├─────────────────────────────────────────────────────────────────────┤
│  L6  EVALUATION SYSTEM    验证 / 评分 / 审计                        │
│      Evals · Verification Gates · Scoring · Audit Trail             │
├─────────────────────────────────────────────────────────────────────┤
│  L5  DOMAIN INTELLIGENCE  领域模型 / 产品智能 / 多 Agent 运行时     │
│      VIB Product Skills · Claude Flow · Domain Models               │
├─────────────────────────────────────────────────────────────────────┤
│  L4  ORCHESTRATION LAYER  编排 / 任务分解 / 策略决策               │
│      Ruflo · Planner · Multi-Agent Decomposition                    │
├─────────────────────────────────────────────────────────────────────┤
│  L3  WORKFLOW SKILLS      工程工作流 / 行为模式                     │
│      agent-skills · TDD · Code Review · Context Engineering         │
│      Verification Gate · Failure Analysis · Product PRD             │
├─────────────────────────────────────────────────────────────────────┤
│  L2  TOOL LAYER           工具注册 / 执行 / 超时 / DI               │
│      Tool Registry · ToolContext · withTimeout · Telemetry          │
├─────────────────────────────────────────────────────────────────────┤
│  L1  EXECUTION MODELS     Agent 执行模式 / LLM 客户端              │
│      REPL · Once · Workflow · Eval · Check · Log · Metrics · Trace │
│      LLM Client (Claude + DeepSeek fallback)                        │
└─────────────────────────────────────────────────────────────────────┘
```

这不是一个"接收 prompt → 返回回答"的聊天架构。这是一个**Agent 操作系统**——每一层解决一个明确的 OS 级问题：进程模型（L1）、设备驱动（L2）、程序库（L3）、调度器（L4）、领域知识（L5）、质量门（L6）、持久存储（L7）。

---

## L1 — Execution Models（执行模型层）

### 作用

定义 Agent 的进程模型：Agent 如何启动、如何接收输入、如何产生输出。这是 Agent OS 的"内核态"——最底层，所有上层依赖于此。

L1 决定 Agent 的**执行模式**而非业务逻辑。它解决的是 "Agent 以什么形态运行" 的问题，而不是 "Agent 做什么"。

### 输入

```
用户输入（字符串 prompt 或结构化参数）
执行模式选择（repl | once | workflow | eval | check | log | metrics | trace）
环境配置（apiKeys, config.yaml, env vars）
```

### 输出

```
根据模式不同：
- REPL: 交互式对话流（stdin → stdout）
- Once: 单次响应 + 退出
- Workflow: Plan → Execute → Review → Refine 四阶段输出
- Eval: 评分报告（{ scenario: string, score: number, details: object }）
- Check: 连通性验证结果
- Log / Metrics / Trace: 结构化日志 / 指标 / 追踪数据
```

### 典型工具

| 组件 | 路径 | 说明 |
|------|------|------|
| REPL | `src/index.ts` repl() | 交互式命令行 |
| Once mode | `src/index.ts` once() | 单次执行 |
| Workflow mode | `src/index.ts` workflow() | 四阶段流水线 |
| Eval mode | `src/index.ts` eval() | 跑评测 |
| LLM Client | `src/llm.ts` | Claude + DeepSeek 双 provider，带 retry/timeout/telemetry |
| Agent Loop | `src/agent.ts` | ReAct 循环，trace+log |

### 与其他层的关系

```
L1 调用 L2 的工具来执行动作
L1 被 L4 编排（Ruflo 可以启动/停止 L1 的 agent 实例）
L1 产生的 trace/metrics 供给 L6 评估
L1 的会话状态可持久化到 L7
```

### 当前缺口

- 缺乏流控（rate limiting / backpressure）
- 无进程隔离（所有模式在同一进程中运行）
- 无热重启（切换 LLM provider 需重启进程）

### 下一步建设动作

1. 为 REPL 模式添加背压检测（输入速度 > 处理速度时告警）
2. 提取 `Executor` 接口，使执行模式可插拔
3. 添加 `--recovery` 模式：从上次崩溃的 trace 恢复执行

---

## L2 — Tool Layer（工具层）

### 作用

Agent OS 的"设备驱动层"。所有 Agent 与外部世界的交互——读文件、写数据、调 API——都通过 L2 的工具接口。L2 管理工具的生命周期（注册、执行、超时、重试）和遥测。

区别于普通应用的工具函数，L2 是**有 governance 的工具层**：每个工具调用都有超时控制、重试策略、权限检查和成本记录。

### 输入

```typescript
interface ToolInvocation {
  toolName: string;           // 工具名
  params: Record<string, unknown>;  // 参数
  context: ToolContext;       // DI 容器（fs, db, logger, tracer...）
  config: { timeoutMs: number; retries: number };
}
```

### 输出

```typescript
interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: { code: string; message: string; recoverable: boolean };
  metrics: { durationMs: number; retries: number };
}
```

### 典型组件

| 组件 | 路径 | 说明 |
|------|------|------|
| Tool Registry | `src/tools/index.ts` | 工具注册和执行引擎 |
| ToolContext | `src/tools/design-system.ts` | DI 容器（NodeFsAdapter 等） |
| withTimeout | `src/agent.ts` | 工具调用超时包装 |
| 内置工具 | `src/tools/` | design-system, game-prediction |

### 与其他层的关系

```
L2 被 L1 调用（Agent ReAct 循环中）
L2 工具是 L3 Skill 声明的 tools 的运行时对应
L2 的 telemetry 数据供给 L6 效率评分
L2 通过 ToolContext.fs 接入 L7 的文件系统
```

### 当前缺口

- 工具调用无缓存（相同参数重复执行）
- 工具发现机制未实现（无法列出所有可用工具）
- 工具版本管理缺失（工具更新后旧调用失效）

### 下一步建设动作

1. 实现 ToolCache：对纯函数工具启用 LRU 缓存（基于参数 hash）
2. 实现 `tools.list()` 返回所有注册工具的 schema（支持 Capability Protocol 发现）
3. 给工具添加 `version` 和 `deprecated` 标记

---

## L3 — Workflow Skills（工作流技能层）

### 作用

L3 是"Agent 的程序库层"。它定义 Agent 在特定场景下应该遵循的工作流和行为模式。每个 Skill = 一个 SKILL.md 文件，按照 Capability Protocol 标准定义。

L3 的核心价值：Agent 不再"即兴发挥"，而是按预定义的工作流执行。这保证了**可复现性**和**可审计性**。

### 输入

```yaml
# 按照 Capability Protocol 的 inputs 定义
skill_trigger: "用户要求编写测试"
context: { traceId, userId, ... }
```

### 输出

```yaml
# 按照 Capability Protocol 的 outputs 定义
actions_taken: ["分析代码", "识别测试点", "编写单元测试", "运行验证"]
artifacts: ["tests/user-service.test.ts"]
verification: { passed: true, gates: [...] }
```

### 典型组件

| 技能 | 来源 | 说明 |
|------|------|------|
| **agent-skills** 集合 | addyosmani/agent-skills | 工程工作流（TDD、Code Review、CI/CD 等 20 个技能） |
| `context-engineering-skill` | 自有 | 上下文预算分配与分层加载 |
| `verification-gate-skill` | 自有 | 验证门强制执行 |
| `failure-analysis-skill` | 自有 | 结构化失败分析 |
| `product-prd-skill` | 自有 | PRD 编写与评审 |
| `ruflo-project-orchestration-skill` | 自有 | Ruflo 编排准入规约 |

### L3 分层说明

L3 内部的 skill 可以进一步分层：

```
L3.1 Protocol Skills     context-engineering（上下文协议）
L3.2 Quality Skills      verification-gate, failure-analysis（质量门）
L3.3 Domain Skills       product-prd, vib-agent-product（领域知识）
L3.4 Workflow Skills     agent-skills 集合（TDD, code-review, ...）
```

本层存放的是**工作流和行为模式**。领域模型本身的定义在 L5。

### 与其他层的关系

```
L3 通过 Capability Protocol（L5 定义）声明 inputs/outputs
L3 声明的 tools 在 L2 执行
L3 被 L4 编排器加载/卸载
L3 的执行结果经过 L6 的 verification gate
L3 可以读写 L7 的持久化状态
```

### 当前缺口

- agent-skills 的 20 个技能尚未导入（仅分析了兼容性）
- Skill 执行性能无监控（哪个 skill 耗时/耗 token 最多）
- Skill 间依赖解析未实现（skill A 依赖 skill B 自动加载）

### 下一步建设动作

1. 导入 addyosmani/agent-skills 的核心技能：`test-driven-development`, `code-review-and-quality`, `security-and-hardening`, `context-engineering`
2. 实现 Skill 执行耗时记录到 telemetry
3. 实现 `dependsOn` 依赖解析：加载 skill A 时自动加载 skill B

---

## L4 — Orchestration Layer（编排层）

### 作用

L4 是 Agent OS 的"调度器层"。它决定：**什么任务、由谁、按什么顺序、在什么条件下执行**。这是 Agent OS 作为操作系统最关键的层——没有 L4，Agent 只是单步执行工具；有了 L4，Agent 可以分解任务、协调多个 Agent、做策略决策。

### 输入

```yaml
objective: "为用户绑定 PG Soft 游戏账号并生成预测信号"
constraints:
  - auth_required: true
  - max_duration_ms: 60000
context:
  userId: "user_demo_001"
  url: "https://www.pgsoft.com/games/lucky-dragon"
```

### 输出

```yaml
plan:
  - step: "识别站点"
    skill: "vib-agent-product-skill"
    capability: "vib.binding.site.resolve"
  - step: "授权绑定"
    skill: "vib-agent-product-skill"
    capability: "vib.binding.oauth.authorize"
  - step: "验证结果"
    skill: "verification-gate-skill"
    gate: "gate-schema-valid"
status: "completed" | "failed" | "partial"
artifacts: { bindingId, signal }
```

### 典型组件

| 组件 | 来源 | 说明 |
|------|------|------|
| **Ruflo** | `ruflo-project-orchestration-skill` | 任务分解、Agent 拆解、准入验收规约 |
| Planner Agent | 系统内置 | 将目标转为执行计划 |
| Decomposer | 系统内置 | 将大任务分解为子任务 |
| Scheduler | 系统内置 | 决定执行顺序和并行度 |

### Ruflo 在本层的位置

Ruflo 不是 L1 的执行器，也不是 L3 的工作流——它是 **L4 的编排策略引擎**：

- **R1-R6** 方法论定义任务分解规则
- **Entry Gates** 决定什么任务可以交给 Agent
- **Restricted Zones** 定义什么不可自动化
- **Rejection Reason Algorithm** 决定拒绝优先级

### 与其他层的关系

```
L4 接收来自 L5 的领域意图（"用户要绑定账号"）
L4 加载/卸载 L3 的 skill（"这个任务需要 verification gate"）
L4 调用 L1 的 agent 实例（启动一个 executor agent）
L4 的决策结果经过 L6 评估（"编排是否正确"）
L4 可从 L7 读取历史编排模式做参考
```

### 当前缺口

- Ruflo 目前是文档级规约，尚未集成到运行时
- 无并发控制（多个编排同时运行时可能冲突）
- 无编排重试（编排失败后不会自动重新规划）
- 不支持条件分支（编排计划是线性的，没有 if/else）

### 下一步建设动作

1. 将 Ruflo 的 R1-R6 方法论实现为可调用的编排策略
2. 实现编排的状态持久化（中断后恢复）
3. 实现条件分支编排（"如果站点识别失败，走 A 路径；成功走 B 路径"）
4. 实现编排超时和自动回滚

---

## L5 — Domain Intelligence（领域智能层）

### 作用

L5 是 Agent OS 的"领域知识层"。它包含：领域模型定义、产品智能、多 Agent 运行时协调（Claude Flow）。L3 的工作流技能是"怎么做"，L5 的领域智能是"做什么"和"知道什么"。

L5 有两个子系统：

1. **Domain Knowledge**: 领域模型、实体定义、业务规则
2. **Multi-Agent Runtime**: Claude Flow 的多 Agent 协调能力

### 输入

```yaml
domain_context:
  - model: "ThirdPartyAccount"
    action: "bind"
    data: { siteDomain, gameAccountId, authorizationStatus }
runtime_context:
  - coordination: "planner → executor → reviewer"
    topology: "chain"
```

### 输出

```yaml
domain_result:
  bindingId: "bnd_a1b2c3d4"
  status: "AUTHORIZED"
  signal: { outcome: "big-win", confidence: 0.87 }
```

### 典型组件

| 组件 | 来源 | 说明 |
|------|------|------|
| **VIB Product Skills** | `.claude/skills/vib-agent-product-skill/` | 账号绑定流程、授权边界、PRD 模板 |
| Domain Models | `docs/domain-model.md` | Game, Prediction, Metrics, ThirdPartyAccount |
| Domain Services | `src/domain/` | prediction, game 领域服务 |
| **Claude Flow** | `.claude/settings.json claudeFlow` | 多 Agent 协调、swarm、agent teams |
| Capability Protocol | `docs/agent-os/protocols/` | 能力声明与发现契约 |

### 本层关键子层

```
L5.1 Domain Models
  实体定义、枚举、不变量（ThirdPartyAccount, Game, Prediction）
  
L5.2 VIB Product Skills
  绑定流程状态机、授权安全边界、PRD 编写规范

L5.3 Claude Flow (Multi-Agent Runtime)
  多 Agent 协调、swarm 拓扑、agent teams、共享内存
  Claude Flow 不是编排器（L4），而是多 Agent 通信和协调的运行时
  它提供：消息传递、共享状态、团队管理、自动任务分配
```

### Claude Flow 与 Ruflo 的分工

| 维度 | Claude Flow（L5） | Ruflo（L4） |
|------|------------------|-------------|
| 定位 | 多 Agent 运行时 | 编排策略引擎 |
| 解决的问题 | Agent 间怎么通信 | 什么任务怎么拆 |
| 机制 | swarm topology, shared memory, agent teams | Entry Gates, R1-R6, Rejection Reasons |
| 范围 | 运行时协调 | 任务规划与准入 |
| 类比 | 操作系统的 IPC/进程通信 | 操作系统的调度策略 |

### 与其他层的关系

```
L5 的领域模型被 L3 的 skill 引用（inputs/outputs schema）
L5 的领域意图被 L4 解析为编排计划
L5 的 Claude Flow 协调 L1 的多个 agent 实例
L5 的领域对象持久化到 L7
L5 的正确性由 L6 验证
```

### 当前缺口

- VIB Product Skills 尚未注册为 Capability Protocol 格式（缺少 inputs/outputs schema）
- Claude Flow 已配置但未与 Ruflo 集成
- 领域模型没有版本管理（模型变更后旧数据兼容性）
- Capability Protocol 的定义在文档层，未集成到运行时

### 下一步建设动作

1. 将 VIB Product Skills 的 frontmatter 升级为 Capability Protocol v0.1 完整格式
2. 实现 Claude Flow 与 Ruflo 的桥接：Ruflo 编排计划 → Claude Flow agent team 执行
3. 为领域模型添加版本标记和迁移策略
4. 实现 CapabilityRegistry 运行时（目前是文档定义）

---

## L6 — Evaluation System（评估系统层）

### 作用

L6 是 Agent OS 的"质量门层"。它不是测试工具，而是 OS 级的验证框架——每个 Agent 的输出在上层使用前必须通过 L6 的评估。这类似于操作系统的**内核审计子系统**。

### 输入

```yaml
eval_case: "vib-binding-to-signal-v1"
input: { url, userId }
expected: { state: "SIGNAL_READY", signal: { confidence: 0-1 } }
dimensions: ["correctness", "coverage", "resilience", "traceability", "efficiency"]
```

### 输出

```yaml
score: 87
dimensions:
  correctness: 92
  coverage: 85
  resilience: 80
  traceability: 90
  efficiency: 85
verdict: "A (≥85, beta ready)"
gates:
  - gate-schema-valid: passed
  - gate-confidence-range: passed
  - gate-binding-written: passed
```

### 典型组件

| 组件 | 来源 | 说明 |
|------|------|------|
| Evaluation Runner | `evals/runner.ts` | 场景执行和评分 |
| Agent OS Evals | `evals/agent-os/cases/` | 5 个 eval case |
| Verification Gates | `verification-gate-skill` | schema, invariant, existence, threshold |
| Scoring Framework | `docs/agent-os/evals/agent-os-evals-v0.1.md` | 6 维度评分标准 |

### Eval Case 分类

| 类型 | 验证对象 | 示例 |
|------|---------|------|
| `unit` | 单个能力 | 站点 URL 识别 |
| `workflow` | 完整流程 | 绑定→信号全流程 |
| `resilience` | 故障恢复 | 授权失败→恢复 |
| `integration` | 跨层集成 | Skill → Tool → LLM |

### 与 agent-skills evals 的关系

adyosmani/agent-skills 的 verification checklist 是 L3 工作流级的验证（"TDD cycle 是否完成"），而 L6 是 OS 级的评估（"Agent OS 整体是否正常工作"）。两者互补：

```
agent-skills checklist: 这是技能内的验证（微观）
L6 Evaluation System: 这是系统级的评估（宏观）
```

### 与其他层的关系

```
L6 接收 L1 的执行结果和 trace 数据
L6 使用 L3 的 verification-gate-skill 执行门检查
L6 评估 L4 的编排决策是否正确
L6 验证 L5 的领域输出是否符合 domain invariants
L6 报告写入 L7 持久化
L6 评分结果反馈到 L4 优化编排策略
```

### 当前缺口

- Eval cases 未与 Capability Protocol 关联（eval case 没有声明它测试哪些能力）
- Verification gate 未自动化（当前是文档定义，未集成到 tool call 流程）
- 无回归测试套件（修改 L1 后不会自动跑 L6 的 eval）
- 评分结果未反馈回系统（无法自动优化）

### 下一步建设动作

1. 将每个 eval case 关联到 Capability ID（"本 case 测试 vib.binding.site.resolve"）
2. 实现 verification gate 的自动执行插件（gate 作为 L2 tool）
3. 在 CI 中加入 eval 回归检查：`npm run dev eval agent-os/all`
4. 实现评分结果 → L4 策略调整的反馈回路

---

## L7 — Memory System（记忆系统层）

### 作用

L7 是 Agent OS 的"持久化层"。它是一个操作系统管理的内存层次结构——从高速缓存（Memory State Store）到持久化数据库（Sqlite）到外部知识库（Notion/Obsidian）。

L7 不是"存数据的数据库"，而是**Agent 的记忆体系**：工作记忆（会话上下文）、短期记忆（运行时可查询）、长期记忆（跨会话持久化）。

### 存储层次

```
L7.1  Work Memory（工作记忆）
  当前会话的上下文、trace、未持久化的状态
  后端: MemoryStateStore (Map-based)
  速度: 纳秒级
  持久性: 无（会话结束丢失）

L7.2  Short-term Memory（短期记忆）
  当前会话的中间结果、缓存
  后端: SqliteStateStore (better-sqlite3)
  速度: 毫秒级
  持久性: 按 TTL

L7.3  Long-term Memory（长期记忆）
  绑定记录、配置、评估结果
  后端: SqliteStateStore (持久化)
  速度: 毫秒级
  持久性: 永久（显式删除）

L7.4  External Knowledge（外部知识）
  设计文档、产品规范、架构记录
  后端: Notion / Obsidian / 文件系统
  速度: 秒级（同步决定）
  持久性: 由外部系统管理
```

### 输入

```yaml
# 读请求
read:
  domain: "binding"
  key: "binding:user_demo_001"
  consistency: "strong" | "eventual"

# 写请求  
write:
  domain: "binding"
  key: "binding:user_demo_001:bnd_a1b2c3d4"
  data: { bindingId, platformUserId, ... }
  ttl: "permanent"
```

### 输出

```yaml
# 读结果
found: true
data: { bindingId: "bnd_a1b2c3d4", ... }
source: "sqlite"
latencyMs: 3

# 写结果
written: true
conflict: false
tier: "long-term"
```

### 典型组件

| 组件 | 路径 | 说明 |
|------|------|------|
| MemoryStateStore | `src/state/memory.ts` | 工作记忆（Map-based） |
| SqliteStateStore | `src/state/sqlite/` | 短期/长期记忆 |
| StateStore Interface | `src/state/types.ts` | 统一存储接口 |
| 6 Repositories | `src/state/sqlite/` | Session, WorkflowRun, TaskRun, EvalHistory, TraceSpan, MetricsSnapshot |
| Migration Runner | `src/state/sqlite/migrations/` | 版本化 schema 迁移 |
| 文件系统 | ToolContext.fs | 文件级存储 |

### 与其他层的关系

```
L7 为 L1 提供状态持久化（会话恢复）
L7 存储 L3 的 skill 配置和状态
L7 记录 L4 的编排历史
L7 持久化 L5 的领域实体（绑定记录）
L7 保存 L6 的评估结果
L7 通过 ToolContext.fs 驱动 L2 的文件工具
```

### 当前缺口

- 无记忆分层策略（所有数据在同一 store 中，没有根据访问频率/重要性分层）
- 外部知识库（Notion/Obsidian）未集成
- 记忆回收机制缺失（TTL 定义但未实现自动清理）
- 跨会话记忆检索未实现（"上次我们是怎么处理这个站点的？"）
- 无记忆竞争处理（多个 agent 同时写同一 key）

### 下一步建设动作

1. 实现数据分层迁移：工作记忆 → 短期 → 长期（基于访问频率）
2. 集成 Notion API 作为外部知识库读取源（读参考文档）
3. 实现 TTL 回收器：定期清理过期记录
4. 实现跨会话记忆检索：按语义搜索历史会话
5. 实现 optimistic concurrency control：写操作带版本号检测冲突

---

## 跨层数据流

### 绑定工作流完整路径

```
用户输入 URL
  │
L1 REPL      接收输入 → 启动 agent.run()
  │
L5 Domain     绑定 skill 加载 → 状态机实例化
  │
L4 Orchestrate Ruflo 编排计划：resolve → authorize → bind → analyze
  │
L3 Skills     vib-agent-product-skill 执行站点识别
  │
L2 Tool       read() 读取 provider 列表，execute() 验证站点
  │
L1 LLM        Claude 推理站点类型
  │
L6 Evaluate   验证门：gate-schema-valid, gate-confidence-range
  │
L7 Memory     写入绑定记录到 SqliteStateStore
  │
L1 REPL       输出结果给用户
```

### 各层间的契约

```
L1 ↔ L2: ToolInvocation / ToolResult（同步调用）
L2 ↔ L3: Tool 被 skill 的 workflow 引用
L3 ↔ L4: Skill 被编排器按需加载
L4 ↔ L5: 编排意图 → 领域模型实例化
L5 ↔ L6: 领域输出 → 验证门检查
L6 ↔ L7: 评估结果 → 持久化
L7 ↔ L1: 记忆 → 上下文加载
```

---

## 部署视图

```
┌─────────────────────────────────────────────────────────────┐
│                 单进程 Node.js/TS                            │
│                                                             │
│  L1: index.ts → agent.ts → llm.ts                          │
│  L2: tools/index.ts → ToolContext                          │
│  L3: .claude/skills/*/SKILL.md（按需加载）                  │
│  L4: （文档级，待集成到运行时）                               │
│  L5: src/domain/ + Claude Flow runtime                     │
│  L6: evals/runner.ts                                       │
│  L7: src/state/ (Memory + Sqlite) + 文件系统               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Claude Flow Runtime (agent teams, swarm, memory)   │   │
│  │  运行在 L5，协调跨 Agent 的通信和状态               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

当前部署形态：单进程 + 文档级编排。

未来目标：多进程 + Ruflo 运行时集成 + Notion/Obsidian 外部知识库接入。

---

## 7 层总览表

| 层 | 名称 | 核心抽象 | OS 类比 | 当前状态 |
|----|------|---------|---------|---------|
| L1 | Execution Models | Agent, LLM Client, ReAct Loop | 进程管理 | 已实现 |
| L2 | Tool Layer | Tool Registry, ToolContext, DI | 设备驱动 | 已实现 |
| L3 | Workflow Skills | SKILL.md, Capability Protocol | 程序库 | 10 skills 已加载，agent-skills 待导入 |
| L4 | Orchestration | Ruflo, Planner, Decomposer | 调度器 | 文档级规约，待运行时集成 |
| L5 | Domain Intelligence | VIB Product Skills, Claude Flow, Domain Models | 领域知识库 | 技能已定义，Claude Flow 已配置 |
| L6 | Evaluation System | Evals, Verification Gates, Scoring | 审计子系统 | 5 eval cases 已创建，gate 待自动化 |
| L7 | Memory System | State Store (Memory+Sqlite), Repositories | 文件系统 + 内存层次 | 存储已实现，外部知识库待集成 |
