---
name: sparc-methodology
description: "SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) comprehensive development methodology with multi-agent orchestration"
category: development
version: "2.7.0"
owner: platform-team

inputs:
  - name: mode
    type: string
    required: true
    description: "SPARC mode to execute (orchestrator, coder, architect, tdd, researcher, reviewer, etc.)"
  - name: task_description
    type: string
    required: true
    description: "Description of the task to perform"
  - name: options
    type: object
    required: false
    description: "Mode-specific options (parallel, coverage_target, test_framework, memory_enabled, etc.)"

outputs:
  - name: result
    type: object
    description: "Mode execution result"
    alwaysPresent: true
  - name: swarm_state
    type: object
    description: "Swarm coordination state if using multi-agent orchestration"
    alwaysPresent: false
  - name: artifacts
    type: object
    description: "Generated artifacts (code, tests, docs, architecture decisions)"
    alwaysPresent: false

tools:
  - name: execute
    purpose: "Run SPARC mode operations, batch file ops, and CLI commands"
    required: true
  - name: read
    purpose: "Read codebase files, configuration, and documentation"
    required: true
  - name: write
    purpose: "Create and modify code, tests, and documentation files"
    required: false

memory:
  required:
    - "architecture_decisions (Cross-agent architectural decisions via Memory)"
    - "research_findings (Research results with citations and knowledge graphs)"
    - "session_state (Cross-session context restoration)"
  ttl: "可配置 — 默认24小时，可选择持久化存储"

workflow:
  steps:
    - "Specification — 定义需求、约束和成功标准"
    - "Architecture — 设计系统结构和组件接口"
    - "Refinement (TDD) — 测试优先的实现迭代"
    - "Review — 代码质量、安全、性能检查"
    - "Completion — 集成、部署和监控"
  states:
    - "INIT → SPECIFICATION → ARCHITECTURE → REFINEMENT → REVIEW → COMPLETION"
    - "→ FAILURE → RECOVERY"

verification:
  - id: "gate-test-coverage"
    description: "确认测试覆盖率>=90%"
    type: invariant
    severity: critical
  - id: "gate-code-review"
    description: "代码审查通过（安全+性能+最佳实践）"
    type: existence
    severity: critical
  - id: "gate-memory-sync"
    description: "跨agent内存同步完成"
    type: existence
    severity: major

failure_modes:
  - when: "测试覆盖不足（<90%）"
    code: "LOW_COVERAGE"
    recoverable: true
    recovery: "补充测试用例至90%+覆盖率"
  - when: "安全漏洞检测到"
    code: "SECURITY_FLAW"
    recoverable: true
    recovery: "修复漏洞并重新执行安全审查"
  - when: "性能瓶颈"
    code: "PERFORMANCE_ISSUE"
    recoverable: true
    recovery: "优化算法或数据库查询"
  - when: "MCP工具调用失败"
    code: "MCP_CALL_FAILED"
    recoverable: true
    recovery: "切换至NPX CLI fallback"

fallback:
  strategy: degrade
  plan: "MCP工具不可用时使用NPX CLI作为fallback；swarm multi-agent不可用时使用单agent顺序执行；Memory不可用时使用文件级状态存储"

handoff:
  - to: "verification-gate"
    when: "开发阶段完成"
    payload: "输出数据和gate配置"
  - to: "failure-analysis"
    when: "不可恢复错误"
    payload: "错误上下文和trace ID"

cost_tracking:
  estimatedTokens: 5000
  estimatedTimeMs: 60000
  recordFields:
    - field: "modesExecuted"
      description: "执行的模式数"
    - field: "stepsCompleted"
      description: "完成的开发步骤数"
    - field: "artifactsGenerated"
      description: "生成的工件数"
    - field: "coverageAchieved"
      description: "达到的测试覆盖率"
---

# SPARC Methodology - Comprehensive Development Framework

## 1. Purpose

### Overview

SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) is a systematic development methodology integrated with Claude Flow's multi-agent orchestration capabilities. It provides 17 specialized modes for comprehensive software development, from initial research through deployment and monitoring.

### Core Philosophy

SPARC methodology emphasizes:

- **Systematic Approach**: Structured phases from specification to completion
- **Test-Driven Development**: Tests written before implementation
- **Parallel Execution**: Concurrent agent coordination for 2.8-4.4x speed improvements
- **Memory Integration**: Persistent knowledge sharing across agents and sessions
- **Quality First**: Comprehensive reviews, testing, and validation
- **Modular Design**: Clean separation of concerns with clear interfaces

## 2. References

### Support and Resources

- **Documentation**: https://github.com/ruvnet/claude-flow
- **Issues**: https://github.com/ruvnet/claude-flow/issues
- **NPM Package**: https://www.npmjs.com/package/claude-flow
- **Community**: Discord server (link in repository)

## 3. Core Principles

### Key Principles

1. **Specification Before Code**: Define requirements and constraints clearly
2. **Design Before Implementation**: Plan architecture and components
3. **Tests Before Features**: Write failing tests, then make them pass
4. **Review Everything**: Code quality, security, and performance checks
5. **Document Continuously**: Maintain current documentation throughout

### Best Practices

#### 1. Memory Integration

**Always use Memory for cross-agent coordination**:

```javascript
// Store architectural decisions
mcp__claude-flow__memory_usage {
  action: "store",
  namespace: "architecture",
  key: "api-design-v1",
  value: JSON.stringify(apiDesign),
  ttl: 86400000  // 24 hours
}

// Retrieve in subsequent agents
mcp__claude-flow__memory_usage {
  action: "retrieve",
  namespace: "architecture",
  key: "api-design-v1"
}
```

#### 2. Parallel Operations

**Batch all related operations in single message**:

```javascript
// ✅ CORRECT: All operations together
[Single Message]:
  mcp__claude-flow__agent_spawn { type: "researcher" }
  mcp__claude-flow__agent_spawn { type: "coder" }
  mcp__claude-flow__agent_spawn { type: "tester" }
  TodoWrite { todos: [8-10 todos] }

// ❌ WRONG: Multiple messages
Message 1: mcp__claude-flow__agent_spawn { type: "researcher" }
Message 2: mcp__claude-flow__agent_spawn { type: "coder" }
Message 3: TodoWrite { todos: [...] }
```

#### 3. Hook Integration

**Every SPARC mode should use hooks**:

```bash
# Before work
npx claude-flow@alpha hooks pre-task --description "implement auth"

# During work
npx claude-flow@alpha hooks post-edit --file "auth.js"

# After work
npx claude-flow@alpha hooks post-task --task-id "task-123"
```

#### 4. Test Coverage

**Maintain minimum 90% coverage**:

- Unit tests for all functions
- Integration tests for APIs
- E2E tests for critical flows
- Edge case coverage
- Error path testing

#### 5. Documentation

**Document as you build**:

- API documentation (OpenAPI)
- Architecture decision records (ADR)
- Code comments for complex logic
- README with setup instructions
- Changelog for version tracking

#### 6. File Organization

**Never save to root folder**:

```
project/
├── src/           # Source code
├── tests/         # Test files
├── docs/          # Documentation
├── config/        # Configuration
├── scripts/       # Utility scripts
└── examples/      # Example code
```

## 4. Workflow

### Development Phases

#### Phase 1: Specification
**Goal**: Define requirements, constraints, and success criteria

- Requirements analysis
- User story mapping
- Constraint identification
- Success metrics definition
- Pseudocode planning

**Key Modes**: `researcher`, `analyzer`, `memory-manager`

#### Phase 2: Architecture
**Goal**: Design system structure and component interfaces

- System architecture design
- Component interface definition
- Database schema planning
- API contract specification
- Infrastructure planning

**Key Modes**: `architect`, `designer`, `orchestrator`

#### Phase 3: Refinement (TDD Implementation)
**Goal**: Implement features with test-first approach

- Write failing tests
- Implement minimum viable code
- Make tests pass
- Refactor for quality
- Iterate until complete

**Key Modes**: `tdd`, `coder`, `tester`

#### Phase 4: Review
**Goal**: Ensure code quality, security, and performance

- Code quality assessment
- Security vulnerability scanning
- Performance profiling
- Best practices validation
- Documentation review

**Key Modes**: `reviewer`, `optimizer`, `debugger`

#### Phase 5: Completion
**Goal**: Integration, deployment, and monitoring

- System integration
- Deployment automation
- Monitoring setup
- Documentation finalization
- Knowledge capture

**Key Modes**: `workflow-manager`, `documenter`, `memory-manager`

### Available Modes (Complete Reference)

#### Core Orchestration Modes

##### `orchestrator`
Multi-agent task orchestration with TodoWrite/Task/Memory coordination.

**Capabilities**:
- Task decomposition into manageable units
- Agent coordination and resource allocation
- Progress tracking and result synthesis
- Adaptive strategy selection
- Cross-agent communication

**Usage**:
```javascript
mcp__claude-flow__sparc_mode {
  mode: "orchestrator",
  task_description: "coordinate feature development",
  options: { parallel: true, monitor: true }
}
```

##### `swarm-coordinator`
Specialized swarm management for complex multi-agent workflows.

**Capabilities**:
- Topology optimization (mesh, hierarchical, ring, star)
- Agent lifecycle management
- Dynamic scaling based on workload
- Fault tolerance and recovery
- Performance monitoring

##### `workflow-manager`
Process automation and workflow orchestration.

**Capabilities**:
- Workflow definition and execution
- Event-driven triggers
- Sequential and parallel pipelines
- State management
- Error handling and retry logic

##### `batch-executor`
Parallel task execution for high-throughput operations.

**Capabilities**:
- Concurrent file operations
- Batch processing optimization
- Resource pooling
- Load balancing
- Progress aggregation

#### Development Modes

##### `coder`
Autonomous code generation with batch file operations.

**Capabilities**:
- Feature implementation
- Code refactoring
- Bug fixes and patches
- API development
- Algorithm implementation

**Quality Standards**:
- ES2022+ standards
- TypeScript type safety
- Comprehensive error handling
- Performance optimization
- Security best practices

**Usage**:
```javascript
mcp__claude-flow__sparc_mode {
  mode: "coder",
  task_description: "implement user authentication with JWT",
  options: {
    test_driven: true,
    parallel_edits: true,
    typescript: true
  }
}
```

##### `architect`
System design with Memory-based coordination.

**Capabilities**:
- Microservices architecture
- Event-driven design
- Domain-driven design (DDD)
- Hexagonal architecture
- CQRS and Event Sourcing

**Memory Integration**:
- Store architectural decisions
- Share component specifications
- Maintain design consistency
- Track architectural evolution

**Design Patterns**:
- Layered architecture
- Microservices patterns
- Event-driven patterns
- Domain modeling
- Infrastructure as Code

**Usage**:
```javascript
mcp__claude-flow__sparc_mode {
  mode: "architect",
  task_description: "design scalable e-commerce platform",
  options: {
    detailed: true,
    memory_enabled: true,
    patterns: ["microservices", "event-driven"]
  }
}
```

##### `tdd`
Test-driven development with comprehensive testing.

**Capabilities**:
- Test-first development
- Red-green-refactor cycle
- Test suite design
- Coverage optimization (target: 90%+)
- Continuous testing

**TDD Workflow**:
1. Write failing test (RED)
2. Implement minimum code
3. Make test pass (GREEN)
4. Refactor for quality (REFACTOR)
5. Repeat cycle

**Testing Strategies**:
- Unit testing (Jest, Mocha, Vitest)
- Integration testing
- End-to-end testing (Playwright, Cypress)
- Performance testing
- Security testing

**Usage**:
```javascript
mcp__claude-flow__sparc_mode {
  mode: "tdd",
  task_description: "shopping cart feature with payment integration",
  options: {
    coverage_target: 90,
    test_framework: "jest",
    e2e_framework: "playwright"
  }
}
```

##### `reviewer`
Code review using batch file analysis.

**Capabilities**:
- Code quality assessment
- Security vulnerability detection
- Performance analysis
- Best practices validation
- Documentation review

**Review Criteria**:
- Code correctness and logic
- Design pattern adherence
- Comprehensive error handling
- Test coverage adequacy
- Maintainability and readability
- Security vulnerabilities
- Performance bottlenecks

**Batch Analysis**:
- Parallel file review
- Pattern detection
- Dependency checking
- Consistency validation
- Automated reporting

**Usage**:
```javascript
mcp__claude-flow__sparc_mode {
  mode: "reviewer",
  task_description: "review authentication module PR #123",
  options: {
    security_check: true,
    performance_check: true,
    test_coverage_check: true
  }
}
```

#### Analysis and Research Modes

##### `researcher`
Deep research with parallel WebSearch/WebFetch and Memory coordination.

**Capabilities**:
- Comprehensive information gathering
- Source credibility evaluation
- Trend analysis and forecasting
- Competitive research
- Technology assessment

**Research Methods**:
- Parallel web searches
- Academic paper analysis
- Industry report synthesis
- Expert opinion gathering
- Statistical data compilation

**Memory Integration**:
- Store research findings with citations
- Build knowledge graphs
- Track information sources
- Cross-reference insights
- Maintain research history

**Usage**:
```javascript
mcp__claude-flow__sparc_mode {
  mode: "researcher",
  task_description: "research microservices best practices 2024",
  options: {
    depth: "comprehensive",
    sources: ["academic", "industry"],
    citations: true
  }
}
```

##### `analyzer`
Code and data analysis with pattern recognition.

**Capabilities**:
- Static code analysis
- Dependency analysis
- Performance profiling
- Security scanning
- Data pattern recognition

##### `optimizer`
Performance optimization and bottleneck resolution.

**Capabilities**:
- Algorithm optimization
- Database query tuning
- Caching strategy design
- Bundle size reduction
- Memory leak detection

#### Creative and Support Modes

##### `designer`
UI/UX design with accessibility focus.

**Capabilities**:
- Interface design
- User experience optimization
- Accessibility compliance (WCAG 2.1)
- Design system creation
- Responsive layout design

##### `innovator`
Creative problem-solving and novel solutions.

**Capabilities**:
- Brainstorming and ideation
- Alternative approach generation
- Technology evaluation
- Proof of concept development
- Innovation feasibility analysis

##### `documenter`
Comprehensive documentation generation.

**Capabilities**:
- API documentation (OpenAPI/Swagger)
- Architecture diagrams
- User guides and tutorials
- Code comments and JSDoc
- README and changelog maintenance

##### `debugger`
Systematic debugging and issue resolution.

**Capabilities**:
- Bug reproduction
- Root cause analysis
- Fix implementation
- Regression prevention
- Debug logging optimization

##### `tester`
Comprehensive testing beyond TDD.

**Capabilities**:
- Test suite expansion
- Edge case identification
- Performance testing
- Load testing
- Chaos engineering

##### `memory-manager`
Knowledge management and context preservation.

**Capabilities**:
- Cross-session memory persistence
- Knowledge graph construction
- Context restoration
- Learning pattern extraction
- Decision tracking

### Orchestration Patterns

#### Pattern 1: Hierarchical Coordination

**Best for**: Complex projects with clear delegation hierarchy

```javascript
// Initialize hierarchical swarm
mcp__claude-flow__swarm_init {
  topology: "hierarchical",
  maxAgents: 12
}

// Spawn coordinator
mcp__claude-flow__agent_spawn {
  type: "coordinator",
  capabilities: ["planning", "delegation", "monitoring"]
}

// Spawn specialized workers
mcp__claude-flow__agent_spawn { type: "architect" }
mcp__claude-flow__agent_spawn { type: "coder" }
mcp__claude-flow__agent_spawn { type: "tester" }
mcp__claude-flow__agent_spawn { type: "reviewer" }
```

#### Pattern 2: Mesh Coordination

**Best for**: Collaborative tasks requiring peer-to-peer communication

```javascript
mcp__claude-flow__swarm_init {
  topology: "mesh",
  strategy: "balanced",
  maxAgents: 6
}
```

#### Pattern 3: Sequential Pipeline

**Best for**: Ordered workflow execution (spec → design → code → test → review)

```javascript
mcp__claude-flow__workflow_create {
  name: "development-pipeline",
  steps: [
    { mode: "researcher", task: "gather requirements" },
    { mode: "architect", task: "design system" },
    { mode: "coder", task: "implement features" },
    { mode: "tdd", task: "create tests" },
    { mode: "reviewer", task: "review code" }
  ],
  triggers: ["on_step_complete"]
}
```

#### Pattern 4: Parallel Execution

**Best for**: Independent tasks that can run concurrently

```javascript
mcp__claude-flow__task_orchestrate {
  task: "build full-stack application",
  strategy: "parallel",
  dependencies: {
    backend: [],
    frontend: [],
    database: [],
    tests: ["backend", "frontend"]
  }
}
```

#### Pattern 5: Adaptive Strategy

**Best for**: Dynamic workloads with changing requirements

```javascript
mcp__claude-flow__swarm_init {
  topology: "hierarchical",
  strategy: "adaptive",  // Auto-adjusts based on workload
  maxAgents: 20
}
```

### Common Workflows

#### Workflow 1: Feature Development

```bash
# Step 1: Research and planning
npx claude-flow sparc run researcher "authentication patterns"

# Step 2: Architecture design
npx claude-flow sparc run architect "design auth system"

# Step 3: TDD implementation
npx claude-flow sparc tdd "user authentication feature"

# Step 4: Code review
npx claude-flow sparc run reviewer "review auth implementation"

# Step 5: Documentation
npx claude-flow sparc run documenter "document auth API"
```

#### Workflow 2: Bug Investigation

```bash
# Step 1: Analyze issue
npx claude-flow sparc run analyzer "investigate bug #456"

# Step 2: Debug systematically
npx claude-flow sparc run debugger "fix memory leak in service X"

# Step 3: Create tests
npx claude-flow sparc run tester "regression tests for bug #456"

# Step 4: Review fix
npx claude-flow sparc run reviewer "validate bug fix"
```

#### Workflow 3: Performance Optimization

```bash
# Step 1: Profile performance
npx claude-flow sparc run analyzer "profile API response times"

# Step 2: Identify bottlenecks
npx claude-flow sparc run optimizer "optimize database queries"

# Step 3: Implement improvements
npx claude-flow sparc run coder "implement caching layer"

# Step 4: Benchmark results
npx claude-flow sparc run tester "performance benchmarks"
```

#### Workflow 4: Complete Pipeline

```bash
# Execute full development pipeline
npx claude-flow sparc pipeline "e-commerce checkout feature"

# This automatically runs:
# 1. researcher - Gather requirements
# 2. architect - Design system
# 3. coder - Implement features
# 4. tdd - Create comprehensive tests
# 5. reviewer - Code quality review
# 6. optimizer - Performance tuning
# 7. documenter - Documentation
```

## 5. Data Boundaries

SPARC operates within a project's codebase and documentation. Each mode has specific data access boundaries:

- **Source Code**: Read/write access during development modes
- **Documentation**: Read/write during documentation modes
- **Architecture Decisions**: Stored in Memory for cross-agent access
- **Test Files**: Managed by tdd/tester modes
- **Configuration**: Project-level config files

**Data Flow**: Results from each phase flow into the next via Memory. Research findings → Architecture decisions → Implementation → Review artifacts.

## 6. Failure Modes

| Code | 异常 | 可恢复 | 恢复路径 |
|------|------|--------|----------|
| `LOW_COVERAGE` | 测试覆盖不足 (<90%) | 是 | 补充测试用例至90%+覆盖率 |
| `SECURITY_FLAW` | 安全漏洞 | 是 | 修复漏洞后重新执行安全审查 |
| `PERFORMANCE_ISSUE` | 性能瓶颈 | 是 | 优化算法或数据库查询 |
| `MCP_CALL_FAILED` | MCP工具调用失败 | 是 | 切换至NPX CLI fallback |
| -- | Memory同步失败 | 是 | 使用文件级状态存储代替 |
| -- | Agent通信超时 | 是 | 重试或降级为顺序执行 |
| -- | 不可恢复架构冲突 | 否 | 记录ADR，回退至上一决策点 |

## 7. Inputs

### Activation Methods

#### Method 1: MCP Tools (Preferred in Claude Code)

**Best for**: Integrated Claude Code workflows with full orchestration capabilities

```javascript
// Basic mode execution
mcp__claude-flow__sparc_mode {
  mode: "<mode-name>",
  task_description: "<task description>",
  options: {
    // mode-specific options
  }
}

// Initialize swarm for complex tasks
mcp__claude-flow__swarm_init {
  topology: "hierarchical",  // or "mesh", "ring", "star"
  strategy: "auto",           // or "balanced", "specialized", "adaptive"
  maxAgents: 8
}

// Spawn specialized agents
mcp__claude-flow__agent_spawn {
  type: "<agent-type>",
  capabilities: ["<capability1>", "<capability2>"]
}

// Monitor execution
mcp__claude-flow__swarm_monitor {
  swarmId: "current",
  interval: 5000
}
```

#### Method 2: NPX CLI (Fallback)

**Best for**: Terminal usage or when MCP tools unavailable

```bash
# Execute specific mode
npx claude-flow sparc run <mode> "task description"

# Use alpha features
npx claude-flow@alpha sparc run <mode> "task description"

# List all available modes
npx claude-flow sparc modes

# Get help for specific mode
npx claude-flow sparc help <mode>

# Run with options
npx claude-flow sparc run <mode> "task" --parallel --monitor

# Execute TDD workflow
npx claude-flow sparc tdd "feature description"

# Batch execution
npx claude-flow sparc batch <mode1,mode2,mode3> "task"

# Pipeline execution
npx claude-flow sparc pipeline "task description"
```

#### Method 3: Local Installation

**Best for**: Projects with local claude-flow installation

```bash
# If claude-flow is installed locally
./claude-flow sparc run <mode> "task description"
```

### Input Parameters

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mode` | string | 是 | SPARC mode名称 |
| `task_description` | string | 是 | 任务描述 |
| `options` | object | 否 | mode特定选项 |
| `topology` | string | 否 | swarm拓扑结构 |
| `strategy` | string | 否 | orchestration策略 |
| `maxAgents` | number | 否 | 最大agent数量 |

## 8. Outputs

| 输出 | 类型 | 说明 |
|------|------|------|
| `result` | object | Mode执行结果 |
| `swarm_state` | object | Swarm协调状态 |
| `artifacts` | object | 生成的代码、测试、文档、架构决策 |
| `memory_state` | object | 持久化到Memory的知识状态 |

### Pipeline Execution Output

Each pipeline execution provides:
- Step-by-step execution status
- Success/failure per step
- Timing and performance metrics
- Consolidated results and recommendations

## 9. When to Use

| 场景 | 说明 |
|------|------|
| 新功能开发 | 需要完整的spec→architecture→TDD→review流水线 |
| 重构遗留代码 | analyzer + tester + coder + reviewer模式 |
| Bug修复 | debugger + tester + reviewer模式 |
| 性能优化 | analyzer + optimizer + coder + tester模式 |
| 研究驱动创新 | researcher + innovator + architect + coder模式 |
| 多agent协作 | 需要2.8-4.4x加速的复杂项目 |

## 10. Verification

### Performance Benefits

**Proven Results**:
- **84.8%** SWE-Bench solve rate
- **32.3%** token reduction through optimizations
- **2.8-4.4x** speed improvement with parallel execution
- **27+** neural models for pattern learning
- **90%+** test coverage standard

### Verification Gates

- [ ] Test coverage >= 90%
- [ ] Code review passed (security + performance + best practices)
- [ ] Memory sync complete across agents
- [ ] Documentation generated
- [ ] Integration tests passing
- [ ] Performance benchmarks met

## 11. Forbidden Behaviors

| 行为 | 后果 |
|------|------|
| 跳过测试直接实现 | 违反TDD核心原则，降低代码质量 |
| 忽略Memory同步 | 跨agent信息不一致，决策冲突 |
| 分批发送独立操作 | 降低并行效率，增加延迟 |
| 不在review阶段检查安全 | 可能引入安全漏洞 |
| 将文件保存到项目根目录 | 违反文件组织原则 |
| 跳过文档生成 | 知识无法持久化 |

## 12. Output Template

### Quick Reference

#### Most Common Commands

```bash
# List modes
npx claude-flow sparc modes

# Run specific mode
npx claude-flow sparc run <mode> "task"

# TDD workflow
npx claude-flow sparc tdd "feature"

# Full pipeline
npx claude-flow sparc pipeline "task"

# Batch execution
npx claude-flow sparc batch <modes> "task"
```

#### Most Common MCP Calls

```javascript
// Initialize swarm
mcp__claude-flow__swarm_init { topology: "hierarchical" }

// Execute mode
mcp__claude-flow__sparc_mode { mode: "coder", task_description: "..." }

// Monitor progress
mcp__claude-flow__swarm_monitor { interval: 5000 }

// Store in memory
mcp__claude-flow__memory_usage { action: "store", key: "...", value: "..." }
```

### Advanced Features

#### Neural Pattern Training

```javascript
// Train patterns from successful workflows
mcp__claude-flow__neural_train {
  pattern_type: "coordination",
  training_data: "successful_tdd_workflow.json",
  epochs: 50
}
```

#### Cross-Session Memory

```javascript
// Save session state
mcp__claude-flow__memory_persist {
  sessionId: "feature-auth-v1"
}

// Restore in new session
mcp__claude-flow__context_restore {
  snapshotId: "feature-auth-v1"
}
```

#### GitHub Integration

```javascript
// Analyze repository
mcp__claude-flow__github_repo_analyze {
  repo: "owner/repo",
  analysis_type: "code_quality"
}

// Manage pull requests
mcp__claude-flow__github_pr_manage {
  repo: "owner/repo",
  pr_number: 123,
  action: "review"
}
```

#### Performance Monitoring

```javascript
// Real-time swarm monitoring
mcp__claude-flow__swarm_monitor {
  swarmId: "current",
  interval: 5000
}

// Bottleneck analysis
mcp__claude-flow__bottleneck_analyze {
  component: "api-layer",
  metrics: ["latency", "throughput", "errors"]
}

// Token usage tracking
mcp__claude-flow__token_usage {
  operation: "feature-development",
  timeframe: "24h"
}
```

### TDD Workflow Template

```javascript
// Step 1: Initialize TDD swarm
mcp__claude-flow__swarm_init {
  topology: "hierarchical",
  maxAgents: 8
}

// Step 2: Research and planning
mcp__claude-flow__sparc_mode {
  mode: "researcher",
  task_description: "research testing best practices for feature X"
}

// Step 3: Architecture design
mcp__claude-flow__sparc_mode {
  mode: "architect",
  task_description: "design testable architecture for feature X"
}

// Step 4: TDD implementation
mcp__claude-flow__sparc_mode {
  mode: "tdd",
  task_description: "implement feature X with 90% coverage",
  options: {
    coverage_target: 90,
    test_framework: "jest",
    parallel_tests: true
  }
}

// Step 5: Code review
mcp__claude-flow__sparc_mode {
  mode: "reviewer",
  task_description: "review feature X implementation",
  options: {
    test_coverage_check: true,
    security_check: true
  }
}

// Step 6: Optimization
mcp__claude-flow__sparc_mode {
  mode: "optimizer",
  task_description: "optimize feature X performance"
}
```

### Red-Green-Refactor Cycle

```javascript
// RED: Write failing test
mcp__claude-flow__sparc_mode {
  mode: "tester",
  task_description: "create failing test for shopping cart add item",
  options: { expect_failure: true }
}

// GREEN: Minimal implementation
mcp__claude-flow__sparc_mode {
  mode: "coder",
  task_description: "implement minimal code to pass test",
  options: { minimal: true }
}

// REFACTOR: Improve code quality
mcp__claude-flow__sparc_mode {
  mode: "coder",
  task_description: "refactor shopping cart implementation",
  options: { maintain_tests: true }
}
```

## 13. VIB Example

### Example 1: Full-Stack Development

```javascript
[Single Message - Parallel Agent Execution]:

// Initialize swarm
mcp__claude-flow__swarm_init {
  topology: "hierarchical",
  maxAgents: 10
}

// Architecture phase
mcp__claude-flow__sparc_mode {
  mode: "architect",
  task_description: "design REST API with authentication",
  options: { memory_enabled: true }
}

// Research phase
mcp__claude-flow__sparc_mode {
  mode: "researcher",
  task_description: "research authentication best practices"
}

// Implementation phase
mcp__claude-flow__sparc_mode {
  mode: "coder",
  task_description: "implement Express API with JWT auth",
  options: { test_driven: true }
}

// Testing phase
mcp__claude-flow__sparc_mode {
  mode: "tdd",
  task_description: "comprehensive API tests",
  options: { coverage_target: 90 }
}

// Review phase
mcp__claude-flow__sparc_mode {
  mode: "reviewer",
  task_description: "security and performance review",
  options: { security_check: true }
}

// Batch todos
TodoWrite {
  todos: [
    {content: "Design API schema", status: "completed"},
    {content: "Research JWT implementation", status: "completed"},
    {content: "Implement authentication", status: "in_progress"},
    {content: "Write API tests", status: "pending"},
    {content: "Security review", status: "pending"},
    {content: "Performance optimization", status: "pending"},
    {content: "API documentation", status: "pending"},
    {content: "Deployment setup", status: "pending"}
  ]
}
```

### Example 2: Research-Driven Innovation

```javascript
// Research phase
mcp__claude-flow__sparc_mode {
  mode: "researcher",
  task_description: "research AI-powered search implementations",
  options: {
    depth: "comprehensive",
    sources: ["academic", "industry"]
  }
}

// Innovation phase
mcp__claude-flow__sparc_mode {
  mode: "innovator",
  task_description: "propose novel search algorithm",
  options: { memory_enabled: true }
}

// Architecture phase
mcp__claude-flow__sparc_mode {
  mode: "architect",
  task_description: "design scalable search system"
}

// Implementation phase
mcp__claude-flow__sparc_mode {
  mode: "coder",
  task_description: "implement search algorithm",
  options: { test_driven: true }
}

// Documentation phase
mcp__claude-flow__sparc_mode {
  mode: "documenter",
  task_description: "document search system architecture and API"
}
```

### Example 3: Legacy Code Refactoring

```javascript
// Analysis phase
mcp__claude-flow__sparc_mode {
  mode: "analyzer",
  task_description: "analyze legacy codebase dependencies"
}

// Planning phase
mcp__claude-flow__sparc_mode {
  mode: "orchestrator",
  task_description: "plan incremental refactoring strategy"
}

// Testing phase (create safety net)
mcp__claude-flow__sparc_mode {
  mode: "tester",
  task_description: "create comprehensive test suite for legacy code",
  options: { coverage_target: 80 }
}

// Refactoring phase
mcp__claude-flow__sparc_mode {
  mode: "coder",
  task_description: "refactor module X with modern patterns",
  options: { maintain_tests: true }
}

// Review phase
mcp__claude-flow__sparc_mode {
  mode: "reviewer",
  task_description: "validate refactoring maintains functionality"
}
```

## 14. Fallback Strategy

| 场景 | 策略 | 行为 |
|------|------|------|
| MCP工具不可用 | degrade | 切换至NPX CLI fallback |
| Swarm不可用 | degrade | 降级为单agent顺序执行 |
| Memory不可用 | degrade | 使用文件级状态存储 |
| 某mode调用失败 | degrade | 记录错误，跳过或重试 |
| 网络超时 | retry | 指数退避重试 |
| 架构决策冲突 | abort | 记录ADR，回退至上一决策点 |

## 15. Handoff Protocol

| 接收方 | 触发条件 | 传递内容 |
|--------|---------|---------|
| verification-gate | 开发阶段完成 | 输出数据和gate配置 |
| failure-analysis | 不可恢复错误 | 错误上下文和trace ID |
| memory-manager | 阶段转换 | 当前阶段的知识状态 |
| orchestrator | 子任务完成 | 子任务结果和artifacts |

---

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [Development Phases](#development-phases)
3. [Available Modes](#available-modes)
4. [Activation Methods](#activation-methods)
5. [Orchestration Patterns](#orchestration-patterns)
6. [TDD Workflows](#tdd-workflows)
7. [Best Practices](#best-practices)
8. [Integration Examples](#integration-examples)
9. [Common Workflows](#common-workflows)

---

Remember: **SPARC = Systematic, Parallel, Agile, Refined, Complete**
