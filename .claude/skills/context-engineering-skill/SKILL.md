---
name: context-engineering
description: "Controls how agents use context to prevent drift, omission, hallucination, context pollution, and over-reliance on stale information. Every agent execution must start with context validation before any action."
category: protocol
version: "0.2.0"
owner: "platform-team"

inputs:
  - name: user_intent
    type: string
    required: true
    description: "用户本次请求的核心意图，从原始输入提取"
  - name: project_state
    type: object
    required: true
    description: "项目当前状态，包括分支、未提交变更、最近活动"
  - name: domain_context
    type: array
    required: false
    description: "相关的领域文档引用列表"
  - name: code_context
    type: array
    required: false
    description: "相关的代码文件路径列表"
  - name: memory_context
    type: array
    required: false
    description: "相关的历史记忆/会话引用"
  - name: constraints
    type: array
    required: false
    description: "本次执行的约束条件"
  - name: acceptance_criteria
    type: array
    required: false
    description: "用户期望的验收标准"

outputs:
  - name: context_summary
    type: object
    description: "上下文检查后的结构化总结"
    alwaysPresent: true
  - name: assumptions
    type: array
    description: "显式声明的假设列表"
    alwaysPresent: true
  - name: missing_context
    type: array
    description: "识别到的缺失上下文"
    alwaysPresent: true
  - name: risks
    type: array
    description: "上下文使用中的风险评估"
    alwaysPresent: true
  - name: next_action
    type: string
    description: "上下文检查后确定的下一步动作"
    alwaysPresent: true

tools:
  - name: read
    purpose: "读取参考文档和代码文件"
    required: true
  - name: grep
    purpose: "搜索代码库中的定义和引用"
    required: false

verification:
  - id: "gate-context-checked"
    description: "确认已在执行前完成上下文检查"
    type: existence
    severity: critical
  - id: "gate-no-stale-context"
    description: "未使用超过 1 小时的旧上下文作为决策依据"
    type: invariant
    severity: critical
  - id: "gate-assumptions-declared"
    description: "所有假设已显式声明"
    type: existence
    severity: major

failure_modes:
  - when: "上下文检查发现关键信息缺失"
    code: "MISSING_CRITICAL_CONTEXT"
    recoverable: true
    recovery: "请求用户补充缺失信息后继续"
  - when: "检测到上下文冲突（新旧信息矛盾）"
    code: "CONTEXT_CONFLICT"
    recoverable: true
    recovery: "优先采信最新信息，标注冲突点供用户确认"
  - when: "上下文总量超过窗口 85%"
    code: "CONTEXT_OVERFLOW"
    recoverable: true
    recovery: "执行上下文压缩或分层降级后继续"

cost_tracking:
  estimatedTokens: 1500
  estimatedTimeMs: 2000
  recordFields:
    - field: "contextItemsLoaded"
      description: "加载的上下文条目数"
    - field: "contextCompressionRatio"
      description: "压缩比（原始/压缩后 token 数）"
    - field: "ambiguitiesResolved"
      description: "解决的歧义数"

memory:
  required:
    - "project_state (branch, uncommitted_changes)"
    - "domain_context (文档引用，支持 #section 分层)"
    - "code_context (文件路径 + 行号范围)"
  ttl: "会话级别，上下文冲突时以最新为准"

workflow:
  steps:
    - "Context Packing — 估算 token，选择压缩策略"
    - "Freshness Check — 验证文件最后读取时间"
    - "Conflict Detection — 标记新旧信息矛盾"
    - "Missing Context — 记录缺失的文件或字段"
    - "Assumptions Log — 声明假设和版本依赖"
  states: []
---

# Context Engineering Skill

## 1. Purpose

防止 Agent 在以下情景中出错：

| 问题 | 表现 | 后果 |
|------|------|------|
| **跑偏** | Agent 做了用户没要求的事 | 浪费时间，偏离目标 |
| **遗漏** | Agent 忽略了关键约束或需求 | 交付物不完整 |
| **幻觉** | Agent 编造了不存在的文件、状态或规则 | 传播错误信息 |
| **上下文污染** | 旧对话中的无关信息干扰当前判断 | 决策质量下降 |
| **过度依赖旧信息** | 用户更新了需求但 Agent 仍按旧理解执行 | 交付与期望不符 |

核心原则：**检查上下文后再执行，而非执行到一半才发现上下文不足。**

## 2. When to Use

| 触发场景 | 说明 | 操作 |
|---------|------|------|
| 任何任务开始前 | 收到用户请求后，执行任何文件操作前 | 执行完整上下文检查 |
| 用户提供新信息时 | 用户补充/更正了之前的说明 | 刷新上下文并检查冲突 |
| 多轮对话中 | 对话超过 5 轮 | 检查是否遗忘了早期约定 |
| 跨文件操作前 | 需要同时修改多个文件 | 确认所有相关文件的最新状态 |
| 引用旧会话/记忆前 | 使用历史信息作为决策依据 | 检查信息新鲜度 |

**不要跳过上下文检查的场景**：文件修改、代码生成、需求分析、配置变更、任何有副作用的操作。

## 3. Inputs

### 3.1 user_intent

从用户原始输入中提取的核心意图。Agent 必须用自己的话重述一遍，而非直接引用用户原文。

```yaml
# 用户说: "帮我把绑定流程改一下，加个确认弹窗"
# 提取的 intent:
user_intent: "在三方账号绑定流程中，在 ACCOUNT_BIND_CONFIRM 状态之前增加一个确认弹窗，让用户二次确认绑定信息"
```

### 3.2 project_state

项目当前状态，必须通过真实命令获取，不允许假设。

```yaml
project_state:
  branch: "main"
  uncommitted_changes: true
  changed_files: ["docs/agent-os/protocols/agent-capability-protocol-v0.1.md"]
  last_commit: "4a4c3a0 - Add multi-agent architecture diagram"
```

### 3.3 domain_context

与本任务相关的领域文档引用。使用分层引用方式（`doc.md#section`），而非整文档加载。

```yaml
domain_context:
  - ref: "docs/domain-model.md#ThirdPartyAccount"
    purpose: "确认绑定实体字段定义"
    priority: "required"
  - ref: "docs/agent-os/workflows/vib-binding-to-signal-workflow-v0.1.md"
    purpose: "确认状态机转换规则"
    priority: "required"
```

### 3.4 code_context

与本任务相关的代码文件。

```yaml
code_context:
  - path: "src/binding/workflow.ts"
    purpose: "绑定工作流编排器实现"
    priority: "required"
  - path: "src/binding/types.ts"
    purpose: "类型定义"
    priority: "required"
  - path: "tests/binding/workflow.test.ts"
    purpose: "现有测试"
    priority: "reference"
```

### 3.5 memory_context

相关的历史会话或记忆引用。

```yaml
memory_context:
  - source: "previous_session"
    date: "2026-05-06"
    summary: "上次实现了绑定工作流的状态机编排器"
    relevance: "high"
  - source: "project_memory"
    key: "binding-flow"
    summary: "binding workflow 已实现 18 个状态和完整转换规则"
    relevance: "medium"
```

### 3.6 constraints

```yaml
constraints:
  - "不能破坏现有绑定流程的向后兼容性"
  - "新增确认弹窗不影响已绑定的用户"
  - "确认弹窗必须显示完整的账号信息供用户核对"
```

### 3.7 acceptance_criteria

```yaml
acceptance_criteria:
  - "用户确认弹窗显示 bindingId、provider、nickname"
  - "用户点击确认后才执行绑定写入"
  - "用户取消则回到 ACCOUNT_BIND_CONFIRM 状态"
  - "所有现有测试仍然通过"
```

## 4. Outputs

### 4.1 Context Summary 结构

```yaml
context_summary:
  user_intent: "为账号绑定流程增加确认弹窗"
  project_state:
    branch: "main"
    has_changes: false
  contexts_loaded:
    domain: 2
    code: 3
    memory: 1
  contexts_compressed: 1
  ambiguities: []
  freshness:
    oldest_ref: "docs/domain-model.md (2026-05-06)"
    all_fresh: true
```

### 4.2 Assumptions

```yaml
assumptions:
  - assumption: "ACCOUNT_BIND_CONFIRM 状态已存在"
    confidence: "high"
    source: "src/binding/workflow.ts#L45"
  - assumption: "确认弹窗前不需要额外的数据获取"
    confidence: "medium"
    source: "需要验证 ACCOUNT_INFO_FETCHING 输出是否包含所有展示字段"
```

### 4.3 Missing Context

```yaml
missing_context:
  - item: "确认弹窗的 UI 设计稿或原型"
    severity: "medium"
    impact: "无法确定弹窗的具体样式和信息布局"
    action: "向用户询问弹窗设计稿，或建议默认布局"
  - item: "确认弹窗是否需要在移动端和 PC 端有不同表现"
    severity: "low"
    impact: "如果不需要差异可默认统一处理"
```

### 4.4 Risks

```yaml
risks:
  - risk: "新增状态可能破坏现有状态机转换规则"
    likelihood: "low"
    impact: "high"
    mitigation: "确认所有现有状态转换不受影响，测试覆盖"
  - risk: "用户可能在确认弹窗中超时不响应"
    likelihood: "medium"
    impact: "low"
    mitigation: "弹窗设置超时（如 5 分钟），超时默认取消"
```

### 4.5 Next Action

```yaml
next_action: "读取 src/binding/workflow.ts 中 ACCOUNT_BIND_CONFIRM 的现有实现，设计弹窗状态的插入位置"
```

## 5. Workflow

### Step 1: 收集上下文

```
1. 从用户输入提取 user_intent
2. 执行 git status / git log 获取 project_state（真实命令，非假设）
3. 根据 user_intent 确定所需的 domain_context 和 code_context
4. 查 memory 获取 memory_context
5. 提取 constraints 和 acceptance_criteria
```

### Step 2: Context Packing（上下文打包）

根据上下文总量选择打包策略：

```yaml
context_size:
  threshold:
    - "< 窗口 30%": "加载所有 L1 + L2 上下文，无需压缩"
    - "< 窗口 60%": "加载 L1 + L2，对 L2 进行结构化摘要"
    - "< 窗口 85%": "仅加载 L1，L2 转为按需加载"
    - "≥ 窗口 85%": "分块执行，每块一个独立上下文窗口"
```

**Context Packing 方法**：

1. **前置摘要**：将长文档的关键信息提取为 3-5 条摘要放在文档前面
2. **倒序排列**：将最重要的信息放在 prompt 的开头和结尾（模型的 attention 峰值区域）
3. **结构化标记**：使用 `===CONTEXT_BOUNDARY===` 等显式分隔符标记上下文块边界
4. **冗余裁剪**：去除跨文档的重复信息（如多个文档都引用了同一套规则）
5. **引用外置**：大段代码/数据用文件路径引用替代内联，按需读取

### Step 3: Context Freshness Check（新解度检查）

```yaml
freshness_rules:
  - "git log 必须在本次会话中获取，不可使用硬编码或记忆中的老版本"
  - "引用文件必须在本次读取，不可依赖旧版本缓存"
  - "超过 1 小时的项目状态视为 stale，需要刷新"
  - "用户在当前会话中更新的指令优先级高于 SKILL.md 中的默认规则"
```

### Step 4: Stale Context Handling（旧上下文处理）

| 检测条件 | 行为 |
|---------|------|
| 引用文件的最后修改时间 > 当前会话启动时间 | 重新读取文件 |
| 记忆中的项目状态与当前 git status 不符 | 丢弃记忆状态，使用真实状态 |
| 用户说"之前说的那个不要了" | 标记相关历史上下文为 superseded |
| 引用的 API 版本已过时 | 提示用户确认是否使用旧版本 |

### Step 5: Conflict Context Handling（冲突上下文处理）

| 冲突类型 | 解决策略 |
|---------|---------|
| 用户更新了之前的指令 | 以最新指令为准，标注旧指令已 superseded |
| 领域文档和代码实现不一致 | 以代码实现为准，标注文档可能过时 |
| memory 状态和当前文件状态不一致 | 以当前文件状态为准 |
| 多个约束互相矛盾 | 列出所有冲突点，请求用户决策 |

### Step 6: Missing Context Handling（缺失上下文处理）

```yaml
severity_levels:
  critical: "缺少时不可执行，必须向用户索要"
  major: "缺少时会显著影响质量，强烈建议补充"
  minor: "有更好，可以基于假设先开始"

handling:
  critical: "阻塞执行，向用户明确说明缺什么以及为什么需要"
  major: "记录到 risks，执行时在相关步骤标注不确定性"
  minor: "记录到 assumptions，开始执行"
```

## 6. Verification

1. [ ] 所有上下文通过真实命令获取（git/log/cat），非假设
2. [ ] context_summary 包含所有必要 sections
3. [ ] 所有假设已显式声明在 assumptions 中
4. [ ] 缺失的上下文已记录在 missing_context 中
5. [ ] 风险已记录并评估了 likelihood 和 impact
6. [ ] 无超过 1 小时的旧上下文被用作决策依据
7. [ ] 上下文总 token 不超过窗口 85%
8. [ ] 用户最新指令的优先级高于所有旧上下文

## 7. Failure Modes

| 失败模式 | 识别条件 | 恢复 |
|---------|---------|------|
| `MISSING_CRITICAL_CONTEXT` | 缺少 domain_model 或关键代码路径 | 请求用户补充 |
| `CONTEXT_CONFLICT` | 新旧指令或文档与代码矛盾 | 采信最新，标注冲突 |
| `CONTEXT_OVERFLOW` | 上下文 > 窗口 85% | 压缩或分块 |
| `STALE_CONTEXT_USED` | 引用了 1 小时前的状态| 刷新后重试 |
| `ASSUMPTION_WRONG` | 假设在执行中被证伪 | 回退到确认状态 |

## 8. Forbidden Behaviors

| 禁止行为 | 为什么 | 替代做法 |
|---------|--------|---------|
| **未检查上下文直接执行** | 必然导致跑偏或遗漏 | 先执行 context check |
| **用旧结论覆盖新输入** | 用户更新需求后仍按旧理解工作 | 检测指令变更，刷新理解 |
| **编造项目状态** | "我记得这个文件有..." 但没读 | git status / read 真实获取 |
| **假设文件存在** | "这个文件应该在这里"但没验证 | read 确认文件存在再引用 |
| **忽略用户最新指令** | 用户说"不要做 X"后仍然做 X | 最新指令优先级最高 |
| **使用记忆替代代码读取** | "上次我看到这个文件是..." | 重新读取文件当前内容 |
| **不加标注地假设** | 不声明 assumptions 直接输出 | 所有假设必须显式列出 |

## 9. Output Template

```yaml
context_summary:
  user_intent: "{从用户输入提取的核心意图，用自己的话重述}"
  project_state:
    branch: "{git 获取的当前分支}"
    uncommitted_changes: {true/false, 通过 git status 获取}
    last_commit: "{git log -1 获取}"
  contexts_loaded:
    domain: {number}
    code: {number}
    memory: {number}
  contexts_compressed: {number}
  freshness:
    oldest_ref: "{文件名 (日期)}"
    all_fresh: {true/false}

assumptions:
  - assumption: "{假设内容}"
    confidence: "high/medium/low"
    source: "{假设来源或依据}"

missing_context:
  - item: "{缺失什么}"
    severity: "critical/major/minor"
    impact: "{缺失会造成什么影响}"
    action: "{如何获取或谁可以补充}"

risks:
  - risk: "{风险描述}"
    likelihood: "high/medium/low"
    impact: "high/medium/low"
    mitigation: "{如何缓解}"

next_action: "{确定的下一步具体动作}"
```

## 10. VIB Example

### 场景：修改绑定工作流确认弹窗

**用户输入**：*"在绑定流程的确认步骤加一个弹窗，让用户看到账号信息后再确认"*

**Agent 执行 context check**：

```yaml
context_summary:
  user_intent: "在三方账号绑定流程的 ACCOUNT_BIND_CONFIRM 状态增加确认弹窗，展示账号信息供用户二次确认"
  project_state:
    branch: "feature/confirm-dialog"
    uncommitted_changes: false
    last_commit: "a1b2c3d - Add binding workflow orchestrator"

assumptions:
  - assumption: "ACCOUNT_BIND_CONFIRM 状态已在 workflow.ts 中定义"
    confidence: "high"
    source: "docs/agent-os/workflows/vib-binding-to-signal-workflow-v0.1.md"
  - assumption: "确认弹窗数据来自 ACCOUNT_INFO_FETCHING 的输出"
    confidence: "medium"
    source: "需要验证 fetch 输出字段是否包含 nickname/gameAccountId"

missing_context:
  - item: "确认弹窗的 UI 设计"
    severity: "minor"
    impact: "只能用默认布局和文字描述"
    action: "向用户确认是否需要特定设计，否则使用文字确认"

risks:
  - risk: "新增弹窗状态可能改变状态机转换路径"
    likelihood: "low"
    impact: "high"
    mitigation: "新增状态仅插入 ACCOUNT_BIND_CONFIRM 之前，不影响其他路径"

next_action: "读取 src/binding/workflow.ts 定位 ACCOUNT_BIND_CONFIRM 的实现，设计插桩位置"
```
