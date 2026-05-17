---
name: swarm-advanced
description: Advanced swarm orchestration patterns for research, development, testing, and complex distributed workflows
category: orchestration
version: 2.0.0
owner: platform-team

inputs:
  - name: task
    type: string
    required: true
    description: "Swarm 执行的任务描述"
  - name: topology
    type: string
    required: false
    description: "Swarm 拓扑类型 (mesh/hierarchical/star/ring)"
  - name: maxAgents
    type: number
    required: false
    description: "最大 agent 数量"
  - name: strategy
    type: string
    required: false
    description: "Agent 策略 (adaptive/balanced/specialized/parallel)"

outputs:
  - name: swarm_results
    type: object
    description: "Swarm 执行结果"
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
  - name: claude-flow
    purpose: "Swarm 初始化、agent 生成、任务编排、状态监控"
    required: true
  - name: cli
    purpose: "CLI fallback 模式下的 swarm 操作"
    required: false

memory:
  required:
    - "swarm_state (当前 swarm 的拓扑和 agent 状态)"
    - "task_history (任务分配和执行历史)"
    - "knowledge_graph (跨会话的知识图谱)"
  ttl: "会话级别 — 跨会话持久化通过 memory_backup 实现"

workflow:
  steps:
    - "Swarm Initialization — 根据任务选择拓扑并初始化"
    - "Agent Spawning — 创建专业化 agent 并分配能力"
    - "Task Distribution — 并行或顺序分配任务"
    - "Execution Monitoring — 实时监控执行状态"
    - "Result Synthesis — 汇总并验证结果"
    - "Report Generation — 输出最终报告"

verification:
  - id: "gate-swarm-healthy"
    description: "确认 swarm 所有 agent 健康"
    type: invariant
    severity: critical
  - id: "gate-tasks-complete"
    description: "确认所有任务已执行完毕"
    type: invariant
    severity: critical
  - id: "gate-quality"
    description: "确认输出质量达标"
    type: invariant
    severity: major

failure_modes:
  - when: "Agent 通信失败"
    code: "AGENT_COMM_FAILURE"
    recoverable: true
    recovery: "启用 fault tolerance 自动恢复"
  - when: "任务执行超时"
    code: "TASK_TIMEOUT"
    recoverable: true
    recovery: "重试或重新分配任务"
  - when: "Swarm 初始化失败"
    code: "SWARM_INIT_FAILURE"
    recoverable: true
    recovery: "检查配置后重试"
  - when: "Memory 持久化失败"
    code: "MEMORY_PERSIST_FAILURE"
    recoverable: false
    recovery: "通知用户手动备份"

fallback:
  strategy: degrade
  plan: "MCP 工具不可用时使用 CLI 命令替代；agent 不可用时降级为单 agent 执行；memory 不可用时降级为无状态执行"

handoff:
  - to: "verification-gate"
    when: "Swarm 任务完成"
    payload: "输出数据和 gate 配置"
  - to: "failure-analysis"
    when: "不可恢复错误"
    payload: "错误上下文和 trace ID"

cost_tracking:
  estimatedTokens: 8000
  estimatedTimeMs: 60000
  recordFields:
    - field: "agentsSpawned"
      description: "创建的 agent 数"
    - field: "tasksExecuted"
      description: "执行的任务数"
    - field: "errorsEncountered"
      description: "遇到的错误数"
---

# Advanced Swarm Orchestration

## 1. Purpose

Master advanced swarm patterns for distributed research, development, and testing workflows. This skill covers comprehensive orchestration strategies using both MCP tools and CLI commands, enabling coordinated multi-agent execution for complex distributed tasks.

## 2. References

- [Claude Flow Documentation](https://github.com/ruvnet/claude-flow)
- [Swarm Orchestration Guide](https://github.com/ruvnet/claude-flow/wiki/swarm)
- [MCP Tools Reference](https://github.com/ruvnet/claude-flow/wiki/mcp)
- [Performance Optimization](https://github.com/ruvnet/claude-flow/wiki/performance)

## 3. Core Principles / Architecture

### Swarm Topologies

- **Mesh** — Peer-to-peer communication, best for research and analysis
- **Hierarchical** — Coordinator with subordinates, best for development
- **Star** — Central coordinator, best for testing
- **Ring** — Sequential processing chain for pipelines

### Agent Strategies

- **Adaptive** — Dynamic adjustment based on task complexity
- **Balanced** — Equal distribution of work across agents
- **Specialized** — Task-specific agent assignment
- **Parallel** — Maximum concurrent execution

## 4. Workflow

Standard swarm execution follows: Swarm Initialization → Agent Spawning → Task Distribution → Execution Monitoring → Result Synthesis → Report Generation. Four primary workflow patterns are defined: Research Swarm (mesh topology for parallel information gathering and analysis), Development Swarm (hierarchical topology for full-stack development), Testing Swarm (star topology for comprehensive QA), and Analysis Swarm (mesh topology for deep code and system analysis).

## 5. Data Boundaries

Swarm agents share context through structured memory stores. Each agent has access only to the namespaces assigned to it. Cross-agent data sharing is explicit via `memory_store`, `memory_search`, and `memory_retrieve` — never implicit. Agents must not share secrets, credentials, or PII through shared memory. Namespace organization (e.g., "research", "development/design", "testing/plans") enforces access boundaries.

## 6. Failure Modes

| code | 异常 | 可恢复 | 恢复路径 |
|------|------|--------|----------|
| `AGENT_COMM_FAILURE` | Agent 通信失败 | 是 | 启用 fault tolerance 自动恢复 |
| `TASK_TIMEOUT` | 任务执行超时 | 是 | 重试或重新分配任务 |
| `SWARM_INIT_FAILURE` | Swarm 初始化失败 | 是 | 检查配置后重试 |
| `MEMORY_PERSIST_FAILURE` | Memory 持久化失败 | 否 | 通知用户手动备份 |
| — | 并行执行失败 | 是 | 检查依赖关系、验证资源限制、实施错误处理 |
| — | 性能下降 | 是 | 优化拓扑、减少 agent 数量、分析瓶颈 |

## 7. Inputs

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task` | string | 是 | Swarm 执行的任务描述 |
| `topology` | string | 否 | 拓扑类型 (mesh/hierarchical/star/ring) |
| `maxAgents` | number | 否 | 最大 agent 数量 |
| `strategy` | string | 否 | Agent 策略 (adaptive/balanced/specialized/parallel) |

## 8. Outputs

| 输出 | 类型 | 说明 |
|------|------|------|
| `swarm_results` | object | Swarm 执行结果 |
| `metrics` | object | 性能指标（吞吐量、延迟、成功率） |
| `error` | object | 错误信息 |

## 9. When to Use

Use the swarm-advanced skill when you need coordinated multi-agent execution for research, development, testing, or analysis tasks that benefit from parallel processing and specialized agent roles. Ideal for complex distributed workflows beyond single-agent capability. Requires claude-flow installed and MCP server configured.

## 10. Verification

- [ ] Swarm topology initialized and all agents reachable (gate-swarm-healthy)
- [ ] All tasks executed with expected results (gate-tasks-complete)
- [ ] Output quality meets defined thresholds (gate-quality)
- [ ] Metrics collected and within acceptable range

## 11. Forbidden Behaviors

| 行为 | 后果 |
|------|------|
| 跳过 topology 初始化直接 spawn agent | 导致 agent 通信和协调失败 |
| 忽略 fault tolerance 配置 | 单个 agent 失败导致整个 swarm 任务失败 |
| 在共享内存中存储 secrets | 敏感信息泄露，跨 agent 扩散 |
| 不设置任务超时 | 可能导致任务无限等待，耗尽资源 |
| 并行执行不检查依赖关系 | 数据竞争和状态不一致 |

## 12. Output Template

```yaml
swarm_execution:
  topology: "mesh | hierarchical | star | ring"
  agents_spawned: N
  tasks_executed: N
  tasks_failed: N
  duration_ms: N
  status: "success | partial | failed"
  metrics:
    throughput: N
    latency_avg_ms: N
    success_rate: N
    agent_utilization: N
```

## 13. Example

### 场景：AI 研究项目

初始化 mesh 拓扑 swarm（6 agents），spawn 2 个 researcher + 2 个 analyst + 1 个 synthesizer + 1 个 documenter。并行信息收集 → 模式分析 → 综合 → 报告生成。agent 通过命名空间隔离研究领域，最终输出综合研究报告。

### 场景：全栈应用开发

初始化 hierarchical 拓扑 swarm（8 agents），spawn 架构师 + 前后端开发者 + 数据库工程师 + 测试 + 代码审查 + 技术写作 + DevOps。设计 → 并行实现 → 测试 → 审查 → 部署。

## 14. Fallback Strategy

| 场景 | 策略 | 行为 |
|------|------|------|
| MCP 工具不可用 | degrade | 使用 CLI 命令替代 |
| Agent 不可用 | degrade | 降级为单 agent 执行 |
| Memory 服务不可用 | degrade | 降级为无状态执行，记录警告 |
| 并行任务超时 | retry | 指数退避重试后重新分配 |
| 不可恢复错误 | abort | 保留已有结果，通知用户 |

## 15. Handoff Protocol

| 接收方 | 触发条件 | 传递内容 |
|--------|---------|---------|
| verification-gate | Swarm 任务完成 | 输出数据 + gate 配置 |
| failure-analysis | 不可恢复错误 | 错误上下文 + trace ID |

---

Master advanced swarm patterns for distributed research, development, and testing workflows. This skill covers comprehensive orchestration strategies using both MCP tools and CLI commands.

## Quick Start

### Prerequisites
```bash
# Ensure Claude Flow is installed
npm install -g claude-flow@alpha

# Add MCP server (if using MCP tools)
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

### Basic Pattern
```javascript
// 1. Initialize swarm topology
mcp__claude-flow__swarm_init({ topology: "mesh", maxAgents: 6 })

// 2. Spawn specialized agents
mcp__claude-flow__agent_spawn({ type: "researcher", name: "Agent 1" })

// 3. Orchestrate tasks
mcp__claude-flow__task_orchestrate({ task: "...", strategy: "parallel" })
```

## Core Concepts

### Swarm Topologies

**Mesh Topology** - Peer-to-peer communication, best for research and analysis
- All agents communicate directly
- High flexibility and resilience
- Use for: Research, analysis, brainstorming

**Hierarchical Topology** - Coordinator with subordinates, best for development
- Clear command structure
- Sequential workflow support
- Use for: Development, structured workflows

**Star Topology** - Central coordinator, best for testing
- Centralized control and monitoring
- Parallel execution with coordination
- Use for: Testing, validation, quality assurance

**Ring Topology** - Sequential processing chain
- Step-by-step processing
- Pipeline workflows
- Use for: Multi-stage processing, data pipelines

### Agent Strategies

**Adaptive** - Dynamic adjustment based on task complexity
**Balanced** - Equal distribution of work across agents
**Specialized** - Task-specific agent assignment
**Parallel** - Maximum concurrent execution

## Pattern 1: Research Swarm

### Purpose
Deep research through parallel information gathering, analysis, and synthesis.

### Architecture
```javascript
// Initialize research swarm
mcp__claude-flow__swarm_init({
  "topology": "mesh",
  "maxAgents": 6,
  "strategy": "adaptive"
})

// Spawn research team
const researchAgents = [
  {
    type: "researcher",
    name: "Web Researcher",
    capabilities: ["web-search", "content-extraction", "source-validation"]
  },
  {
    type: "researcher",
    name: "Academic Researcher",
    capabilities: ["paper-analysis", "citation-tracking", "literature-review"]
  },
  {
    type: "analyst",
    name: "Data Analyst",
    capabilities: ["data-processing", "statistical-analysis", "visualization"]
  },
  {
    type: "analyst",
    name: "Pattern Analyzer",
    capabilities: ["trend-detection", "correlation-analysis", "outlier-detection"]
  },
  {
    type: "documenter",
    name: "Report Writer",
    capabilities: ["synthesis", "technical-writing", "formatting"]
  }
]

// Spawn all agents
researchAgents.forEach(agent => {
  mcp__claude-flow__agent_spawn({
    type: agent.type,
    name: agent.name,
    capabilities: agent.capabilities
  })
})
```

### Research Workflow

#### Phase 1: Information Gathering
```javascript
// Parallel information collection
mcp__claude-flow__parallel_execute({
  "tasks": [
    {
      "id": "web-search",
      "command": "search recent publications and articles"
    },
    {
      "id": "academic-search",
      "command": "search academic databases and papers"
    },
    {
      "id": "data-collection",
      "command": "gather relevant datasets and statistics"
    },
    {
      "id": "expert-search",
      "command": "identify domain experts and thought leaders"
    }
  ]
})

// Store research findings in memory
mcp__claude-flow__memory_usage({
  "action": "store",
  "key": "research-findings-" + Date.now(),
  "value": JSON.stringify(findings),
  "namespace": "research",
  "ttl": 604800 // 7 days
})
```

#### Phase 2: Analysis and Validation
```javascript
// Pattern recognition in findings
mcp__claude-flow__pattern_recognize({
  "data": researchData,
  "patterns": ["trend", "correlation", "outlier", "emerging-pattern"]
})

// Cognitive analysis
mcp__claude-flow__cognitive_analyze({
  "behavior": "research-synthesis"
})

// Quality assessment
mcp__claude-flow__quality_assess({
  "target": "research-sources",
  "criteria": ["credibility", "relevance", "recency", "authority"]
})

// Cross-reference validation
mcp__claude-flow__neural_patterns({
  "action": "analyze",
  "operation": "fact-checking",
  "metadata": { "sources": sourcesArray }
})
```

#### Phase 3: Knowledge Management
```javascript
// Search existing knowledge base
mcp__claude-flow__memory_search({
  "pattern": "topic X",
  "namespace": "research",
  "limit": 20
})

// Create knowledge graph connections
mcp__claude-flow__neural_patterns({
  "action": "learn",
  "operation": "knowledge-graph",
  "metadata": {
    "topic": "X",
    "connections": relatedTopics,
    "depth": 3
  }
})

// Store connections for future use
mcp__claude-flow__memory_usage({
  "action": "store",
  "key": "knowledge-graph-X",
  "value": JSON.stringify(knowledgeGraph),
  "namespace": "research/graphs",
  "ttl": 2592000 // 30 days
})
```

#### Phase 4: Report Generation
```javascript
// Orchestrate report generation
mcp__claude-flow__task_orchestrate({
  "task": "generate comprehensive research report",
  "strategy": "sequential",
  "priority": "high",
  "dependencies": ["gather", "analyze", "validate", "synthesize"]
})

// Monitor research progress
mcp__claude-flow__swarm_status({
  "swarmId": "research-swarm"
})

// Generate final report
mcp__claude-flow__workflow_execute({
  "workflowId": "research-report-generation",
  "params": {
    "findings": findings,
    "format": "comprehensive",
    "sections": ["executive-summary", "methodology", "findings", "analysis", "conclusions", "references"]
  }
})
```

### CLI Fallback
```bash
# Quick research swarm
npx claude-flow swarm "research AI trends in 2025" \
  --strategy research \
  --mode distributed \
  --max-agents 6 \
  --parallel \
  --output research-report.md
```

## Pattern 2: Development Swarm

### Purpose
Full-stack development through coordinated specialist agents.

### Architecture
```javascript
// Initialize development swarm with hierarchy
mcp__claude-flow__swarm_init({
  "topology": "hierarchical",
  "maxAgents": 8,
  "strategy": "balanced"
})

// Spawn development team
const devTeam = [
  { type: "architect", name: "System Architect", role: "coordinator" },
  { type: "coder", name: "Backend Developer", capabilities: ["node", "api", "database"] },
  { type: "coder", name: "Frontend Developer", capabilities: ["react", "ui", "ux"] },
  { type: "coder", name: "Database Engineer", capabilities: ["sql", "nosql", "optimization"] },
  { type: "tester", name: "QA Engineer", capabilities: ["unit", "integration", "e2e"] },
  { type: "reviewer", name: "Code Reviewer", capabilities: ["security", "performance", "best-practices"] },
  { type: "documenter", name: "Technical Writer", capabilities: ["api-docs", "guides", "tutorials"] },
  { type: "monitor", name: "DevOps Engineer", capabilities: ["ci-cd", "deployment", "monitoring"] }
]

// Spawn all team members
devTeam.forEach(member => {
  mcp__claude-flow__agent_spawn({
    type: member.type,
    name: member.name,
    capabilities: member.capabilities,
    swarmId: "dev-swarm"
  })
})
```

### Development Workflow

#### Phase 1: Architecture and Design
```javascript
// System architecture design
mcp__claude-flow__task_orchestrate({
  "task": "design system architecture for REST API",
  "strategy": "sequential",
  "priority": "critical",
  "assignTo": "System Architect"
})

// Store architecture decisions
mcp__claude-flow__memory_usage({
  "action": "store",
  "key": "architecture-decisions",
  "value": JSON.stringify(architectureDoc),
  "namespace": "development/design"
})
```

#### Phase 2: Parallel Implementation
```javascript
// Parallel development tasks
mcp__claude-flow__parallel_execute({
  "tasks": [
    {
      "id": "backend-api",
      "command": "implement REST API endpoints",
      "assignTo": "Backend Developer"
    },
    {
      "id": "frontend-ui",
      "command": "build user interface components",
      "assignTo": "Frontend Developer"
    },
    {
      "id": "database-schema",
      "command": "design and implement database schema",
      "assignTo": "Database Engineer"
    },
    {
      "id": "api-documentation",
      "command": "create API documentation",
      "assignTo": "Technical Writer"
    }
  ]
})

// Monitor development progress
mcp__claude-flow__swarm_monitor({
  "swarmId": "dev-swarm",
  "interval": 5000
})
```

#### Phase 3: Testing and Validation
```javascript
// Comprehensive testing
mcp__claude-flow__batch_process({
  "items": [
    { type: "unit", target: "all-modules" },
    { type: "integration", target: "api-endpoints" },
    { type: "e2e", target: "user-flows" },
    { type: "performance", target: "critical-paths" }
  ],
  "operation": "execute-tests"
})

// Quality assessment
mcp__claude-flow__quality_assess({
  "target": "codebase",
  "criteria": ["coverage", "complexity", "maintainability", "security"]
})
```

#### Phase 4: Review and Deployment
```javascript
// Code review workflow
mcp__claude-flow__workflow_execute({
  "workflowId": "code-review-process",
  "params": {
    "reviewers": ["Code Reviewer"],
    "criteria": ["security", "performance", "best-practices"]
  }
})

// CI/CD pipeline
mcp__claude-flow__pipeline_create({
  "config": {
    "stages": ["build", "test", "security-scan", "deploy"],
    "environment": "production"
  }
})
```

### CLI Fallback
```bash
# Quick development swarm
npx claude-flow swarm "build REST API with authentication" \
  --strategy development \
  --mode hierarchical \
  --monitor \
  --output sqlite
```

## Pattern 3: Testing Swarm

### Purpose
Comprehensive quality assurance through distributed testing.

### Architecture
```javascript
// Initialize testing swarm with star topology
mcp__claude-flow__swarm_init({
  "topology": "star",
  "maxAgents": 7,
  "strategy": "parallel"
})

// Spawn testing team
const testingTeam = [
  {
    type: "tester",
    name: "Unit Test Coordinator",
    capabilities: ["unit-testing", "mocking", "coverage", "tdd"]
  },
  {
    type: "tester",
    name: "Integration Tester",
    capabilities: ["integration", "api-testing", "contract-testing"]
  },
  {
    type: "tester",
    name: "E2E Tester",
    capabilities: ["e2e", "ui-testing", "user-flows", "selenium"]
  },
  {
    type: "tester",
    name: "Performance Tester",
    capabilities: ["load-testing", "stress-testing", "benchmarking"]
  },
  {
    type: "monitor",
    name: "Security Tester",
    capabilities: ["security-testing", "penetration-testing", "vulnerability-scanning"]
  },
  {
    type: "analyst",
    name: "Test Analyst",
    capabilities: ["coverage-analysis", "test-optimization", "reporting"]
  },
  {
    type: "documenter",
    name: "Test Documenter",
    capabilities: ["test-documentation", "test-plans", "reports"]
  }
]

// Spawn all testers
testingTeam.forEach(tester => {
  mcp__claude-flow__agent_spawn({
    type: tester.type,
    name: tester.name,
    capabilities: tester.capabilities,
    swarmId: "testing-swarm"
  })
})
```

### Testing Workflow

#### Phase 1: Test Planning
```javascript
// Analyze test coverage requirements
mcp__claude-flow__quality_assess({
  "target": "test-coverage",
  "criteria": [
    "line-coverage",
    "branch-coverage",
    "function-coverage",
    "edge-cases"
  ]
})

// Identify test scenarios
mcp__claude-flow__pattern_recognize({
  "data": testScenarios,
  "patterns": [
    "edge-case",
    "boundary-condition",
    "error-path",
    "happy-path"
  ]
})

// Store test plan
mcp__claude-flow__memory_usage({
  "action": "store",
  "key": "test-plan-" + Date.now(),
  "value": JSON.stringify(testPlan),
  "namespace": "testing/plans"
})
```

#### Phase 2: Parallel Test Execution
```javascript
// Execute all test suites in parallel
mcp__claude-flow__parallel_execute({
  "tasks": [
    {
      "id": "unit-tests",
      "command": "npm run test:unit",
      "assignTo": "Unit Test Coordinator"
    },
    {
      "id": "integration-tests",
      "command": "npm run test:integration",
      "assignTo": "Integration Tester"
    },
    {
      "id": "e2e-tests",
      "command": "npm run test:e2e",
      "assignTo": "E2E Tester"
    },
    {
      "id": "performance-tests",
      "command": "npm run test:performance",
      "assignTo": "Performance Tester"
    },
    {
      "id": "security-tests",
      "command": "npm run test:security",
      "assignTo": "Security Tester"
    }
  ]
})

// Batch process test suites
mcp__claude-flow__batch_process({
  "items": testSuites,
  "operation": "execute-test-suite"
})
```

#### Phase 3: Performance and Security
```javascript
// Run performance benchmarks
mcp__claude-flow__benchmark_run({
  "suite": "comprehensive-performance"
})

// Bottleneck analysis
mcp__claude-flow__bottleneck_analyze({
  "component": "application",
  "metrics": ["response-time", "throughput", "memory", "cpu"]
})

// Security scanning
mcp__claude-flow__security_scan({
  "target": "application",
  "depth": "comprehensive"
})

// Vulnerability analysis
mcp__claude-flow__error_analysis({
  "logs": securityScanLogs
})
```

#### Phase 4: Monitoring and Reporting
```javascript
// Real-time test monitoring
mcp__claude-flow__swarm_monitor({
  "swarmId": "testing-swarm",
  "interval": 2000
})

// Generate comprehensive test report
mcp__claude-flow__performance_report({
  "format": "detailed",
  "timeframe": "current-run"
})

// Get test results
mcp__claude-flow__task_results({
  "taskId": "test-execution-001"
})

// Trend analysis
mcp__claude-flow__trend_analysis({
  "metric": "test-coverage",
  "period": "30d"
})
```

### CLI Fallback
```bash
# Quick testing swarm
npx claude-flow swarm "test application comprehensively" \
  --strategy testing \
  --mode star \
  --parallel \
  --timeout 600
```

## Pattern 4: Analysis Swarm

### Purpose
Deep code and system analysis through specialized analyzers.

### Architecture
```javascript
// Initialize analysis swarm
mcp__claude-flow__swarm_init({
  "topology": "mesh",
  "maxAgents": 5,
  "strategy": "adaptive"
})

// Spawn analysis specialists
const analysisTeam = [
  {
    type: "analyst",
    name: "Code Analyzer",
    capabilities: ["static-analysis", "complexity-analysis", "dead-code-detection"]
  },
  {
    type: "analyst",
    name: "Security Analyzer",
    capabilities: ["security-scan", "vulnerability-detection", "dependency-audit"]
  },
  {
    type: "analyst",
    name: "Performance Analyzer",
    capabilities: ["profiling", "bottleneck-detection", "optimization"]
  },
  {
    type: "analyst",
    name: "Architecture Analyzer",
    capabilities: ["dependency-analysis", "coupling-detection", "modularity-assessment"]
  },
  {
    type: "documenter",
    name: "Analysis Reporter",
    capabilities: ["reporting", "visualization", "recommendations"]
  }
]

// Spawn all analysts
analysisTeam.forEach(analyst => {
  mcp__claude-flow__agent_spawn({
    type: analyst.type,
    name: analyst.name,
    capabilities: analyst.capabilities
  })
})
```

### Analysis Workflow
```javascript
// Parallel analysis execution
mcp__claude-flow__parallel_execute({
  "tasks": [
    { "id": "analyze-code", "command": "analyze codebase structure and quality" },
    { "id": "analyze-security", "command": "scan for security vulnerabilities" },
    { "id": "analyze-performance", "command": "identify performance bottlenecks" },
    { "id": "analyze-architecture", "command": "assess architectural patterns" }
  ]
})

// Generate comprehensive analysis report
mcp__claude-flow__performance_report({
  "format": "detailed",
  "timeframe": "current"
})

// Cost analysis
mcp__claude-flow__cost_analysis({
  "timeframe": "30d"
})
```

## Advanced Techniques

### Error Handling and Fault Tolerance

```javascript
// Setup fault tolerance for all agents
mcp__claude-flow__daa_fault_tolerance({
  "agentId": "all",
  "strategy": "auto-recovery"
})

// Error handling pattern
try {
  await mcp__claude-flow__task_orchestrate({
    "task": "complex operation",
    "strategy": "parallel",
    "priority": "high"
  })
} catch (error) {
  // Check swarm health
  const status = await mcp__claude-flow__swarm_status({})

  // Analyze error patterns
  await mcp__claude-flow__error_analysis({
    "logs": [error.message]
  })

  // Auto-recovery attempt
  if (status.healthy) {
    await mcp__claude-flow__task_orchestrate({
      "task": "retry failed operation",
      "strategy": "sequential"
    })
  }
}
```

### Memory and State Management

```javascript
// Cross-session persistence
mcp__claude-flow__memory_persist({
  "sessionId": "swarm-session-001"
})

// Namespace management for different swarms
mcp__claude-flow__memory_namespace({
  "namespace": "research-swarm",
  "action": "create"
})

// Create state snapshot
mcp__claude-flow__state_snapshot({
  "name": "development-checkpoint-1"
})

// Restore from snapshot if needed
mcp__claude-flow__context_restore({
  "snapshotId": "development-checkpoint-1"
})

// Backup memory stores
mcp__claude-flow__memory_backup({
  "path": "/workspaces/claude-code-flow/backups/swarm-memory.json"
})
```

### Neural Pattern Learning

```javascript
// Train neural patterns from successful workflows
mcp__claude-flow__neural_train({
  "pattern_type": "coordination",
  "training_data": JSON.stringify(successfulWorkflows),
  "epochs": 50
})

// Adaptive learning from experience
mcp__claude-flow__learning_adapt({
  "experience": {
    "workflow": "research-to-report",
    "success": true,
    "duration": 3600,
    "quality": 0.95
  }
})

// Pattern recognition for optimization
mcp__claude-flow__pattern_recognize({
  "data": workflowMetrics,
  "patterns": ["bottleneck", "optimization-opportunity", "efficiency-gain"]
})
```

### Workflow Automation

```javascript
// Create reusable workflow
mcp__claude-flow__workflow_create({
  "name": "full-stack-development",
  "steps": [
    { "phase": "design", "agents": ["architect"] },
    { "phase": "implement", "agents": ["backend-dev", "frontend-dev"], "parallel": true },
    { "phase": "test", "agents": ["tester", "security-tester"], "parallel": true },
    { "phase": "review", "agents": ["reviewer"] },
    { "phase": "deploy", "agents": ["devops"] }
  ],
  "triggers": ["on-commit", "scheduled-daily"]
})

// Setup automation rules
mcp__claude-flow__automation_setup({
  "rules": [
    {
      "trigger": "file-changed",
      "pattern": "*.js",
      "action": "run-tests"
    },
    {
      "trigger": "PR-created",
      "action": "code-review-swarm"
    }
  ]
})

// Event-driven triggers
mcp__claude-flow__trigger_setup({
  "events": ["code-commit", "PR-merge", "deployment"],
  "actions": ["test", "analyze", "document"]
})
```

### Performance Optimization

```javascript
// Topology optimization
mcp__claude-flow__topology_optimize({
  "swarmId": "current-swarm"
})

// Load balancing
mcp__claude-flow__load_balance({
  "swarmId": "development-swarm",
  "tasks": taskQueue
})

// Agent coordination sync
mcp__claude-flow__coordination_sync({
  "swarmId": "development-swarm"
})

// Auto-scaling
mcp__claude-flow__swarm_scale({
  "swarmId": "development-swarm",
  "targetSize": 12
})
```

### Monitoring and Metrics

```javascript
// Real-time swarm monitoring
mcp__claude-flow__swarm_monitor({
  "swarmId": "active-swarm",
  "interval": 3000
})

// Collect comprehensive metrics
mcp__claude-flow__metrics_collect({
  "components": ["agents", "tasks", "memory", "performance"]
})

// Health monitoring
mcp__claude-flow__health_check({
  "components": ["swarm", "agents", "neural", "memory"]
})

// Usage statistics
mcp__claude-flow__usage_stats({
  "component": "swarm-orchestration"
})

// Trend analysis
mcp__claude-flow__trend_analysis({
  "metric": "agent-performance",
  "period": "7d"
})
```

## Best Practices

### 1. Choosing the Right Topology

- **Mesh**: Research, brainstorming, collaborative analysis
- **Hierarchical**: Structured development, sequential workflows
- **Star**: Testing, validation, centralized coordination
- **Ring**: Pipeline processing, staged workflows

### 2. Agent Specialization

- Assign specific capabilities to each agent
- Avoid overlapping responsibilities
- Use coordination agents for complex workflows
- Leverage memory for agent communication

### 3. Parallel Execution

- Identify independent tasks for parallelization
- Use sequential execution for dependent tasks
- Monitor resource usage during parallel execution
- Implement proper error handling

### 4. Memory Management

- Use namespaces to organize memory
- Set appropriate TTL values
- Create regular backups
- Implement state snapshots for checkpoints

### 5. Monitoring and Optimization

- Monitor swarm health regularly
- Collect and analyze metrics
- Optimize topology based on performance
- Use neural patterns to learn from success

### 6. Error Recovery

- Implement fault tolerance strategies
- Use auto-recovery mechanisms
- Analyze error patterns
- Create fallback workflows

## Real-World Examples

### Example 1: AI Research Project
```javascript
// Research AI trends, analyze findings, generate report
mcp__claude-flow__swarm_init({ topology: "mesh", maxAgents: 6 })
// Spawn: 2 researchers, 2 analysts, 1 synthesizer, 1 documenter
// Parallel gather → Analyze patterns → Synthesize → Report
```

### Example 2: Full-Stack Application
```javascript
// Build complete web application with testing
mcp__claude-flow__swarm_init({ topology: "hierarchical", maxAgents: 8 })
// Spawn: 1 architect, 2 devs, 1 db engineer, 2 testers, 1 reviewer, 1 devops
// Design → Parallel implement → Test → Review → Deploy
```

### Example 3: Security Audit
```javascript
// Comprehensive security analysis
mcp__claude-flow__swarm_init({ topology: "star", maxAgents: 5 })
// Spawn: 1 coordinator, 1 code analyzer, 1 security scanner, 1 penetration tester, 1 reporter
// Parallel scan → Vulnerability analysis → Penetration test → Report
```

### Example 4: Performance Optimization
```javascript
// Identify and fix performance bottlenecks
mcp__claude-flow__swarm_init({ topology: "mesh", maxAgents: 4 })
// Spawn: 1 profiler, 1 bottleneck analyzer, 1 optimizer, 1 tester
// Profile → Identify bottlenecks → Optimize → Validate
```

## Troubleshooting

### Common Issues

**Issue**: Swarm agents not coordinating properly
**Solution**: Check topology selection, verify memory usage, enable monitoring

**Issue**: Parallel execution failing
**Solution**: Verify task dependencies, check resource limits, implement error handling

**Issue**: Memory persistence not working
**Solution**: Verify namespaces, check TTL settings, ensure backup configuration

**Issue**: Performance degradation
**Solution**: Optimize topology, reduce agent count, analyze bottlenecks

## Related Skills

- `sparc-methodology` - Systematic development workflow
- `github-integration` - Repository management and automation
- `neural-patterns` - AI-powered coordination optimization
- `memory-management` - Cross-session state persistence

## References

- [Claude Flow Documentation](https://github.com/ruvnet/claude-flow)
- [Swarm Orchestration Guide](https://github.com/ruvnet/claude-flow/wiki/swarm)
- [MCP Tools Reference](https://github.com/ruvnet/claude-flow/wiki/mcp)
- [Performance Optimization](https://github.com/ruvnet/claude-flow/wiki/performance)

---

**Version**: 2.0.0
**Last Updated**: 2025-10-19
**Skill Level**: Advanced
**Estimated Learning Time**: 2-3 hours
