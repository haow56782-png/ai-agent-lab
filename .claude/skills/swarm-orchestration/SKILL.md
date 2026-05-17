---
name: swarm-orchestration
description: "Orchestrate multi-agent swarms with agentic-flow for parallel task execution, dynamic topology, and intelligent coordination. Use when scaling beyond single agents, implementing complex workflows, or building distributed AI systems."
category: orchestration
version: "0.1.0"
owner: platform-team

inputs:
  - name: task
    type: string
    required: true
    description: "任务描述，用于定义 swarm 执行的目标"
  - name: topology
    type: string
    required: false
    description: "Swarm 拓扑类型 (mesh / hierarchical / adaptive)"
  - name: maxAgents
    type: number
    required: false
    description: "最大 agent 数量"

outputs:
  - name: execution_result
    type: object
    description: "任务执行结果"
    alwaysPresent: true
  - name: metrics
    type: object
    description: "Swarm 性能指标"
    alwaysPresent: false
  - name: error
    type: object
    description: "错误信息"
    alwaysPresent: false

tools:
  - name: agentic-flow
    purpose: "Swarm 初始化和任务编排"
    required: true
  - name: hooks
    purpose: "任务前后的协调和同步"
    required: false

memory:
  required:
    - "swarm_config (当前 swarm 的拓扑和 agent 配置)"
    - "task_state (任务分配和执行状态)"
  ttl: "会话级别"

workflow:
  steps:
    - "Swarm Initialization — 根据任务选择拓扑并初始化 swarm"
    - "Agent Spawning — 创建 agent 并分配角色"
    - "Task Distribution — 并行或顺序分配任务"
    - "Execution Monitoring — 实时监控执行状态"
    - "Result Collection — 汇总执行结果"

verification:
  - id: "gate-swarm-ready"
    description: "确认 swarm 初始化完成"
    type: existence
    severity: critical
  - id: "gate-tasks-done"
    description: "确认所有任务执行完毕"
    type: invariant
    severity: critical
  - id: "gate-metrics-ok"
    description: "确认性能指标在阈值内"
    type: invariant
    severity: major

failure_modes:
  - when: "Agent 协调失败"
    code: "COORDINATION_FAILURE"
    recoverable: true
    recovery: "启用 fault tolerance 重试机制"
  - when: "任务执行超时"
    code: "TASK_TIMEOUT"
    recoverable: true
    recovery: "重新分配任务给可用 agent"
  - when: "Swarm 初始化失败"
    code: "INIT_FAILURE"
    recoverable: true
    recovery: "检查配置后重试"
  - when: "内存协调失败"
    code: "MEMORY_FAILURE"
    recoverable: false
    recovery: "提示用户检查内存服务状态"

fallback:
  strategy: degrade
  plan: "agentic-flow MCP 不可用时使用 CLI 命令替代；单个 agent 失败时自动重新分配任务"

handoff:
  - to: "verification-gate"
    when: "Swarm 任务完成"
    payload: "执行结果和 metrics"
  - to: "failure-analysis"
    when: "不可恢复错误"
    payload: "错误上下文和 trace ID"

cost_tracking:
  estimatedTokens: 5000
  estimatedTimeMs: 30000
  recordFields:
    - field: "agentsUsed"
      description: "使用的 agent 数"
    - field: "tasksExecuted"
      description: "执行的任务数"
    - field: "errorsEncountered"
      description: "遇到的错误数"
---

# Swarm Orchestration

## What This Skill Does

Orchestrates multi-agent swarms using agentic-flow's advanced coordination system. Supports mesh, hierarchical, and adaptive topologies with automatic task distribution, load balancing, and fault tolerance.

## 1. Purpose

Orchestrate multi-agent swarms with agentic-flow for parallel task execution, dynamic topology, and intelligent coordination. Use when scaling beyond single agents, implementing complex workflows, or building distributed AI systems.

## 2. References

- Swarm Guide: docs/swarm/orchestration.md
- Topology Patterns: docs/swarm/topologies.md
- Hooks Integration: docs/hooks/coordination.md

## 3. Core Principles / Architecture

### Topology Patterns

#### 1. Mesh (Peer-to-Peer)
Equal peers, distributed decision-making.

```typescript
await swarm.init({
  topology: 'mesh',
  agents: ['coder', 'tester', 'reviewer'],
  communication: 'broadcast'
});
```

#### 2. Hierarchical (Queen-Worker)
Centralized coordination, specialized workers.

```typescript
await swarm.init({
  topology: 'hierarchical',
  queen: 'architect',
  workers: ['backend-dev', 'frontend-dev', 'db-designer']
});
```

#### 3. Adaptive (Dynamic)
Automatically switches topology based on task.

```typescript
await swarm.init({
  topology: 'adaptive',
  optimization: 'task-complexity'
});
```

## 4. Workflow

### Task Orchestration

#### Parallel Execution
Execute tasks concurrently.

```typescript
const results = await swarm.execute({
  tasks: [
    { agent: 'coder', task: 'Implement API endpoints' },
    { agent: 'frontend', task: 'Build UI components' },
    { agent: 'tester', task: 'Write test suite' }
  ],
  mode: 'parallel',
  timeout: 300000 // 5 minutes
});
```

#### Pipeline Execution
Sequential pipeline with dependencies.

```typescript
await swarm.pipeline([
  { stage: 'design', agent: 'architect' },
  { stage: 'implement', agent: 'coder', after: 'design' },
  { stage: 'test', agent: 'tester', after: 'implement' },
  { stage: 'review', agent: 'reviewer', after: 'test' }
]);
```

#### Adaptive Execution
Let swarm decide execution strategy.

```typescript
await swarm.autoOrchestrate({
  goal: 'Build production-ready API',
  constraints: {
    maxTime: 3600,
    maxAgents: 8,
    quality: 'high'
  }
});
```

### Memory Coordination

Share state across swarm.

```typescript
await swarm.memory.store('api-schema', {
  endpoints: [...],
  models: [...]
});

// Agents read shared memory
const schema = await swarm.memory.retrieve('api-schema');
```

### Integration with Hooks

```bash
# Pre-task coordination
npx agentic-flow hooks pre-task --description "Build API"

# Post-task synchronization
npx agentic-flow hooks post-task --task-id "task-123"

# Session restore
npx agentic-flow hooks session-restore --session-id "swarm-001"
```

## 5. Data Boundaries

Swarm agents share context through structured memory stores. Each agent has access only to the memory namespaces assigned to it. Cross-agent data sharing is explicit via `memory.store` and `memory.retrieve`, not implicit. Sensitive configuration (API keys, secrets) must never be stored in shared swarm memory.

## 6. Failure Modes

| code | 异常 | 可恢复 | 恢复路径 |
|------|------|--------|----------|
| `COORDINATION_FAILURE` | Agent 协调失败 | 是 | 启用 fault tolerance 重试机制 |
| `TASK_TIMEOUT` | 任务执行超时 | 是 | 重新分配任务给可用 agent |
| `INIT_FAILURE` | Swarm 初始化失败 | 是 | 检查配置后重试 |
| `MEMORY_FAILURE` | 内存协调失败 | 否 | 提示用户检查内存服务状态 |

## 7. Inputs

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task` | string | 是 | 任务描述，定义 swarm 执行的目标 |
| `topology` | string | 否 | Swarm 拓扑类型 (mesh/hierarchical/adaptive) |
| `maxAgents` | number | 否 | 最大 agent 数量 |

## 8. Outputs

| 输出 | 类型 | 说明 |
|------|------|------|
| `execution_result` | object | 任务执行结果 |
| `metrics` | object | Swarm 性能指标 |
| `error` | object | 错误信息 |

## 9. When to Use

### Prerequisites

- agentic-flow v3.0.0-alpha.1+
- Node.js 18+
- Understanding of distributed systems (helpful)

### Quick Start

```bash
# Initialize swarm
npx agentic-flow hooks swarm-init --topology mesh --max-agents 5

# Spawn agents
npx agentic-flow hooks agent-spawn --type coder
npx agentic-flow hooks agent-spawn --type tester
npx agentic-flow hooks agent-spawn --type reviewer

# Orchestrate task
npx agentic-flow hooks task-orchestrate \
  --task "Build REST API with tests" \
  --mode parallel
```

## 10. Verification

- [ ] Swarm initialization complete — all agents reachable (gate-swarm-ready)
- [ ] All tasks executed successfully with expected results (gate-tasks-done)
- [ ] Performance metrics within acceptable thresholds (gate-metrics-ok)

## 11. Forbidden Behaviors

| 行为 | 后果 |
|------|------|
| 跳过 topology 初始化直接分配任务 | 导致 agent 通信失败 |
| 忽略 fault tolerance 配置 | 单个 agent 失败导致整个任务失败 |
| 不设置任务超时 | 可能导致任务无限等待 |
| 在共享内存中存储 secrets | 敏感信息泄露风险 |

## 12. Output Template

```yaml
execution_result:
  status: "success | failed | partial"
  tasks_completed: N
  tasks_failed: N
  agents_used: N
  duration_ms: N
  metrics:
    throughput: N
    latency_ms: N
    success_rate: N
```

## 13. Example

### 场景：构建 REST API

1. 初始化 mesh 拓扑 swarm，最大 5 个 agent
2. spawn coder, tester, reviewer 三个 agent
3. 并行分配 API 开发、测试编写、code review 任务
4. agent 通过共享内存协调 schema 定义
5. 监控执行状态，超时自动重试
6. 汇总结果输出

## 14. Fallback Strategy

### Advanced Features

#### Load Balancing
Automatic work distribution.

```typescript
await swarm.enableLoadBalancing({
  strategy: 'dynamic',
  metrics: ['cpu', 'memory', 'task-queue']
});
```

#### Fault Tolerance
Handle agent failures.

```typescript
await swarm.setResiliency({
  retry: { maxAttempts: 3, backoff: 'exponential' },
  fallback: 'reassign-task'
});
```

#### Performance Monitoring
Track swarm metrics.

```typescript
const metrics = await swarm.getMetrics();
// { throughput, latency, success_rate, agent_utilization }
```

## 15. Handoff Protocol

| 接收方 | 触发条件 | 传递内容 |
|--------|---------|---------|
| verification-gate | Swarm 任务完成 | 执行结果 + metrics |
| failure-analysis | 不可恢复错误 | 错误上下文 + trace ID |

## Best Practices

1. **Start small**: Begin with 2-3 agents, scale up
2. **Use memory**: Share context through swarm memory
3. **Monitor metrics**: Track performance and bottlenecks
4. **Enable hooks**: Automatic coordination and sync
5. **Set timeouts**: Prevent hung tasks
