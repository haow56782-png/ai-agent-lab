---
name: stream-chain
description: Stream-JSON chaining for multi-agent pipelines, data transformation, and sequential workflows
category: workflow
version: "1.0.0"
owner: platform-team

inputs:
  - name: prompts
    type: array
    required: true
    description: "Array of prompt strings, each defining a chain step"
  - name: timeout
    type: number
    required: false
    description: "Timeout per step in seconds (default 30)"
  - name: verbose
    type: boolean
    required: false
    description: "Enable detailed execution information"
  - name: debug
    type: boolean
    required: false
    description: "Enable debug mode with full logging"

outputs:
  - name: chain_result
    type: object
    description: "Final output after all chain steps complete"
    alwaysPresent: true
  - name: step_results
    type: array
    description: "Per-step execution results with timing"
    alwaysPresent: false
  - name: error
    type: object
    description: "Error information (stepIndex, message, recoverable)"
    alwaysPresent: false

tools:
  - name: execute
    purpose: "Run chain steps sequentially with context passing"
    required: true
  - name: read
    purpose: "Read pipeline configuration files"
    required: false

memory:
  required:
    - "chain_context (Cross-step context accumulation for sequential execution)"
    - "pipeline_config (Predefined pipeline definitions from .claude-flow/config.json)"
  ttl: "会话级别 — 链完成后清除中间状态"

workflow:
  steps:
    - "Prompt接收 — 接收链中各步的prompt序列"
    - "Step Execution — 按序执行每步，前步输出作为后步上下文"
    - "Context Flow — 管理跨步上下文传递和累积"
    - "Result Aggregation — 汇总每步结果和执行时序"
    - "Output Generation — 生成最终结果和摘要"
  states:
    - "INIT → PROMPTS_RECEIVED → STEP_EXECUTING → CONTEXT_FLOWING → RESULT_AGGREGATING → OUTPUT_GENERATED"
    - "→ STEP_FAILED → RECOVERY"

verification:
  - id: "gate-minimum-prompts"
    description: "确认最少有2个prompts"
    type: existence
    severity: critical
  - id: "gate-step-timeout"
    description: "每步不超过timeout限制"
    type: invariant
    severity: major
  - id: "gate-context-flow"
    description: "确认上下文在步间正确传递"
    type: invariant
    severity: major

failure_modes:
  - when: "单步执行超时"
    code: "STEP_TIMEOUT"
    recoverable: true
    recovery: "增加timeout值（--timeout 120）重试"
  - when: "上下文未正确传递到后续步骤"
    code: "CONTEXT_LOSS"
    recoverable: true
    recovery: "启用--debug模式诊断上下文流"
  - when: "pipeline名称不存在"
    code: "PIPELINE_NOT_FOUND"
    recoverable: true
    recovery: "检查.claude-flow/config.json中的pipeline定义"
  - when: "prompt数量不足"
    code: "INSUFFICIENT_PROMPTS"
    recoverable: true
    recovery: "至少提供2个prompt"

fallback:
  strategy: degrade
  plan: "单步失败时可跳过该步继续执行后续步骤；超时时可增加timeout值重试；context丢失时使用--debug诊断"

handoff:
  - to: "verification-quality"
    when: "链完成执行"
    payload: "步结果和时序数据"
  - to: "failure-analysis"
    when: "链执行失败"
    payload: "错误上下文和失败步索引"

cost_tracking:
  estimatedTokens: 3500
  estimatedTimeMs: 30000
  recordFields:
    - field: "stepsCompleted"
      description: "完成的步数"
    - field: "totalTimeMs"
      description: "总执行时间"
    - field: "errorsEncountered"
      description: "遇到的错误数"
---

# Stream-Chain Skill

## 1. Purpose

Execute sophisticated multi-step workflows where each agent's output flows into the next, enabling complex data transformations and sequential processing pipelines.

Stream-Chain provides two powerful modes for orchestrating multi-agent workflows:

1. **Custom Chains** (`run`): Execute custom prompt sequences with full control
2. **Predefined Pipelines** (`pipeline`): Use battle-tested workflows for common tasks

Each step in a chain receives the complete output from the previous step, enabling sophisticated multi-agent coordination through streaming data flow.

## 2. References

### Related Skills

- **SPARC Methodology**: Systematic development workflow
- **Swarm Coordination**: Multi-agent orchestration
- **Memory Management**: Persistent context storage
- **Neural Patterns**: Adaptive learning

### Integration with Claude Flow

Combine with Swarm Coordination:

```bash
# Initialize swarm for coordination
claude-flow swarm init --topology mesh

# Execute stream chain with swarm agents
claude-flow stream-chain run \
  "Agent 1: Research task" \
  "Agent 2: Implement solution" \
  "Agent 3: Test implementation" \
  "Agent 4: Review and refine"
```

Memory Integration:

Stream chains automatically store context in memory for cross-session persistence:

```bash
# Execute chain with memory
claude-flow stream-chain run \
  "Analyze requirements" \
  "Design architecture" \
  --verbose

# Results stored in .claude-flow/memory/stream-chain/
```

Neural Pattern Training:

Successful chains train neural patterns for improved performance:

```bash
# Enable neural training
claude-flow stream-chain pipeline optimize --debug

# Patterns learned and stored for future optimizations
```

## 3. Core Principles

1. **Sequential Processing**: Each step builds on previous results
2. **Context Preservation**: Full output history flows through chain
3. **Flexible Orchestration**: Custom chains or predefined pipelines
4. **Agent Coordination**: Natural multi-agent collaboration pattern
5. **Data Transformation**: Complex processing through simple steps

### Best Practices

1. **Clear and Specific Prompts**

**Good:**
```bash
"Analyze authentication.js for SQL injection vulnerabilities"
```

**Avoid:**
```bash
"Check security"
```

2. **Logical Progression**

Order prompts to build on previous outputs:
```bash
1. "Identify the problem"
2. "Analyze root causes"
3. "Design solution"
4. "Implement solution"
5. "Verify implementation"
```

3. **Appropriate Timeouts**

- Simple tasks: 30 seconds (default)
- Analysis tasks: 45-60 seconds
- Implementation tasks: 60-90 seconds
- Complex workflows: 90-120 seconds

4. **Verification Steps**

Include validation in your chains:
```bash
claude-flow stream-chain run \
  "Implement feature X" \
  "Write tests for feature X" \
  "Verify tests pass and cover edge cases"
```

5. **Iterative Refinement**

Use chains for iterative improvement:
```bash
claude-flow stream-chain run \
  "Generate initial implementation" \
  "Review and identify issues" \
  "Refine based on issues found" \
  "Final quality check"
```

## 4. Workflow

### Quick Start

#### Run a Custom Chain

```bash
claude-flow stream-chain run \
  "Analyze codebase structure" \
  "Identify improvement areas" \
  "Generate action plan"
```

#### Execute a Pipeline

```bash
claude-flow stream-chain pipeline analysis
```

### Custom Chains (`run`)

Execute custom stream chains with your own prompts for maximum flexibility.

#### Syntax

```bash
claude-flow stream-chain run <prompt1> <prompt2> [...] [options]
```

**Requirements:**
- Minimum 2 prompts required
- Each prompt becomes a step in the chain
- Output flows sequentially through all steps

#### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--verbose` | Show detailed execution information | `false` |
| `--timeout <seconds>` | Timeout per step | `30` |
| `--debug` | Enable debug mode with full logging | `false` |

#### How Context Flows

Each step receives the previous output as context:

```
Step 1: "Write a sorting function"
Output: [function implementation]

Step 2 receives:
  "Previous step output:
  [function implementation]

  Next task: Add comprehensive tests"

Step 3 receives:
  "Previous steps output:
  [function + tests]

  Next task: Optimize performance"
```

#### Examples

**Basic Development Chain**

```bash
claude-flow stream-chain run \
  "Write a user authentication function" \
  "Add input validation and error handling" \
  "Create unit tests with edge cases"
```

**Security Audit Workflow**

```bash
claude-flow stream-chain run \
  "Analyze authentication system for vulnerabilities" \
  "Identify and categorize security issues by severity" \
  "Propose fixes with implementation priority" \
  "Generate security test cases" \
  --timeout 45 \
  --verbose
```

**Code Refactoring Chain**

```bash
claude-flow stream-chain run \
  "Identify code smells in src/ directory" \
  "Create refactoring plan with specific changes" \
  "Apply refactoring to top 3 priority items" \
  "Verify refactored code maintains behavior" \
  --debug
```

**Data Processing Pipeline**

```bash
claude-flow stream-chain run \
  "Extract data from API responses" \
  "Transform data into normalized format" \
  "Validate data against schema" \
  "Generate data quality report"
```

### Predefined Pipelines (`pipeline`)

Execute battle-tested workflows optimized for common development tasks.

#### Syntax

```bash
claude-flow stream-chain pipeline <type> [options]
```

#### Available Pipelines

**1. Analysis Pipeline**

Comprehensive codebase analysis and improvement identification.

```bash
claude-flow stream-chain pipeline analysis
```

**Workflow Steps:**
1. **Structure Analysis**: Map directory structure and identify components
2. **Issue Detection**: Find potential improvements and problems
3. **Recommendations**: Generate actionable improvement report

**Use Cases:**
- New codebase onboarding
- Technical debt assessment
- Architecture review
- Code quality audits

**2. Refactor Pipeline**

Systematic code refactoring with prioritization.

```bash
claude-flow stream-chain pipeline refactor
```

**Workflow Steps:**
1. **Candidate Identification**: Find code needing refactoring
2. **Prioritization**: Create ranked refactoring plan
3. **Implementation**: Provide refactored code for top priorities

**Use Cases:**
- Technical debt reduction
- Code quality improvement
- Legacy code modernization
- Design pattern implementation

**3. Test Pipeline**

Comprehensive test generation with coverage analysis.

```bash
claude-flow stream-chain pipeline test
```

**Workflow Steps:**
1. **Coverage Analysis**: Identify areas lacking tests
2. **Test Design**: Create test cases for critical functions
3. **Implementation**: Generate unit tests with assertions

**Use Cases:**
- Increasing test coverage
- TDD workflow support
- Regression test creation
- Quality assurance

**4. Optimize Pipeline**

Performance optimization with profiling and implementation.

```bash
claude-flow stream-chain pipeline optimize
```

**Workflow Steps:**
1. **Profiling**: Identify performance bottlenecks
2. **Strategy**: Analyze and suggest optimization approaches
3. **Implementation**: Provide optimized code

**Use Cases:**
- Performance improvement
- Resource optimization
- Scalability enhancement
- Latency reduction

#### Pipeline Options

| Option | Description | Default |
|--------|-------------|---------|
| `--verbose` | Show detailed execution | `false` |
| `--timeout <seconds>` | Timeout per step | `30` |
| `--debug` | Enable debug mode | `false` |

#### Pipeline Examples

**Quick Analysis**

```bash
claude-flow stream-chain pipeline analysis
```

**Extended Refactoring**

```bash
claude-flow stream-chain pipeline refactor --timeout 60 --verbose
```

**Debug Test Generation**

```bash
claude-flow stream-chain pipeline test --debug
```

**Comprehensive Optimization**

```bash
claude-flow stream-chain pipeline optimize --timeout 90 --verbose
```

### Custom Pipeline Definitions

Define reusable pipelines in `.claude-flow/config.json`:

#### Configuration Format

```json
{
  "streamChain": {
    "pipelines": {
      "security": {
        "name": "Security Audit Pipeline",
        "description": "Comprehensive security analysis",
        "prompts": [
          "Scan codebase for security vulnerabilities",
          "Categorize issues by severity (critical/high/medium/low)",
          "Generate fixes with priority and implementation steps",
          "Create security test suite"
        ],
        "timeout": 45
      },
      "documentation": {
        "name": "Documentation Generation Pipeline",
        "prompts": [
          "Analyze code structure and identify undocumented areas",
          "Generate API documentation with examples",
          "Create usage guides and tutorials",
          "Build architecture diagrams and flow charts"
        ]
      }
    }
  }
}
```

#### Execute Custom Pipeline

```bash
claude-flow stream-chain pipeline security
claude-flow stream-chain pipeline documentation
```

## 5. Data Boundaries

Stream chains operate on text-based prompt and output data. Each step can pass up to ~100K tokens of context to the next step. Sensitive data should be handled with appropriate precautions as it flows through the chain.

### Performance Characteristics

- **Throughput**: 2-5 steps per minute (varies by complexity)
- **Context Size**: Up to 100K tokens per step
- **Memory Usage**: ~50MB per active chain
- **Concurrency**: Supports parallel chain execution

## 6. Failure Modes

| Code | 异常 | 可恢复 | 恢复路径 |
|------|------|--------|----------|
| `STEP_TIMEOUT` | 单步执行超时 | 是 | 增加timeout值（--timeout 120）重试 |
| `CONTEXT_LOSS` | 上下文未正确传递到后续步骤 | 是 | 启用--debug模式诊断上下文流 |
| `PIPELINE_NOT_FOUND` | pipeline名称不存在 | 是 | 检查.claude-flow/config.json中的pipeline定义 |
| `INSUFFICIENT_PROMPTS` | prompt数量不足 | 是 | 至少提供2个prompt |

### Troubleshooting

**Chain Timeout**

If steps timeout, increase timeout value:

```bash
claude-flow stream-chain run "complex task" --timeout 120
```

**Context Loss**

If context not flowing properly, use `--debug`:

```bash
claude-flow stream-chain run "step 1" "step 2" --debug
```

**Pipeline Not Found**

Verify pipeline name and custom definitions:

```bash
# Check available pipelines
cat .claude-flow/config.json | grep -A 10 "streamChain"
```

## 7. Inputs

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `prompts` | array[string] | 是 | 链中各步的prompt，最少2个 |
| `timeout` | number | 否 | 每步超时限制，默认30秒 |
| `verbose` | boolean | 否 | 显示详细执行信息 |
| `debug` | boolean | 否 | 启用debug模式和完整日志 |

### Custom Chains Input Syntax

```bash
claude-flow stream-chain run <prompt1> <prompt2> [...] [options]
```

### Pipeline Input Syntax

```bash
claude-flow stream-chain pipeline <type> [options]
```

## 8. Outputs

### Pipeline Output

Each pipeline execution provides:

- **Progress**: Step-by-step execution status
- **Results**: Success/failure per step
- **Timing**: Total and per-step execution time
- **Summary**: Consolidated results and recommendations

| 输出 | 类型 | 说明 |
|------|------|------|
| `chain_result` | object | 所有步完成后的最终输出 |
| `step_results` | array | 每步执行结果和执行时间 |
| `error` | object | 错误信息（stepIndex, message） |

## 9. When to Use

| 场景 | 说明 |
|------|------|
| 多步数据处理流水线 | 需要将一个agent的输出传入下一个agent |
| 代码审查工作流 | 分析→审查→报告 |
| 代码重构 | 识别→计划→实施→验证 |
| 数据转换 | 提取→转换→验证→报告 |
| 代码库迁移 | 分析→计划→实施→测试→文档 |

Use `run` for custom workflows and `pipeline` for battle-tested solutions.

## 10. Verification

- [ ] Minimum 2 prompts provided
- [ ] Timeout per step within limits
- [ ] Context flowing properly between steps
- [ ] Pipeline name valid (for predefined pipelines)
- [ ] Each step produces expected output
- [ ] Verification steps included in chain

## 11. Forbidden Behaviors

| 行为 | 后果 |
|------|------|
| 使用模糊的prompt | 输出质量低下，不能满足下游需求 |
| 跳过验证步骤 | 无法确保结果正确性 |
| 不设置适当timeout | 复杂任务中途超时失败 |
| 忽略上下文流 | 下游步骤缺失关键信息 |
| 单步prompt执行 | 最少需要2个prompt |

## 12. Output Template

```yaml
chain_result:
  final_output: "..."
  steps_completed: N
  total_time_ms: NNNNN
step_results:
  - step: 1
    status: "success | failed"
    time_ms: NNNN
    output: "..."
```

## 13. VIB Example

### Advanced Use Cases

**Multi-Agent Coordination**

Chain different agent types for complex workflows:

```bash
claude-flow stream-chain run \
  "Research best practices for API design" \
  "Design REST API with discovered patterns" \
  "Implement API endpoints with validation" \
  "Generate OpenAPI specification" \
  "Create integration tests" \
  "Write deployment documentation"
```

**Data Transformation Pipeline**

Process and transform data through multiple stages:

```bash
claude-flow stream-chain run \
  "Extract user data from CSV files" \
  "Normalize and validate data format" \
  "Enrich data with external API calls" \
  "Generate analytics report" \
  "Create visualization code"
```

**Code Migration Workflow**

Systematic code migration with validation:

```bash
claude-flow stream-chain run \
  "Analyze legacy codebase dependencies" \
  "Create migration plan with risk assessment" \
  "Generate modernized code for high-priority modules" \
  "Create migration tests" \
  "Document migration steps and rollback procedures"
```

**Quality Assurance Chain**

Comprehensive code quality workflow:

```bash
claude-flow stream-chain pipeline analysis
claude-flow stream-chain pipeline refactor
claude-flow stream-chain pipeline test
claude-flow stream-chain pipeline optimize
```

### Examples Repository

**Complete Development Workflow**

```bash
# Full feature development chain
claude-flow stream-chain run \
  "Analyze requirements for user profile feature" \
  "Design database schema and API endpoints" \
  "Implement backend with validation" \
  "Create frontend components" \
  "Write comprehensive tests" \
  "Generate API documentation" \
  --timeout 60 \
  --verbose
```

**Code Review Pipeline**

```bash
# Automated code review workflow
claude-flow stream-chain run \
  "Analyze recent git changes" \
  "Identify code quality issues" \
  "Check for security vulnerabilities" \
  "Verify test coverage" \
  "Generate code review report with recommendations"
```

**Migration Assistant**

```bash
# Framework migration helper
claude-flow stream-chain run \
  "Analyze current Vue 2 codebase" \
  "Identify Vue 3 breaking changes" \
  "Create migration checklist" \
  "Generate migration scripts" \
  "Provide updated code examples"
```

## 14. Fallback Strategy

| 场景 | 策略 | 行为 |
|------|------|------|
| 单步超时 | degrade | 增加timeout重试或跳过该步继续 |
| 上下文丢失 | degrade | 启用--debug模式诊断问题 |
| Pipeline未找到 | abort | 检查配置中pipeline定义 |
| Prompt不足 | abort | 提示至少提供2个prompt |

## 15. Handoff Protocol

| 接收方 | 触发条件 | 传递内容 |
|--------|---------|---------|
| verification-quality | 链完成执行 | 步结果和时序数据 |
| failure-analysis | 链执行失败 | 错误上下文和失败步索引 |

---

## Conclusion

Stream-Chain enables sophisticated multi-step workflows by:

- **Sequential Processing**: Each step builds on previous results
- **Context Preservation**: Full output history flows through chain
- **Flexible Orchestration**: Custom chains or predefined pipelines
- **Agent Coordination**: Natural multi-agent collaboration pattern
- **Data Transformation**: Complex processing through simple steps

Use `run` for custom workflows and `pipeline` for battle-tested solutions.
