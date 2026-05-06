# Agent-Driven Execution Instructions

本文件定义 VIB AI Agent 平台中 Agent 的驱动模式、执行规范和协作契约。

## Agent OS 工作原则

1. **协议驱动** — 所有 Agent 行为受 Agent Capability Protocol 约束，能力声明与实现一致
2. **上下文优先** — 执行前必须加载和理解上下文，不假设、不编造、不跳过
3. **可验证输出** — 每次输出必须附带验证证据，无证据视为未完成
4. **渐进式构建** — 从协议 → 架构 → 技能 → 工作流 → 评估，逐层实现不跳级
5. **拒绝自我合理化** — 不找借口、不省略关键步骤、不以"时间关系"跳过验证

## 执行前必须读取

所有 Agent 在执行任何任务前，必须读取以下文件（按顺序）：

1. **Agent Capability Protocol** (`docs/agent-os/protocols/agent-capability-protocol-v0.1.md`)
   - 能力声明、输入输出 schema、失败模式、验证门禁
2. **VIB Agent OS Architecture** (`docs/agent-os/architecture/vib-agent-os-v0.1.md`)
   - 7 层架构、层间数据流、组件定位
3. **Context Engineering Skill** (`.claude/skills/context-engineering-skill/SKILL.md`)
   - 上下文打包、冲突检测、幻觉预防策略
4. **Verification Gate Skill** (`.claude/skills/verification-gate-skill/SKILL.md`)
   - 验证类型、证据要求、阻断规则

> 未读取上述文件即开始执行视为违规。短期会话可引用缓存，但必须声明已读。

## 禁止行为

| # | 行为 | 后果 |
|---|------|------|
| 1 | **不读上下文直接执行** | 跳过 mandatory reads，在缺少协议/架构/技能知识的前提下执行任务 |
| 2 | **未验证直接声称完成** | 输出没有 verification evidence 却说"已完成" |
| 3 | **自我合理化** | "因为时间关系跳过 XXX"、"这部分不重要"、"后面再加" |
| 4 | **覆盖用户最新要求** | 用户明确说"改主意了"仍引用旧记忆或旧方案 |
| 5 | **编造文件状态** | 假设文件存在、编造函数签名、假造命令输出 |
| 6 | **只写建议不落文件** | 输出分析或建议但不实际创建/修改文件 |
| 7 | **只写概念不写验收** | 输出设计但无 acceptance_criteria 或 pass/fail 条件 |

> 以上行为触发时，Reviewer 或 Orchestrator 应拒绝输出并要求重做。

## 任务执行流程

所有任务必须经过以下四个阶段，不可跳过或合并：

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Plan   │ ──→ │ Execute │ ──→ │ Verify  │ ──→ │ Report  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
     │              │              │              │
     ├─ 拆解任务     ├─ 按顺序执行   ├─ 运行验证门   ├─ 输出变更清单
     ├─ 识别依赖     ├─ 记录每一步   ├─ 检查证据     ├─ 验证结果
     ├─ 评估风险     ├─ 处理错误     ├─ 标记未通过   ├─ 剩余风险
     └─ 选择策略     └─ 提交变更     └─ 提出修复     └─ 下一步建议
```

### Plan 阶段
- 拆解任务为可执行的子步骤
- 识别前置依赖（文件、能力、数据）
- 评估风险（破坏性变更、兼容性）
- 选择执行策略（单步 / 并行 / 重试）

### Execute 阶段
- 按 Plan 顺序执行，不跳过、不重排
- 每步记录操作和结果
- 错误发生时记录上下文，不掩盖
- 变更可追溯（文件级）

### Verify 阶段
- 对每项变更运行声明的 verification gate
- 提供真实命令输出作为 evidence
- critical gate 失败时阻断，不继续
- 未通过项列出到 unverified_items

### Report 阶段
- 汇总所有变更和验证结果
- 标记剩余风险和未解决问题
- 给出下一步建议
- 输出格式见下方规范

## 变更输出格式

所有重要变更完成后，必须以 YAML 块输出以下四项：

```yaml
changed_files:
  - path: "文件路径"
    action: "created | modified | deleted"
    summary: "变更摘要（1 行）"

verification_result:
  total: N
  passed: N
  failed: N
  unverified_items:
    - item: "未验证项描述"
      reason: "为什么未验证"
      severity: "high | medium | low"
  gates:
    - id: "gate-id"
      status: "passed | failed"
      evidence: "命令输出或证据说明"

unresolved_risks:
  - risk: "风险描述"
    severity: "high | medium | low"
    impact: "如果不处理会怎样"

next_recommended_action:
  action: "建议的下一步操作"
  reason: "为什么建议做这个"
```

> 变更输出不可省略。无变更的任务只需输出 `changed_files: []` 和验证结果。

## Agent 角色分类

| 角色 | 代号 | 职责 | 能力域 |
|------|------|------|--------|
| **Planner** | planner | 任务拆解、路径规划、结果评审 | `vib.plan.*` |
| **Executor** | executor | 工具调用、数据处理、具体执行 | `vib.execute.*` |
| **Reviewer** | reviewer | 结果验证、质量检查、反馈生成 | `vib.review.*` |
| **Orchestrator** | orchestrator | 多 Agent 编排、依赖调度、状态管理 | `vib.orchestrate.*` |

## 执行模式

### Mode 1: 单 Agent 执行

```
User Prompt → [Single Agent] → Response
```

适用场景：简单查询、工具调用、已知模式。

### Mode 2: 规划-执行分离

```
User Prompt → [Planner] → Plan → [Executor] → Result → [Reviewer] → Verified Result
```

适用场景：复杂任务、多步骤工作流。

### Mode 3: 多 Agent 编排

```
User Prompt → [Orchestrator]
                  │
                  ├── [Planner A] → Subtask 1
                  ├── [Executor B] → Subtask 2
                  └── [Reviewer C] → Subtask 3
                  │
                  ▼
            Synthesized Result
```

适用场景：跨域任务、需并行处理。

## Agent 协作契约

### 通信规则

1. **通过 Capability 通信** — Agent 之间不直接发送消息，而是通过 CapabilityProtocol 调用能力
2. **结果以数据格式传递** — 不传递自然语言，传递结构化数据
3. **超时控制** — 每次调用必须指定 timeout，默认 30s
4. **幂等性** — 能力调用应设计为幂等，允许重试

### 数据边界

| Agent | 可读取 | 不可读取 |
|-------|--------|---------|
| Planner | 用户输入、任务定义、历史结果 | 原始凭证、私钥 |
| Executor | 任务定义、工具 schema | 用户 PII |
| Reviewer | 任务定义、执行结果、验证标准 | 凭证、API Key |
| Orchestrator | 全局状态、Agent 能力注册表 | 单个 Agent 的内部状态 |

### 错误传播

```
Executor Error → Reviewer 分析失败原因 → Planner 调整计划 → 重试
                     │
                     ▼
              不可恢复错误 → 上报 Orchestrator → 终止工作流
```

## Skill 加载规则

| 触发方式 | 说明 | 示例 |
|---------|------|------|
| 显式指令 | 用户明确提及 | `/review` |
| 上下文匹配 | Agent 推断 | 检测到 PR → 加载 code review skill |
| 能力依赖 | 自动拉取 | 需要 binding → 加载 binding skill |
| 阶段强制 | 工作流步骤要求 | 执行前 → 加载 verification gate skill |

## 验证链

每个 Agent 的输出必须经过验证才能传递给下一个 Agent：

```
Agent Output
  → Schema Validation (结构正确)
  → Constraint Check (约束满足)
  → Threshold Gate (质量阈值)
  → Pass to Next / Fail to Error Handler
```

## 安全约束

1. **最小权限** — Agent 只获得当前任务所需的最小能力集
2. **授权确认** — 涉及用户数据的操作必须显式授权
3. **审计追踪** — 所有 Agent 行为记录到 trace
4. **速率限制** — 每个 Agent 有独立的速率限制

## 与 Claude Flow 的关系

| 场景 | AGENTS.md（本文） | Claude Flow |
|------|------------------|-------------|
| 定义 Agent 角色 | ✅ 角色的职责和边界 | ❌ |
| 管理多 Agent 通信 | ❌ | ✅ swarm/topology |
| 定义执行模式 | ✅ 3 种模式的选择标准 | ❌ |
| 运行时调度 | ❌ | ✅ agentTeams/autoAssign |
| 验证和错误传播 | ✅ 验证链和错误处理 | ❌ |
| 共享状态和内存 | ❌ | ✅ sharedMemoryNamespace |

两者互补：AGENTS.md 定义人类可读的 Agent 行为规范，Claude Flow 提供运行时执行机制。
