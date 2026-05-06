# Agent Capability Protocol v0.1

Agent 能力声明、发现和调用协议。本协议是 VIB Agent OS 的通信层契约，定义所有智能体如何声明能力、交换数据、处理失败和交接任务。

---

## 1. 为什么 VIB Agent OS 需要统一协议

### 1.1 无协议的问题

VIB 平台涉及多个 Agent 角色（Planner、Executor、Reviewer）和多种 Skill（产品域、验证门、工程上下文、失败分析）。如果没有统一协议：

| 问题 | 后果 | 真实案例类比 |
|------|------|-------------|
| 每个 Skill 定义自己的输入格式 | Agent 无法互换，跨 Skill 调用需要 N×M 适配 | 每个微服务用不同 HTTP 方法做同一件事 |
| 无标准失败格式 | 调用方不知道"返回 null"是没找到还是系统错误 | 有的 API 返回 404，有的返回 200+空 body |
| 无能力发现机制 | 必须硬编码 Agent 依赖 | 写死 IP 地址而非 DNS |
| 无成本记录 | 无法优化 token/时间消耗 | 云服务不记费用 |
| 无交接协议 | Agent 不知道什么时候该交给谁 | 没有 SLA 的工单系统 |

### 1.2 统一协议带来的能力

| 能力 | 说明 |
|------|------|
| **可发现** | Agent 启动时注册能力，其他 Agent 可查询 |
| **可验证** | 每个调用有 schema 约束，类型安全 |
| **可追踪** | 所有调用有 trace ID，完整审计 |
| **可恢复** | 失败格式统一，调用方知道怎么处理 |
| **可度量** | 每次调用记录 token/延迟/成本 |
| **可替换** | 任何满足协议的能力实现可互换 |

---

## 2. Skill：Agent Capability Container

### 2.1 Skill 的定位演变

```
旧理解: Skill = Agent 的 Prompt（一段指令文本）
              ↓
新理解: Skill = Agent Capability Container（能力容器）
```

Skill 不再只是一段 Prompt，而是以下内容的完整封装：

```
┌──────────────────────────────────┐
│         SKILL.md                 │
│  ┌────────────────────────────┐  │
│  │ YAML Frontmatter           │  │  ← 元数据/声明
│  │  name, description,        │  │
│  │  version, category, owner  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Protocol Blocks            │  │  ← 行为契约
│  │  inputs | outputs | tools  │  │
│  │  memory | workflow | ...   │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Body (Markdown)            │  │  ← 人类可读文档
│  │  概述、流程、规则、示例     │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

### 2.2 Skill 作为 Capability Container 的含义

1. **自描述** — 一个 SKILL.md 文件 = 完整的能力规范，不需要读第二份文档
2. **自验证** — frontmatter 中的 schema 可自动校验调用是否合法
3. **可注册** — Skill 加载时自动向 CapabilityRegistry 注册自身
4. **可组合** — 一个 Skill 可以用 `handoff` 调用另一个 Skill
5. **可追踪** — 每次 Skill 调用的输入/输出/成本记录到 trace

### 2.3 Skill 与 Capability 的关系

```
Skill 是文件的组织单元（一个 .md 文件）
    ↓ 加载时注册
Capability 是运行时发现单元（CapabilityRegistry 中的条目）
    ↓ 调用时执行
Agent 是能力的运行时载体（持有 CapabilityRegistry 的 Agent 实例）
```

一个 Skill 可以注册多个 Capability。例如 `vib-agent-product-skill` 注册：
- `vib.binding.site.resolve`
- `vib.binding.oauth.authorize`
- `vib.binding.account.fetch`

---

## 3. Standard Skill Structure

每个 Skill 文件遵循以下结构：

```
skills/<skill-name>/
├── SKILL.md              ← 主文件（本协议定义的全部内容）
├── templates/            ← （可选）模板文件目录
│   └── *.template.md
└── assets/              ← （可选）资源文件目录
    └── *.png / *.json
```

### 3.1 SKILL.md 结构

```markdown
---
# YAML Frontmatter（见第 4 节）
name: "skill-name"
description: "..."
category: "..."
version: "0.1.0"
owner: "team-name"
inputs:
  - ...
outputs:
  - ...
tools:
  - ...
memory:
  - ...
workflow:
  - ...
verification:
  - ...
failure_modes:
  - ...
fallback:
  - ...
handoff:
  - ...
cost_tracking:
  - ...
---

# {Skill Name}

## 1. 概述

{2-3 句描述}

## 2. 触发条件

{什么场景加载本 skill}

## 3. 流程

{步骤描述}

## 4. 规则

{约束和规范}
```

---

## 4. YAML Frontmatter 标准

### 4.1 字段定义

#### `name`

- **作用**: Skill 的唯一标识符，用于注册、发现和引用
- **必填**: 是
- **约束**: 小写字母 + 连字符，全局唯一
- **示例**: `context-engineering`, `verification-gate`
- **违反问题**: 同名 Skill 导致注册覆盖，引用解析到错误目标；无 name 则无法注册到 CapabilityRegistry

#### `description`

- **作用**: 一句话说明 Skill 的用途和触发条件，用于自动匹配和发现
- **必填**: 是
- **示例**: `"Enforces verification gates at each workflow step. Every completed step must produce objective evidence."`
- **违反问题**: Agent 无法判断何时加载该 Skill；CapabilityRegistry.find() 返回无意义结果

#### `category`

- **作用**: Skill 分类标签，用于注册表组织和查询过滤
- **必填**: 是
- **允许值**:
  | 值 | 说明 | 示例 |
  |-----|------|------|
  | `process` | 工作流/流程类 | binding workflow |
  | `domain` | 领域知识类 | VIB product domain |
  | `protocol` | 通信协议类 | context engineering |
  | `quality` | 质量控制类 | verification gate |
  | `analysis` | 分析类 | failure analysis |
- **违反问题**: 无法按类别查询；注册表难以浏览；Agent 无法按域过滤能力

#### `version`

- **作用**: 语义化版本号，用于依赖解析和兼容性判断
- **必填**: 是
- **格式**: `MAJOR.MINOR.PATCH`（遵循 semver）
- **示例**: `"0.1.0"`, `"1.2.3"`
- **违反问题**: 无法判断接口是否兼容；依赖解析无法做版本范围检查；更新后旧调用方静默失败

#### `owner`

- **作用**: 负责维护该 Skill 的团队或个人，用于问题上报和变更通知
- **必填**: 否（推荐填）
- **示例**: `"platform-team"`, `"wanghao"`
- **违反问题**: 发现问题不知道找谁；变更无人 review；skill 变成无人维护的孤儿

#### `inputs`

- **作用**: 定义 Skill 接受的输入参数，含名称、类型、约束和说明
- **必填**: 是
- **结构**:
  ```yaml
  inputs:
    - name: string           # 参数名
      type: string           # 参数类型
      required: boolean      # 是否必填
      description: string    # 说明
      default?: any          # 默认值
      constraints?: string[] # 约束条件
  ```
- **示例**:
  ```yaml
  inputs:
    - name: url
      type: string
      required: true
      description: "三方游戏平台 URL"
      constraints: ["must be http(s) URL"]
    - name: timeoutMs
      type: number
      required: false
      default: 30000
      description: "超时时间（毫秒）"
  ```
- **违反问题**: 调用方不知道传什么参数；传入类型错误导致运行时崩溃；遗漏必填参数导致静默失败

#### `outputs`

- **作用**: 定义 Skill 的返回值，含名称、类型和说明
- **必填**: 是
- **结构**:
  ```yaml
  outputs:
    - name: string
      type: string
      description: string
      alwaysPresent: boolean  # 是否始终存在
  ```
- **示例**:
  ```yaml
  outputs:
    - name: resolved
      type: boolean
      description: "是否识别成功"
      alwaysPresent: true
    - name: provider
      type: string
      description: "匹配的 provider 名称"
      alwaysPresent: false
    - name: confidence
      type: number
      description: "识别置信度 0-1"
      alwaysPresent: false
  ```
- **违反问题**: 调用方不知道返回什么；假设字段存在但实际缺失导致 NPE；错误假设字段类型

#### `tools`

- **作用**: Skill 执行过程中需要调用的工具列表，用于权限预授权和资源预分配
- **必填**: 是（至少声明依赖的工具类型）
- **结构**:
  ```yaml
  tools:
    - name: string
      purpose: string
      required: boolean
  ```
- **示例**:
  ```yaml
  tools:
    - name: read
      purpose: "读取参考文档"
      required: true
    - name: write
      purpose: "写入绑定记录"
      required: false
    - name: execute
      purpose: "执行 shell 命令"
      required: false
  ```
- **违反问题**: Skill 执行到一半才发现缺乏必要工具权限；工具调用失败不返回有用错误；不知道预加载哪些工具

#### `memory`

- **作用**: 声明 Skill 需要读/写哪些持久化状态，用于状态隔离和缓存策略
- **必填**: 否（但推荐）
- **结构**:
  ```yaml
  memory:
    reads:
      - key: string
        description: string
        required: boolean
    writes:
      - key: string
        description: string
        ttl: string  # 保留时间
  ```
- **示例**:
  ```yaml
  memory:
    reads:
      - key: "binding:{userId}"
        description: "用户现有绑定记录"
        required: true
    writes:
      - key: "binding:{userId}:{bindingId}"
        description: "新建绑定记录"
        ttl: "permanent"
  ```
- **违反问题**: 状态读取失败导致工作流中断；写入冲突导致数据损坏；状态泄漏跨 skill 边界

#### `workflow`

- **作用**: 定义 Skill 内部的状态机或执行步骤，用于 Agent 执行导航
- **必填**: 否（流程型 Skill 应填）
- **结构**:
  ```yaml
  workflow:
    states:
      - name: string
        type: "initial|normal|terminal|error"
        transitions: string[]
    recovery:
      - from: string
        to: string
        condition: string
  ```
- **示例**:
  ```yaml
  workflow:
    states:
      - name: "INIT"
        type: initial
        transitions: ["URL_INPUT"]
      - name: "URL_INPUT"
        type: normal
        transitions: ["SITE_RECOGNIZING", "INVALID_URL"]
      - name: "SIGNAL_READY"
        type: terminal
        transitions: []
    recovery:
      - from: "INVALID_URL"
        to: "URL_INPUT"
        condition: "用户重新输入有效 URL"
  ```
- **违反问题**: Agent 不知道下一状态是什么；无异常状态定义导致卡死；无终态定义导致循环

#### `verification`

- **作用**: 定义 Skill 执行结果的验证条件，即 Verification Gate 的具体配置
- **必填**: 是
- **结构**:
  ```yaml
  verification:
    - id: string
      description: string
      type: "schema|invariant|existence|threshold"
      severity: "critical|major|minor"
  ```
- **示例**:
  ```yaml
  verification:
    - id: "gate-schema-valid"
      description: "输出符合 schema"
      type: schema
      severity: critical
    - id: "gate-confidence-range"
      description: "confidence ∈ [0, 1]"
      type: invariant
      severity: critical
    - id: "gate-binding-record"
      description: "绑定记录已写入 DB"
      type: existence
      severity: major
  ```
- **违反问题**: 无验证的 Skill 输出不可信；错误结果流入下游；critical gate 缺失导致数据损坏

#### `failure_modes`

- **作用**: 列举 Skill 执行中可能的失败模式、识别条件和恢复策略
- **必填**: 是
- **结构**:
  ```yaml
  failure_modes:
    - when: string        # 触发条件
      code: string        # 错误码
      recoverable: boolean
      recovery: string    # 恢复路径
  ```
- **示例**:
  ```yaml
  failure_modes:
    - when: "URL 格式校验失败"
      code: "INVALID_URL"
      recoverable: true
      recovery: "提示用户重新输入"
    - when: "OAuth token 过期"
      code: "AUTH_TOKEN_EXPIRED"
      recoverable: true
      recovery: "刷新 token 或引导重新授权"
    - when: "API 连续失败 3 次"
      code: "API_UNAVAILABLE"
      recoverable: false
      recovery: "上报不可恢复错误，通知用户稍后重试"
  ```
- **违反问题**: 未预见的失败导致 Agent 无响应（挂起/循环/崩馈）；恢复路径不可用导致重试死循环

#### `fallback`

- **作用**: 定义当 Skill 的核心能力不可用时的降级方案
- **必填**: 否（推荐填）
- **结构**:
  ```yaml
  fallback:
    strategy: "retry|alternative|degrade|abort"
    plan: string
  ```
- **示例**:
  ```yaml
  fallback:
    strategy: degrade
    plan: "LLM 服务降级：如果 Claude 不可用，自动切换到 DeepSeek；如果 DeepSeek 也不可用，返回缓存结果"
  ```
- **违反问题**: 核心依赖不可用时 Skill 直接失败；无降级路径导致整个工作流中断

#### `handoff`

- **作用**: 定义 Skill 在什么时候、什么条件下将控制权交给另一个 Skill/Agent
- **必填**: 否
- **结构**:
  ```yaml
  handoff:
    - to: string
      when: string
      payload: string
  ```
- **示例**:
  ```yaml
  handoff:
    - to: "verification-gate"
      when: "binding workflow 到达终态"
      payload: "输出数据和 gate 配置"
    - to: "failure-analysis"
      when: "binding workflow 进入不可恢复错误状态"
      payload: "错误上下文和 trace ID"
  ```
- **违反问题**: Agent 不知道完成当前步骤后该做什么；工作流终止而非继续；上下文在交接中丢失

#### `cost_tracking`

- **作用**: 定义 Skill 执行成本的估算方式和记录字段
- **必填**: 否（推荐填）
- **结构**:
  ```yaml
  cost_tracking:
    estimatedTokens: number
    estimatedTimeMs: number
    recordFields:
      - field: string
        description: string
  ```
- **示例**:
  ```yaml
  cost_tracking:
    estimatedTokens: 2500
    estimatedTimeMs: 5000
    recordFields:
      - field: "tokensUsed"
        description: "本次调用消耗的 token 数"
      - field: "durationMs"
        description: "执行耗时"
      - field: "toolCalls"
        description: "工具调用次数"
  ```
- **违反问题**: 无法预估调用成本；无成本记录导致无法优化；资源消耗失控

### 4.2 字段总览

| 字段 | 必填 | 类型 | 用途 | 违反后果 |
|------|------|------|------|---------|
| `name` | 是 | string | 唯一标识符 | 注册覆盖，引用错乱 |
| `description` | 是 | string | 用途与触发条件 | Agent 无法决策何时加载 |
| `category` | 是 | enum | 分类标签 | 无法搜索过滤 |
| `version` | 是 | semver | 版本兼容性 | 静默破坏兼容 |
| `owner` | 否 | string | 维护责任人 | 孤儿 skill |
| `inputs` | 是 | array | 输入参数定义 | 调用不规范，运行时崩馈 |
| `outputs` | 是 | array | 返回值定义 | 调用方假设错误 |
| `tools` | 是 | array | 工具依赖声明 | 权限预授权失败 |
| `memory` | 否 | object | 状态持久化 | 状态泄漏或损坏 |
| `workflow` | 否 | object | 状态机定义 | Agent 失航 |
| `verification` | 是 | array | 验证条件 | 不可信输出流入下游 |
| `failure_modes` | 是 | array | 失败模式 | 未预见失败致崩馈 |
| `fallback` | 否 | object | 降级方案 | 核心依赖不可用致中断 |
| `handoff` | 否 | array | 交接契约 | 工作流终止而非延续 |
| `cost_tracking` | 否 | object | 成本记录 | 资源消耗失控 |

---

## 5. 输入协议

### 5.1 输入格式标准

所有 Skill 调用必须使用统一的输入格式：

```yaml
# 定义（在 frontmatter 中）
inputs:
  - name: url
    type: string
    required: true
    description: "三方游戏平台 URL"
    constraints:
      - "must be valid http(s) URL"
      - "max length 2048"
  - name: timeoutMs
    type: number
    required: false
    default: 30000
    constraints:
      - "1000 ≤ value ≤ 60000"
  - name: options
    type: object
    required: false
    description: "扩展选项"

# 调用（运行时）
{
  "url": "https://www.pgsoft.com/games/lucky-dragon",
  "timeoutMs": 30000
}
```

### 5.2 输入校验规则

1. **必填检查** — `required: true` 的参数缺失 → 返回 `ERR_MISSING_INPUT`
2. **类型检查** — 传入类型与 `type` 不匹配 → 返回 `ERR_TYPE_MISMATCH`
3. **约束检查** — `constraints` 中任一条件不满足 → 返回 `ERR_CONSTRAINT_VIOLATION`
4. **默认填充** — `required: false` 且未传入 → 使用 `default` 值
5. **未知字段忽略** — 传入 frontmatter 未定义的 params → 记录 warning，继续执行

### 5.3 输入错误响应

```json
{
  "status": "error",
  "error": {
    "code": "ERR_MISSING_INPUT",
    "message": "缺少必填参数 'url'",
    "field": "url"
  }
}
```

---

## 6. 输出协议

### 6.1 输出格式标准

```yaml
# 定义（在 frontmatter 中）
outputs:
  - name: resolved
    type: boolean
    description: "是否识别成功"
    alwaysPresent: true
  - name: provider
    type: string
    description: "匹配的 provider 名称"
    alwaysPresent: false
  - name: confidence
    type: number
    description: "置信度 0-1"
    alwaysPresent: false

# 结果（运行时）
{
  "status": "success",
  "data": {
    "resolved": true,
    "provider": "PG Soft",
    "confidence": 0.95
  },
  "metrics": {
    "durationMs": 340,
    "tokensUsed": 850
  }
}
```

### 6.2 统一包装

所有 Skill 的输出必须包裹在标准响应结构中：

```typescript
interface StandardResponse {
  status: "success" | "error" | "timeout";
  data?: Record<string, unknown>;           // 对应 outputs 定义
  error?: StandardError;                     // 对应 failure_modes
  metrics: {
    durationMs: number;
    tokensUsed: number;
    toolCalls: number;
    timestamp: string;                       // ISO-8601
  };
}
```

### 6.3 输出约束

1. `status: "success"` 时，`data` 必须包含所有 `alwaysPresent: true` 的字段
2. `status: "error"` 时，`error` 字段必须存在
3. 输出中不能包含 `inputs` 未声明的数据（数据边界约束）

---

## 7. 工具调用协议

### 7.1 工具声明

Skill 必须在前置声明中列出需要调用的工具：

```yaml
tools:
  - name: read
    purpose: "读取参考文档"
    required: true
    maxCalls: 10
  - name: write
    purpose: "写入绑定记录"
    required: false
    maxCalls: 1
```

### 7.2 工具调用格式

```typescript
interface ToolCall {
  toolName: string;
  params: Record<string, unknown>;
  context: {
    traceId: string;
    skillName: string;
    retryCount: number;
  };
}

interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
  metrics: {
    durationMs: number;
    retries: number;
  };
}
```

### 7.3 工具调用规则

| 规则 | 说明 | 违反后果 |
|------|------|---------|
| 预声明 | 所有工具必须在 `tools` 中声明 | 调用被 CapabilityRegistry 拒绝 |
| 用途匹配 | 工具用途必须匹配声明的 `purpose` | 审计失败 |
| 频次限制 | `maxCalls` 限制单次 Skill 调用中的工具调用次数 | 超额后工具不可用 |
| 超时控制 | 每个工具调用有独立 timeout（默认 10s） | 工具挂起影响整个 Skill |
| 幂等重试 | 可重试的工具应设计为幂等 | 重试导致多次副作用 |

---

## 8. 上下文协议

### 8.1 上下文传递

每次 Skill 调用带入一个上下文对象，在整个调用链中透传：

```yaml
# 定义（在 frontmatter 中）
context:
  required:
    - name: traceId
      description: "全局追踪 ID"
    - name: userId
      description: "用户标识"

# 运行时
{
  "traceId": "trace-bind-20260507-001",
  "userId": "user_demo_001",
  "sessionId": "sess_abc123",          # 可选
  "workflowId": "wf_bind_001",         # 可选
  "locale": "zh-CN"                    # 可选
}
```

### 8.2 上下文传递规则

1. **透传** — 调用方传入的 context 必须透传给被调用方，不得修改
2. **追加** — 被调用方可追加键值，但不得覆盖已有键
3. **审计** — 所有 context 内容记录到 trace span 的 attributes
4. **最小化** — context 只包含路由和审计所需字段，不包含业务数据

### 8.3 违反上下文协议的典型问题

| 问题 | 表现 | 根因 |
|------|------|------|
| Trace 断裂 | 日志出现孤儿 span | context.traceId 未被传递 |
| 用户身份丢失 | 下游不知道是谁发起的请求 | userId 被覆盖 |
| 重复审计 | 同一个操作被多次记录 | 每个 skill 各自生成不共享的 trace ID |

---

## 9. 记忆协议

### 9.1 状态读写声明

```yaml
memory:
  reads:
    - key: "binding:{userId}"
      description: "用户现有绑定记录"
      required: true
      ttl: "permanent"
  writes:
    - key: "binding:{userId}:{bindingId}"
      description: "新建绑定记录"
      ttl: "permanent"
      conflict: "reject"  # reject | overwrite | merge
```

### 9.2 状态隔离规则

1. **Key 命名空间** — 所有 key 必须以 `{domain}:` 为前缀，防止跨域冲突
2. **Scope 限制** — Skill 只能读写其声明过的 key 模式（`memory.reads[].key` 和 `memory.writes[].key`）
3. **TTL 强制** — 超过 `ttl` 的数据可被回收，Skill 不能假设数据永久可用
4. **冲突策略** — `conflict` 字段声明写入冲突时的行为：`reject`（报错）、`overwrite`（覆盖）、`merge`（合并）

### 9.3 记忆域命名空间

| 域 | Key 模式 | 说明 |
|-----|---------|------|
| 绑定 | `binding:*` | 账号绑定状态 |
| 用户 | `user:*` | 用户信息 |
| 会话 | `session:*` | 会话状态 |
| 工作流 | `workflow:*` | 工作流运行时状态 |
| 缓存 | `cache:*` | 临时缓存 |

---

## 10. 验证协议

### 10.1 验证门定义

```yaml
verification:
  - id: "gate-schema-valid"
    description: "输出符合 schema"
    type: schema
    severity: critical
    auto: true
  - id: "gate-binding-record"
    description: "绑定记录已写入 DB"
    type: existence
    severity: major
    auto: true
    checkPath: "binding:{userId}:{bindingId}"
  - id: "gate-manual-review"
    description: "需要人工确认"
    type: manual
    severity: critical
    auto: false
```

### 10.2 验证门类型

| 类型 | 自动执行 | 说明 | 失败后果 |
|------|---------|------|---------|
| `schema` | 是 | 输出结构符合预期 schema | critical: block 流程 |
| `invariant` | 是 | 领域不变量未被破坏 | critical: block 流程 |
| `existence` | 是 | 某文件/记录存在 | major: 记录 warning |
| `threshold` | 是 | 性能/质量指标达标 | major: 记录 warning |
| `manual` | 否 | 需要人工确认 | critical: 等待确认 |

### 10.3 验证门执行

```
[Skill Output] → [Gate: schema] → [Gate: invariant] → [Gate: existence] ...
                      │                  │                    │
                   pass/fail           pass/fail           pass/fail
                      ▼                  ▼                    ▼
                [Next Gate]        [Next Gate]         [Next Gate]
                                                      all pass
                                                         ▼
                                                  [Skill Complete]
```

所有 gate 必须执行（无短路），即使前面的 gate 失败。这确保调用方可获得完整的验证报告。

---

## 11. 失败处理协议

### 11.1 失败模式声明

```yaml
failure_modes:
  - when: "URL 格式校验失败"
    code: "INVALID_URL"
    recoverable: true
    recovery: "提示用户重新输入"
    retryable: false
  - when: "OAuth token 过期"
    code: "AUTH_TOKEN_EXPIRED"
    recoverable: true
    recovery: "刷新 token 或引导重新授权"
    retryable: true
    maxRetries: 2
  - when: "API 连续失败 3 次"
    code: "API_UNAVAILABLE"
    recoverable: false
    recovery: "上报不可恢复错误，通知用户稍后重试"
    retryable: false
```

### 11.2 失败响应格式

```json
{
  "status": "error",
  "error": {
    "code": "AUTH_TOKEN_EXPIRED",
    "message": "OAuth access token has expired for provider 'pgsoft.com'",
    "details": {
      "provider": "pgsoft.com",
      "tokenAgeHours": 2.5,
      "httpStatus": 401
    },
    "recoverable": true,
    "retryable": true,
    "retryCount": 0,
    "maxRetries": 2
  },
  "metrics": {
    "durationMs": 1234,
    "tokensUsed": 500
  }
}
```

### 11.3 失败处理规则

| 情景 | 动作 |
|------|------|
| `recoverable: true` + `retryable: true` | 自动重试，使用指数退避 |
| `recoverable: true` + `retryable: false` | 不自动重试，但可人工干预后恢复 |
| `recoverable: false` | 上报为不可恢复错误，触发 `fallback` 或 `handoff` |
| 非声明表中的错误 | 兜底方案：记录完整错误上下文，按不可恢复处理 |

### 11.4 重试策略

```yaml
# 内置重试策略
retryStrategy:
  maxRetries: 3             # 或使用 failure_modes 中的 maxRetries
  backoff: "exponential"    # fixed | exponential | linear
  baseDelayMs: 1000
  maxDelayMs: 30000
  jitter: true              # 启用随机抖动，防止 thundering herd
```

---

## 12. 交接协议

### 12.1 交接声明

```yaml
handoff:
  - to: "verification-gate"
    when: "binding workflow 到达终态"
    payload: "outputs + verification config"
    blocking: true          # true = 等待交接完成, false = 异步
  - to: "failure-analysis"
    when: "binding workflow 进入不可恢复错误"
    payload: "error context + trace ID"
    blocking: true
  - to: "product-prd"
    when: "用户请求定义新功能"
    payload: "user input + constraint"
    blocking: false
```

### 12.2 交接流程

```
[Current Skill]                    [Target Skill]
      │                                  │
      │  1. 触发条件满足                    │
      │  2. 打包 payload                   │
      │─────────────────────────────────→│  3. 接收上下文
      │  4. status: handoff               │  4. 执行目标 skill
      │  5. 等待（blocking=true）           │  5. 返回结果
      │←─────────────────────────────────│
      │  6. 接收结果，继续流程              │
```

### 12.3 交接上下文传递

交接时，以下上下文必须传递：

| 字段 | 说明 | 来源 |
|------|------|------|
| `traceId` | 全局追踪 ID | 不变 |
| `handoffFrom` | 来源 Skill 名称 | 自动注入 |
| `handoffReason` | 交接原因（matching `when` clause） | 自动注入 |
| `payload` | 交接数据 | Skill 定义 |
| `originalInput` | 原始输入 | 可选 |

### 12.4 交接失败处理

| 问题 | 行为 |
|------|------|
| 目标 Skill 未注册 | 返回 `HANDOFF_TARGET_NOT_FOUND`，当前 Skill 继续持有控制权 |
| 目标 Skill 执行失败 | 错误透传回调用方 |
| 循环交接 | 最多允许 3 层嵌套交接，超出返回 `HANDOFF_DEPTH_EXCEEDED` |

---

## 13. 成本记录协议

### 13.1 成本声明

```yaml
cost_tracking:
  estimatedTokens: 2500
  estimatedTimeMs: 5000
  estimatedCost: 0.0025       # USD（可选）
  recordFields:
    - field: "tokensUsed"
      description: "本次调用消耗的 token 数"
    - field: "durationMs"
      description: "执行耗时"
    - field: "toolCalls"
      description: "工具调用次数"
    - field: "retries"
      description: "重试次数"
```

### 13.2 成本记录格式

每次 Skill 调用完成后，自动记录成本数据到 trace span：

```json
{
  "skill": "binding-workflow",
  "caller": "user-repl",
  "traceId": "trace-bind-001",
  "cost": {
    "estimated": { "tokens": 2500, "timeMs": 5000 },
    "actual": { "tokens": 3200, "timeMs": 7800 },
    "overage": { "tokens": 1.28, "timeMs": 1.56 },
    "toolCalls": 4,
    "retries": 1,
    "handoffs": 0
  }
}
```

### 13.3 成本追踪规则

1. **每次调用必记录** — 没有成本数据的调用视为审计缺失
2. **预估 vs 实际对比** — `overage ≥ 2.0` 触发警告，表示估算严重不准确
3. **累计追踪** — 同一个 traceId 下所有 skill 调用的成本累加
4. **异常成本标记** — 重试、交接、fallback 产生的额外成本单独标记

### 13.4 成本优化信号

| 信号 | 阈值 | 动作 |
|------|------|------|
| token overage > 2.0 | 实际 > 预估 × 2 | 更新估算，检查上下文管理 |
| retry rate > 10% | 重试调用 / 总调用 > 0.1 | 检查失败模式和恢复策略 |
| handoff depth > 2 | 嵌套交接 > 2 层 | 检查 Skill 边界是否合理 |
| zero cost records | 调用完成但无成本数据 | 检查 cost_tracking 实现 |

---

## 14. 最小可用模板

以下是一个 Skill 的最小可用 SKILL.md，包含所有必填字段：

```markdown
---
name: "example-skill"
description: "一句话描述该 skill 的用途和触发场景"
category: "process"            # process | domain | protocol | quality | analysis
version: "0.1.0"
owner: "team-name"

inputs:
  - name: exampleInput
    type: string
    required: true
    description: "输入说明"

outputs:
  - name: exampleOutput
    type: string
    description: "输出说明"
    alwaysPresent: true

tools:
  - name: read
    purpose: "读取参考数据"
    required: true

verification:
  - id: "gate-output-exists"
    description: "输出非空"
    type: existence
    severity: critical

failure_modes:
  - when: "输入无效"
    code: "INVALID_INPUT"
    recoverable: true
    recovery: "提示重新输入"
---

# Example Skill

## 概述

{2-3 句}

## 触发条件

{何时加载}

## 流程

{步骤}
```

### 14.1 最小必填字段清单

| # | 字段 | 原因 |
|---|------|------|
| 1 | `name` | 注册和发现 |
| 2 | `description` | 触发判断 |
| 3 | `category` | 分类过滤 |
| 4 | `version` | 兼容性管理 |
| 5 | `inputs` | 调用规范 |
| 6 | `outputs` | 结果规范 |
| 7 | `tools` | 工具权限 |
| 8 | `verification` | 质量保障 |
| 9 | `failure_modes` | 失败处理 |

---

## 15. VIB 场景示例

### VIB 绑定工作流 Skill

以下是一个完整示例，展示 `vib-agent-product-skill` 中绑定工作流的 Capability Protocol 定义：

```markdown
---
name: "vib-binding-workflow"
description: "三方游戏账号绑定工作流，从用户输入 URL 到信号就绪的完整流程"
category: "process"
version: "0.2.0"
owner: "platform-team"

inputs:
  - name: url
    type: string
    required: true
    description: "第三方游戏平台 URL"
    constraints:
      - "must be valid http(s) URL"
      - "max length 2048"
  - name: userId
    type: string
    required: true
    description: "平台用户 ID"
  - name: timeoutMs
    type: number
    required: false
    default: 30000
    constraints:
      - "5000 ≤ value ≤ 60000"

outputs:
  - name: state
    type: string
    description: "终态（SIGNAL_READY 或错误状态）"
    alwaysPresent: true
  - name: signal
    type: object
    description: "信号数据（终态为 SIGNAL_READY 时存在）"
    alwaysPresent: false
  - name: binding
    type: object
    description: "绑定记录"
    alwaysPresent: false

tools:
  - name: read
    purpose: "读取域名匹配规则和参考文档"
    required: true
  - name: write
    purpose: "写入绑定记录到 State Store"
    required: true
  - name: execute
    purpose: "执行网络请求验证站点"
    required: false

memory:
  reads:
    - key: "binding:{userId}"
      description: "检查用户现有绑定"
      required: true
  writes:
    - key: "binding:{userId}:{bindingId}"
      description: "新建绑定记录"
      ttl: "permanent"
      conflict: "reject"

workflow:
  states:
    - name: "INIT"
      type: initial
      transitions: ["URL_INPUT"]
    - name: "URL_INPUT"
      type: normal
      transitions: ["SITE_RECOGNIZING", "INVALID_URL"]
    - name: "SITE_RECOGNIZING"
      type: normal
      transitions: ["SITE_RECOGNIZED", "UNSUPPORTED_SITE"]
    - name: "SITE_RECOGNIZED"
      type: normal
      transitions: ["AUTH_CONFIRM_REQUIRED"]
    - name: "AUTH_CONFIRM_REQUIRED"
      type: normal
      transitions: ["THIRD_PARTY_AUTHORIZING", "AUTH_REJECTED"]
    - name: "THIRD_PARTY_AUTHORIZING"
      type: normal
      transitions: ["ACCOUNT_INFO_FETCHING", "AUTH_FAILED"]
    - name: "ACCOUNT_INFO_FETCHING"
      type: normal
      transitions:
        - "ACCOUNT_BIND_CONFIRM"
        - "ACCOUNT_FETCH_FAILED"
        - "ACCOUNT_ALREADY_BOUND"
    - name: "ACCOUNT_BIND_CONFIRM"
      type: normal
      transitions: ["ACCOUNT_BOUND", "BIND_FAILED"]
    - name: "ACCOUNT_BOUND"
      type: normal
      transitions: ["AGENT_ANALYZING"]
    - name: "AGENT_ANALYZING"
      type: normal
      transitions: ["SIGNAL_READY"]
    - name: "SIGNAL_READY"
      type: terminal
      transitions: []
    - name: "INVALID_URL"
      type: error
      transitions: ["URL_INPUT"]
      recoverable: true
    - name: "UNSUPPORTED_SITE"
      type: error
      transitions: ["URL_INPUT"]
      recoverable: true
    - name: "AUTH_REJECTED"
      type: error
      transitions: ["AUTH_CONFIRM_REQUIRED"]
      recoverable: true
    - name: "AUTH_FAILED"
      type: error
      transitions: ["THIRD_PARTY_AUTHORIZING"]
      recoverable: true
    - name: "ACCOUNT_FETCH_FAILED"
      type: error
      transitions: ["ACCOUNT_INFO_FETCHING"]
      recoverable: true
    - name: "ACCOUNT_ALREADY_BOUND"
      type: error
      transitions: ["ACCOUNT_BIND_CONFIRM", "UNBIND_FLOW"]
      recoverable: true
    - name: "BIND_FAILED"
      type: error
      transitions: ["ACCOUNT_BIND_CONFIRM"]
      recoverable: true

verification:
  - id: "gate-schema-valid"
    description: "终态输出符合 schema"
    type: schema
    severity: critical
  - id: "gate-confidence-range"
    description: "信号置信度 ∈ [0, 1]"
    type: invariant
    severity: critical
  - id: "gate-binding-written"
    description: "绑定记录已持久化"
    type: existence
    severity: major

failure_modes:
  - when: "URL 格式校验失败"
    code: "INVALID_URL"
    recoverable: true
    recovery: "提示用户重新输入有效 URL"
    retryable: false
  - when: "站点不在支持列表"
    code: "UNSUPPORTED_SITE"
    recoverable: true
    recovery: "提示用户输入支持的站点，列出支持列表"
    retryable: false
  - when: "OAuth token 过期"
    code: "AUTH_TOKEN_EXPIRED"
    recoverable: true
    recovery: "刷新 token 或引导重新授权"
    retryable: true
    maxRetries: 2
  - when: "API 获取账号失败"
    code: "ACCOUNT_FETCH_FAILED"
    recoverable: true
    recovery: "指数退避重试最多 3 次"
    retryable: true
    maxRetries: 3
  - when: "绑定写入冲突"
    code: "BIND_CONFLICT"
    recoverable: true
    recovery: "返回冲突信息供用户查看"
    retryable: false
  - when: "API 连续失败 3 次"
    code: "API_UNAVAILABLE"
    recoverable: false
    recovery: "上报不可恢复错误，通知用户稍后重试"
    retryable: false

fallback:
  strategy: degrade
  plan: "如果站点识别 API 不可用，使用本地缓存的 provider 列表做匹配；如果 LLM 分析不可用，返回绑定完成但不生成信号"

handoff:
  - to: "verification-gate"
    when: "绑定工作流到达 SIGNAL_READY 或任何 error 终态"
    payload: "终态输出数据 + verification 配置"
    blocking: true
  - to: "failure-analysis"
    when: "API_UNAVAILABLE（不可恢复错误）"
    payload: "完整错误上下文 + trace ID"
    blocking: true

cost_tracking:
  estimatedTokens: 3500
  estimatedTimeMs: 15000
  recordFields:
    - field: "tokensUsed"
      description: "本次调用消耗 token 数"
    - field: "durationMs"
      description: "执行耗时"
    - field: "toolCalls"
      description: "工具调用次数"
    - field: "statesVisited"
      description: "经过的状态数"
    - field: "retries"
      description: "重试次数"
---
```

---

## 附录 A：兼容性矩阵

| 协议版本 | 变更 | 向后兼容 |
|----------|------|---------|
| v0.1 | 初始定义 | — |
| v0.2（计划） | 增加异步调用模式 | 是 |
| v0.3（计划） | 增加批量调用模式 | 是 |
| v1.0（计划） | 正式发布 | 否（可能 break） |

## 附录 B：错误码总表

| 错误码 | 所属协议 | 含义 |
|--------|---------|------|
| `ERR_MISSING_INPUT` | 输入 | 缺少必填输入参数 |
| `ERR_TYPE_MISMATCH` | 输入 | 输入参数类型不匹配 |
| `ERR_CONSTRAINT_VIOLATION` | 输入 | 输入参数违反约束 |
| `ERR_OUTPUT_MISSING` | 输出 | 缺少 alwaysPresent 的输出字段 |
| `ERR_TOOL_NOT_DECLARED` | 工具 | 调用未声明的工具 |
| `ERR_TOOL_MAX_CALLS` | 工具 | 工具调用超过频次限制 |
| `ERR_TOOL_TIMEOUT` | 工具 | 工具调用超时 |
| `ERR_MEMORY_KEY_INVALID` | 记忆 | 访问未声明的 memory key |
| `ERR_MEMORY_CONFLICT` | 记忆 | 写入冲突（conflict: reject） |
| `ERR_GATE_FAILED` | 验证 | verification gate 未通过 |
| `ERR_UNKNOWN_FAILURE` | 失败 | 未在 failure_modes 中声明的错误 |
| `ERR_HANDOFF_TARGET_NOT_FOUND` | 交接 | 交接目标 Skill 未注册 |
| `ERR_HANDOFF_DEPTH_EXCEEDED` | 交接 | 交接嵌套超过 3 层 |
| `ERR_COST_TRACKING_MISSING` | 成本 | 调用完成但无成本记录 |

## 附录 C：与 addyosani/agent-skills 的关系

| 维度 | addyosani/agent-skills | Capability Protocol v0.1 |
|------|----------------------|------------------------|
| 定位 | 工程工作流指令集 | Agent 间通信契约 |
| 格式 | Markdown body 为主 | YAML frontmatter 为核心 |
| 协议 | 无显式协议定义 | 10 个子协议 |
| 输入/输出 | 描述性 | Schema 驱动 |
| Runtime | 无（纯文档） | CapabilityRegistry 可执行 |

两者互补：agent-skills 提供"Agent 应该怎么做"的工作流指令，Capability Protocol 提供"Agent 怎么被调用"的通信契约。一个 Skill 可以同时引用两者。
