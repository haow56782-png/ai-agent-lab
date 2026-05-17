---
name: Hooks Automation
description: "Automated coordination, formatting, and learning from Claude Code operations using intelligent hooks with MCP integration. Includes pre/post task hooks, session management, Git integration, memory coordination, and neural pattern training for enhanced development workflows."
category: automation
version: "1.0.0"
owner: "platform-team"

inputs:
  - name: hook_type
    type: string
    required: true
    description: "Type of hook to execute (pre-edit, post-edit, pre-task, post-task, pre-bash, post-bash, pre-search, post-search, session-start, session-end, etc.)"
  - name: file_path
    type: string
    required: false
    description: "File path related to the hook operation"
  - name: command
    type: string
    required: false
    description: "Command to validate or log for bash hooks"
  - name: task_description
    type: string
    required: false
    description: "Task description for pre/post-task hooks"
  - name: session_id
    type: string
    required: false
    description: "Session identifier for session hooks"
  - name: memory_key
    type: string
    required: false
    description: "Memory key for storing/retrieving context"

outputs:
  - name: continue
    type: boolean
    description: "Whether the operation should continue"
    alwaysPresent: true
  - name: reason
    type: string
    description: "Reason for the continue/block decision"
    alwaysPresent: true
  - name: metadata
    type: object
    description: "Additional metadata from hook execution (agent_assigned, syntax_valid, etc.)"
    alwaysPresent: false
  - name: warnings
    type: array
    description: "Warning messages from hook execution"
    alwaysPresent: false

tools:
  - name: read
    purpose: "Read file contents for validation and analysis"
    required: true
  - name: execute
    purpose: "Execute hook commands and MCP tool integrations"
    required: true

memory:
  required:
    - "swarm/hooks/status (hook 执行状态，用于协调和监控)"
    - "swarm/editor/current (当前编辑操作上下文)"
    - "swarm/editor/complete (完成的编辑操作记录)"
    - "coordination/task/* (任务协调状态)"
  ttl: "会话级别 — 操作完成后保留摘要，协调数据持久化到下一会话"

workflow:
  steps:
    - "Hook Trigger — 操作触发对应的 hook（pre/post）"
    - "Status Recording — Phase 1: 记录 hook 开始状态到协调内存"
    - "Execution — Phase 2: 执行 hook 逻辑（验证/格式化/分析）"
    - "Completion — Phase 3: 记录完成状态并返回响应"
  states:
    - "TRIGGERED → STATUS_RECORDING → EXECUTING → COMPLETED"
    - "→ BLOCKED → FAILED"

verification:
  - id: "gate-hook-config-valid"
    description: "Hook 配置语法正确且 matcher 模式有效"
    type: existence
    severity: critical
  - id: "gate-hook-response-valid"
    description: "Hook 返回有效的 JSON 响应（continue + reason）"
    type: invariant
    severity: critical

failure_modes:
  - when: "hook 超时"
    code: "HOOK_TIMEOUT"
    recoverable: true
    recovery: "增加超时时间，或将 hook 改为异步执行"
  - when: "hook 配置错误"
    code: "HOOK_CONFIG_ERROR"
    recoverable: true
    recovery: "验证 settings.json 语法和 matcher 模式"
  - when: "MCP 工具不可用"
    code: "MCP_UNAVAILABLE"
    recoverable: true
    recovery: "跳过 MCP 集成步骤，降级为本地执行"
  - when: "内存写入失败"
    code: "MEMORY_WRITE_FAILURE"
    recoverable: true
    recovery: "重试或跳过内存记录，记录警告"

fallback:
  strategy: degrade
  plan: "MCP 工具不可用时跳过协调步骤，仅执行本地 hook 逻辑；内存写入失败时记录警告但不阻塞操作；异步 hook 超时时继续主流程"

handoff:
  - to: "verification-quality"
    when: "post-edit hook 完成代码修改"
    payload: "修改的文件路径、变更摘要和质量评分"
  - to: "pair-programming"
    when: "需要代理切换或任务分配"
    payload: "任务上下文、agent 分配信息"
  - to: "verification-gate"
    when: "需要在 hook 链中插入验证门"
    payload: "当前状态和验证所需上下文"

cost_tracking:
  estimatedTokens: 2500
  estimatedTimeMs: 8000
  recordFields:
    - field: "hooksExecuted"
      description: "执行的 hook 数量"
    - field: "hooksBlocked"
      description: "阻止操作的 hook 数量"
    - field: "memoryOperations"
      description: "内存读写操作次数"
---

# Hooks Automation

Intelligent automation system that coordinates, validates, and learns from Claude Code operations through hooks integrated with MCP tools and neural pattern training.

## 1. Purpose

This skill provides a comprehensive hook system that automatically manages development operations, coordinates swarm agents, maintains session state, and continuously learns from coding patterns. It enables automated agent assignment, code formatting, performance tracking, and cross-session memory persistence.

**Key Capabilities:**
- **Pre-Operation Hooks**: Validate, prepare, and auto-assign agents before operations
- **Post-Operation Hooks**: Format, analyze, and train patterns after operations
- **Session Management**: Persist state, restore context, generate summaries
- **Memory Coordination**: Synchronize knowledge across swarm agents
- **Git Integration**: Automated commit hooks with quality verification
- **Neural Training**: Continuous learning from successful patterns
- **MCP Integration**: Seamless coordination with swarm tools

## 2. References

### Prerequisites

**Required:**
- Claude Flow CLI installed (`npm install -g claude-flow@alpha`)
- Claude Code with hooks enabled
- `.claude/settings.json` with hook configurations

**Optional:**
- MCP servers configured (claude-flow, ruv-swarm, flow-nexus)
- Git repository for version control
- Testing framework for quality verification

### Related Commands

- `npx claude-flow init --hooks` - Initialize hooks system
- `npx claude-flow hook --list` - List available hooks
- `npx claude-flow hook --test <hook>` - Test specific hook
- `npx claude-flow hook validate-config` - Validate configuration
- `npx claude-flow memory usage` - Manage memory
- `npx claude-flow agent spawn` - Spawn agents
- `npx claude-flow swarm init` - Initialize swarm

### Integration with Other Skills

This skill works seamlessly with:
- **SPARC Methodology** - Hooks enhance SPARC workflows
- **Pair Programming** - Automated quality in pairing sessions
- **Verification Quality** - Truth-score validation in hooks
- **GitHub Workflows** - Git integration for commits/PRs
- **Performance Analysis** - Metrics collection in hooks
- **Swarm Advanced** - Multi-agent coordination via hooks

## 3. Core Principles

1. **Keep Hooks Lightweight** - Target < 100ms execution time
2. **Use Async for Heavy Operations** - Don't block the main flow
3. **Cache Aggressively** - Store frequently accessed data
4. **Batch Related Operations** - Combine multiple actions
5. **Use Memory Wisely** - Set appropriate TTLs
6. **Monitor Hook Performance** - Track execution times
7. **Parallelize When Possible** - Run independent hooks concurrently

### Best Practices

1. **Configure Hooks Early** - Set up during project initialization
2. **Use Memory Keys Strategically** - Organize with clear namespaces
3. **Enable Auto-Formatting** - Maintain code consistency
4. **Train Patterns Continuously** - Learn from successful operations
5. **Monitor Performance** - Track hook execution times
6. **Validate Configuration** - Test hooks before production use
7. **Document Custom Hooks** - Maintain hook documentation
8. **Set Appropriate Timeouts** - Prevent hanging operations
9. **Handle Errors Gracefully** - Use continueOnError when appropriate
10. **Review Metrics Regularly** - Optimize based on usage patterns

### Benefits

- **Automatic Agent Assignment**: Right agent for every file type
- **Consistent Code Formatting**: Language-specific formatters
- **Continuous Learning**: Neural patterns improve over time
- **Cross-Session Memory**: Context persists between sessions
- **Performance Tracking**: Comprehensive metrics and analytics
- **Automatic Coordination**: Agents sync via memory
- **Smart Agent Spawning**: Task-based agent selection
- **Quality Gates**: Pre-commit validation and verification
- **Error Prevention**: Syntax validation before edits
- **Knowledge Sharing**: Decisions stored and shared
- **Reduced Manual Work**: Automation of repetitive tasks
- **Better Collaboration**: Seamless multi-agent coordination

## 4. Workflow

### Three-Phase Memory Protocol

All hooks follow a standardized memory coordination pattern:

**Phase 1: STATUS** - Hook starts
```javascript
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/hooks/pre-edit/status",
  namespace: "coordination",
  value: JSON.stringify({
    status: "running",
    hook: "pre-edit",
    file: "src/auth.js",
    timestamp: Date.now()
  })
}
```

**Phase 2: PROGRESS** - Hook processes
```javascript
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/hooks/pre-edit/progress",
  namespace: "coordination",
  value: JSON.stringify({
    progress: 50,
    action: "validating syntax",
    file: "src/auth.js"
  })
}
```

**Phase 3: COMPLETE** - Hook finishes
```javascript
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/hooks/pre-edit/complete",
  namespace: "coordination",
  value: JSON.stringify({
    status: "complete",
    result: "success",
    agent_assigned: "backend-dev",
    syntax_valid: true,
    backup_created: true
  })
}
```

### Agent Coordination Workflow

How agents use hooks for coordination:

#### Agent Workflow Example

```bash
# Agent 1: Backend Developer
# STEP 1: Pre-task preparation
npx claude-flow hook pre-task \
  --description "Implement user authentication API" \
  --auto-spawn-agents \
  --load-memory

# STEP 2: Work begins - pre-edit validation
npx claude-flow hook pre-edit \
  --file "api/auth.js" \
  --auto-assign-agent \
  --validate-syntax

# STEP 3: Edit file (via Claude Code Edit tool)
# ... code changes ...

# STEP 4: Post-edit processing
npx claude-flow hook post-edit \
  --file "api/auth.js" \
  --memory-key "swarm/backend/auth-api" \
  --auto-format \
  --train-patterns

# STEP 5: Notify coordination system
npx claude-flow hook notify \
  --message "Auth API implementation complete" \
  --swarm-status \
  --broadcast

# STEP 6: Task completion
npx claude-flow hook post-task \
  --task-id "auth-api" \
  --analyze-performance \
  --store-decisions \
  --export-learnings
```

```bash
# Agent 2: Test Engineer (receives notification)
# STEP 1: Check memory for API details
npx claude-flow hook session-restore \
  --session-id "swarm-current" \
  --restore-memory

# Memory contains: swarm/backend/auth-api with implementation details

# STEP 2: Generate tests
npx claude-flow hook pre-task \
  --description "Write tests for auth API" \
  --load-memory

# STEP 3: Create test file
npx claude-flow hook post-edit \
  --file "api/auth.test.js" \
  --memory-key "swarm/testing/auth-api-tests" \
  --train-patterns

# STEP 4: Share test results
npx claude-flow hook notify \
  --message "Auth API tests complete - 100% coverage" \
  --broadcast
```

## 5. Data Boundaries

**Data Read:**
- Configuration from `.claude/settings.json`
- Memory state from coordination namespace
- File contents for validation and formatting
- Git history for rollback and commit hooks

**Data Written:**
- Hook execution status to coordination memory
- Edit context and decisions to memory store
- Neural pattern training data
- Session metrics and summaries

**Data NOT Accessed:**
- Authentication tokens or API keys
- User personal data (PII)
- Financial or payment information
- Credentials or secrets

## 6. Failure Modes

### Troubleshooting

#### Hooks Not Executing
- Verify `.claude/settings.json` syntax
- Check hook matcher patterns
- Enable debug mode
- Review permission settings
- Ensure claude-flow CLI is in PATH

#### Hook Timeouts
- Increase timeout values in configuration
- Make hooks asynchronous for heavy operations
- Optimize hook logic
- Check network connectivity for MCP tools

#### Memory Issues
- Set appropriate TTLs for memory keys
- Clean up old memory entries
- Use memory namespaces effectively
- Monitor memory usage

#### Performance Problems
- Profile hook execution times
- Use caching for repeated operations
- Batch operations when possible
- Reduce hook complexity

| Failure Code | Description | Recoverable |
|-------------|-------------|-------------|
| `HOOK_TIMEOUT` | Hook execution exceeds configured timeout | Yes -- increase timeout or switch to async |
| `HOOK_CONFIG_ERROR` | Invalid hook configuration in settings.json | Yes -- fix matcher patterns or syntax |
| `MCP_UNAVAILABLE` | MCP tool or service is not reachable | Yes -- degrade to local execution |
| `MEMORY_WRITE_FAILURE` | Unable to write to coordination memory | Yes -- retry or skip with warning |

### Debugging Hooks

Enable debug mode for troubleshooting:

```bash
# Enable debug output
export CLAUDE_FLOW_DEBUG=true

# Test specific hook with verbose output
npx claude-flow hook pre-edit --file "test.js" --debug

# Check hook execution logs
cat .claude-flow/logs/hooks-$(date +%Y-%m-%d).log

# Validate configuration
npx claude-flow hook validate-config
```

## 7. Inputs

### Pre-Operation Hook Inputs

**pre-edit** - Validate and assign agents before file modifications
```bash
npx claude-flow hook pre-edit [options]

Options:
  --file, -f <path>         File path to be edited
  --auto-assign-agent       Automatically assign best agent (default: true)
  --validate-syntax         Pre-validate syntax before edit
  --check-conflicts         Check for merge conflicts
  --backup-file             Create backup before editing
```

**pre-bash** - Check command safety and resource requirements
```bash
npx claude-flow hook pre-bash --command <cmd>

Options:
  --command, -c <cmd>       Command to validate
  --check-safety            Verify command safety (default: true)
  --estimate-resources      Estimate resource usage
  --require-confirmation    Request user confirmation for risky commands
```

**pre-task** - Auto-spawn agents and prepare for complex tasks
```bash
npx claude-flow hook pre-task [options]

Options:
  --description, -d <text>  Task description for context
  --auto-spawn-agents       Automatically spawn required agents (default: true)
  --load-memory             Load relevant memory from previous sessions
  --optimize-topology       Select optimal swarm topology
  --estimate-complexity     Analyze task complexity
```

**pre-search** - Prepare and optimize search operations
```bash
npx claude-flow hook pre-search --query <query>

Options:
  --query, -q <text>        Search query
  --check-cache             Check cache first (default: true)
  --optimize-query          Optimize search pattern
```

### Post-Operation Hook Inputs

**post-edit** - Auto-format, validate, and update memory
```bash
npx claude-flow hook post-edit [options]

Options:
  --file, -f <path>         File path that was edited
  --auto-format             Automatically format code (default: true)
  --memory-key, -m <key>    Store edit context in memory
  --train-patterns          Train neural patterns from edit
  --validate-output         Validate edited file
```

**post-bash** - Log execution and update metrics
```bash
npx claude-flow hook post-bash --command <cmd>

Options:
  --command, -c <cmd>       Command that was executed
  --log-output              Log command output (default: true)
  --update-metrics          Update performance metrics
  --store-result            Store result in memory
```

**post-task** - Performance analysis and decision storage
```bash
npx claude-flow hook post-task [options]

Options:
  --task-id, -t <id>        Task identifier for tracking
  --analyze-performance     Generate performance metrics (default: true)
  --store-decisions         Save task decisions to memory
  --export-learnings        Export neural pattern learnings
  --generate-report         Create task completion report
```

**post-search** - Cache results and improve patterns
```bash
npx claude-flow hook post-search --query <query> --results <path>

Options:
  --query, -q <text>        Original search query
  --results, -r <path>      Results file path
  --cache-results           Cache for future use (default: true)
  --train-patterns          Improve search patterns
```

### MCP Integration Hook Inputs

**mcp-initialized** - Persist swarm configuration
```bash
npx claude-flow hook mcp-initialized --swarm-id <id>
```

**agent-spawned** - Update agent roster and memory
```bash
npx claude-flow hook agent-spawned --agent-id <id> --type <type>
```

**task-orchestrated** - Monitor task progress
```bash
npx claude-flow hook task-orchestrated --task-id <id>
```

**neural-trained** - Save pattern improvements
```bash
npx claude-flow hook neural-trained --pattern <name>
```

### Session Hook Inputs

**session-start** - Initialize new session
```bash
npx claude-flow hook session-start --session-id <id>

Options:
  --session-id, -s <id>     Session identifier
  --load-context            Load context from previous session
  --init-agents             Initialize required agents
```

**session-restore** - Load previous session state
```bash
npx claude-flow hook session-restore --session-id <id>

Options:
  --session-id, -s <id>     Session to restore
  --restore-memory          Restore memory state (default: true)
  --restore-agents          Restore agent configurations
```

**session-end** - Cleanup and persist session state
```bash
npx claude-flow hook session-end [options]

Options:
  --session-id, -s <id>     Session identifier to end
  --save-state              Save current session state (default: true)
  --export-metrics          Export session metrics
  --generate-summary        Create session summary
  --cleanup-temp            Remove temporary files
```

**notify** - Custom notifications with swarm status
```bash
npx claude-flow hook notify --message <msg>

Options:
  --message, -m <text>      Notification message
  --level <level>           Notification level (info|warning|error)
  --swarm-status            Include swarm status (default: true)
  --broadcast               Send to all agents
```

### Memory Coordination Hook Inputs

**memory-write** - Triggered when agents write to coordination memory
**memory-read** - Triggered when agents read from coordination memory
**memory-sync** - Synchronize memory across swarm agents
```bash
npx claude-flow hook memory-sync --namespace <ns>
```

## 8. Outputs

### Hook Response Format

Hooks return JSON responses to control operation flow:

#### Continue Response
```json
{
  "continue": true,
  "reason": "All validations passed",
  "metadata": {
    "agent_assigned": "backend-dev",
    "syntax_valid": true,
    "file": "src/auth.js"
  }
}
```

#### Block Response
```json
{
  "continue": false,
  "reason": "Protected file - manual review required",
  "metadata": {
    "file": ".env.production",
    "protection_level": "high",
    "requires": "manual_approval"
  }
}
```

#### Warning Response
```json
{
  "continue": true,
  "reason": "Syntax valid but complexity high",
  "warnings": [
    "Cyclomatic complexity: 15 (threshold: 10)",
    "Consider refactoring for better maintainability"
  ],
  "metadata": {
    "complexity": 15,
    "threshold": 10
  }
}
```

### MCP Tool Integration Outputs

Hooks automatically integrate with MCP tools for coordination:

#### Pre-Task Hook with Agent Spawning

```javascript
// Hook command
npx claude-flow hook pre-task --description "Build REST API"

// Internally calls MCP tools:
mcp__claude-flow__agent_spawn {
  type: "backend-dev",
  capabilities: ["api", "database", "testing"]
}

mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/task/api-build/context",
  namespace: "coordination",
  value: JSON.stringify({
    description: "Build REST API",
    agents: ["backend-dev"],
    started: Date.now()
  })
}
```

#### Post-Edit Hook with Memory Storage

```javascript
// Hook command
npx claude-flow hook post-edit --file "api/auth.js"

// Internally calls MCP tools:
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/edits/api/auth.js",
  namespace: "coordination",
  value: JSON.stringify({
    file: "api/auth.js",
    timestamp: Date.now(),
    changes: { added: 45, removed: 12 },
    formatted: true,
    linted: true
  })
}

mcp__claude-flow__neural_train {
  pattern_type: "coordination",
  training_data: { /* edit patterns */ }
}
```

#### Session End Hook with State Persistence

```javascript
// Hook command
npx claude-flow hook session-end --session-id "dev-2024"

// Internally calls MCP tools:
mcp__claude-flow__memory_persist {
  sessionId: "dev-2024"
}

mcp__claude-flow__swarm_status {
  swarmId: "current"
}

// Generates metrics and summary
```

## 9. When to Use

Use the Hooks Automation skill in these scenarios:

- **Before File Edits**: Validate syntax, check conflicts, assign appropriate agent
- **After File Edits**: Auto-format, validate output, store edit context in memory
- **Before Command Execution**: Check command safety, estimate resource requirements
- **After Command Execution**: Log results, update metrics, detect error patterns
- **Complex Task Initiation**: Auto-spawn agents, load relevant memory, optimize topology
- **Task Completion**: Analyze performance, store decisions, export learnings
- **Session Management**: Persist state between sessions, restore context, generate summaries
- **Cross-Agent Coordination**: Synchronize knowledge, notify agents, track progress
- **Git Operations**: Pre-commit validation, post-commit tracking, pre-push quality gates

## 10. Verification

### Available Hooks

#### Pre-Operation Hooks

Hooks that execute BEFORE operations to prepare and validate:

**pre-edit** - Validate and assign agents before file modifications

**Features:**
- Auto agent assignment based on file type
- Syntax validation to prevent broken code
- Conflict detection for concurrent edits
- Automatic file backups for safety

**pre-bash** - Check command safety and resource requirements

**Features:**
- Command safety validation
- Resource requirement estimation
- Destructive command confirmation
- Permission checks

**pre-task** - Auto-spawn agents and prepare for complex tasks

**Features:**
- Automatic agent spawning based on task analysis
- Memory loading for context continuity
- Topology optimization for task structure
- Complexity estimation and time prediction

**pre-search** - Prepare and optimize search operations

**Features:**
- Cache checking for faster results
- Query optimization
- Search pattern improvement

#### Post-Operation Hooks

Hooks that execute AFTER operations to process and learn:

**post-edit** - Auto-format, validate, and update memory

**Features:**
- Language-specific auto-formatting (Prettier, Black, gofmt)
- Memory storage for edit context and decisions
- Neural pattern training for continuous improvement
- Output validation with linting

**post-bash** - Log execution and update metrics

**Features:**
- Command execution logging
- Performance metric tracking
- Result storage for analysis
- Error pattern detection

**post-task** - Performance analysis and decision storage

**Features:**
- Execution time and token usage measurement
- Decision and implementation choice recording
- Neural learning pattern export
- Completion report generation

**post-search** - Cache results and improve patterns

**Features:**
- Result caching for faster subsequent searches
- Search pattern improvement
- Relevance scoring

#### MCP Integration Hooks

Hooks that coordinate with MCP swarm tools:

**mcp-initialized** - Persist swarm configuration
**agent-spawned** - Update agent roster and memory
**task-orchestrated** - Monitor task progress
**neural-trained** - Save pattern improvements

#### Memory Coordination Hooks

**memory-write** - Triggered when agents write to coordination memory
**memory-read** - Triggered when agents read from coordination memory
**memory-sync** - Synchronize memory across swarm agents

#### Session Hooks

**session-start** - Initialize new session
**session-restore** - Load previous session state
**session-end** - Cleanup and persist session state
**notify** - Custom notifications with swarm status

## 11. Forbidden Behaviors

| Behavior | Consequence |
|----------|-------------|
| Blocking the main flow with synchronous heavy hooks | Degraded performance and user experience |
| Ignoring hook timeout configurations | Hanging operations blocking the workflow |
| Using overly broad matcher patterns | Hooks firing on unintended operations |
| Skipping error handling in custom hooks | Silent failures in hook execution |
| Writing sensitive data to memory | Security and privacy violations |
| Bypassing permission checks in bash hooks | Execution of dangerous commands |
| Disabling hooks without fallback | Missing validation and coordination |
| Using non-descriptive memory keys | Difficulty debugging and maintaining hooks |

## 12. Output Template

```yaml
hook_response:
  continue: true  # or false to block
  reason: "All validations passed"
  metadata:
    agent_assigned: "backend-dev"
    syntax_valid: true
    file: "src/auth.js"
  warnings:
    - "Cyclomatic complexity: 15 (threshold: 10)"

memory_record:
  key: "swarm/hooks/pre-edit/status"
  namespace: "coordination"
  value:
    status: "running | complete | failed"
    hook: "pre-edit | post-edit | pre-task | ..."
    timestamp: 1234567890

mcp_integration:
  tool: "mcp__claude-flow__memory_usage"
  action: "store | read | delete"
  key: "swarm/context/keyname"
```

## 13. VIB Example

### Quick Start

#### Initialize Hooks System

```bash
# Initialize with default hooks configuration
npx claude-flow init --hooks
```

This creates:
- `.claude/settings.json` with pre-configured hooks
- Hook command documentation in `.claude/commands/hooks/`
- Default hook handlers for common operations

#### Basic Hook Usage

```bash
# Pre-task hook (auto-spawns agents)
npx claude-flow hook pre-task --description "Implement authentication"

# Post-edit hook (auto-formats and stores in memory)
npx claude-flow hook post-edit --file "src/auth.js" --memory-key "auth/login"

# Session end hook (saves state and metrics)
npx claude-flow hook session-end --session-id "dev-session" --export-metrics
```

### Real-World Examples

#### Example 1: Full-Stack Development Workflow

```bash
# Session start - initialize coordination
npx claude-flow hook session-start --session-id "fullstack-feature"

# Pre-task planning
npx claude-flow hook pre-task \
  --description "Build user profile feature - frontend + backend + tests" \
  --auto-spawn-agents \
  --optimize-topology

# Backend work
npx claude-flow hook pre-edit --file "api/profile.js"
# ... implement backend ...
npx claude-flow hook post-edit \
  --file "api/profile.js" \
  --memory-key "profile/backend" \
  --train-patterns

# Frontend work (reads backend details from memory)
npx claude-flow hook pre-edit --file "components/Profile.jsx"
# ... implement frontend ...
npx claude-flow hook post-edit \
  --file "components/Profile.jsx" \
  --memory-key "profile/frontend" \
  --train-patterns

# Testing (reads both backend and frontend from memory)
npx claude-flow hook pre-task \
  --description "Test profile feature" \
  --load-memory

# Session end - export everything
npx claude-flow hook session-end \
  --session-id "fullstack-feature" \
  --export-metrics \
  --generate-summary
```

#### Example 2: Debugging with Hooks

```bash
# Start debugging session
npx claude-flow hook session-start --session-id "debug-memory-leak"

# Pre-task: analyze issue
npx claude-flow hook pre-task \
  --description "Debug memory leak in event handlers" \
  --load-memory \
  --estimate-complexity

# Search for event emitters
npx claude-flow hook pre-search --query "EventEmitter"
# ... search executes ...
npx claude-flow hook post-search \
  --query "EventEmitter" \
  --cache-results

# Fix the issue
npx claude-flow hook pre-edit \
  --file "services/events.js" \
  --backup-file
# ... fix code ...
npx claude-flow hook post-edit \
  --file "services/events.js" \
  --memory-key "debug/memory-leak-fix" \
  --validate-output

# Verify fix
npx claude-flow hook post-task \
  --task-id "memory-leak-fix" \
  --analyze-performance \
  --generate-report

# End session
npx claude-flow hook session-end \
  --session-id "debug-memory-leak" \
  --export-metrics
```

#### Example 3: Multi-Agent Refactoring

```bash
# Initialize swarm for refactoring
npx claude-flow hook pre-task \
  --description "Refactor legacy codebase to modern patterns" \
  --auto-spawn-agents \
  --optimize-topology

# Agent 1: Code Analyzer
npx claude-flow hook pre-task --description "Analyze code complexity"
# ... analysis ...
npx claude-flow hook post-task \
  --task-id "analysis" \
  --store-decisions

# Agent 2: Refactoring (reads analysis from memory)
npx claude-flow hook session-restore \
  --session-id "swarm-refactor" \
  --restore-memory

for file in src/**/*.js; do
  npx claude-flow hook pre-edit --file "$file" --backup-file
  # ... refactor ...
  npx claude-flow hook post-edit \
    --file "$file" \
    --memory-key "refactor/$file" \
    --auto-format \
    --train-patterns
done

# Agent 3: Testing (reads refactored code from memory)
npx claude-flow hook pre-task \
  --description "Generate tests for refactored code" \
  --load-memory

# Broadcast completion
npx claude-flow hook notify \
  --message "Refactoring complete - all tests passing" \
  --broadcast
```

## 14. Fallback Strategy

### Configuration

#### Basic Configuration

Edit `.claude/settings.json` to configure hooks:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "^(Write|Edit|MultiEdit)$",
        "hooks": [{
          "type": "command",
          "command": "npx claude-flow hook pre-edit --file '${tool.params.file_path}' --memory-key 'swarm/editor/current'"
        }]
      },
      {
        "matcher": "^Bash$",
        "hooks": [{
          "type": "command",
          "command": "npx claude-flow hook pre-bash --command '${tool.params.command}'"
        }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "^(Write|Edit|MultiEdit)$",
        "hooks": [{
          "type": "command",
          "command": "npx claude-flow hook post-edit --file '${tool.params.file_path}' --memory-key 'swarm/editor/complete' --auto-format --train-patterns"
        }]
      },
      {
        "matcher": "^Bash$",
        "hooks": [{
          "type": "command",
          "command": "npx claude-flow hook post-bash --command '${tool.params.command}' --update-metrics"
        }]
      }
    ]
  }
}
```

#### Advanced Configuration

Complete hook configuration with all features:

```json
{
  "hooks": {
    "enabled": true,
    "debug": false,
    "timeout": 5000,

    "PreToolUse": [
      {
        "matcher": "^(Write|Edit|MultiEdit)$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook pre-edit --file '${tool.params.file_path}' --auto-assign-agent --validate-syntax",
            "timeout": 3000,
            "continueOnError": true
          }
        ]
      },
      {
        "matcher": "^Task$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook pre-task --description '${tool.params.task}' --auto-spawn-agents --load-memory",
            "async": true
          }
        ]
      },
      {
        "matcher": "^Grep$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook pre-search --query '${tool.params.pattern}' --check-cache"
          }
        ]
      }
    ],

    "PostToolUse": [
      {
        "matcher": "^(Write|Edit|MultiEdit)$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook post-edit --file '${tool.params.file_path}' --memory-key 'edits/${tool.params.file_path}' --auto-format --train-patterns",
            "async": true
          }
        ]
      },
      {
        "matcher": "^Task$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook post-task --task-id '${result.task_id}' --analyze-performance --store-decisions --export-learnings",
            "async": true
          }
        ]
      },
      {
        "matcher": "^Grep$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook post-search --query '${tool.params.pattern}' --cache-results --train-patterns"
          }
        ]
      }
    ],

    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook session-start --session-id '${session.id}' --load-context"
          }
        ]
      }
    ],

    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook session-end --session-id '${session.id}' --export-metrics --generate-summary --cleanup-temp"
          }
        ]
      }
    ]
  }
}
```

#### Protected File Patterns

Add protection for sensitive files:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "^(Write|Edit|MultiEdit)$",
        "hooks": [
          {
            "type": "command",
            "command": "npx claude-flow hook check-protected --file '${tool.params.file_path}'"
          }
        ]
      }
    ]
  }
}
```

#### Automatic Testing

Run tests after file modifications:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "^Write$",
        "hooks": [
          {
            "type": "command",
            "command": "test -f '${tool.params.file_path%.js}.test.js' && npm test '${tool.params.file_path%.js}.test.js'",
            "continueOnError": true
          }
        ]
      }
    ]
  }
}
```

## 15. Handoff Protocol

| Receiving Skill | Trigger Condition | Payload |
|----------------|-------------------|---------|
| verification-quality | Post-edit hook completes code modification | Modified file paths, change summary, quality score |
| pair-programming | Agent switch or task assignment needed | Task context, agent assignment info |
| verification-gate | Verification gate needed in hook chain | Current state and verification context |

### Git Integration

Hooks can integrate with Git operations for quality control:

#### Pre-Commit Hook
```bash
# Add to .git/hooks/pre-commit or use husky

#!/bin/bash
# Run quality checks before commit

# Get staged files
FILES=$(git diff --cached --name-only --diff-filter=ACM)

for FILE in $FILES; do
  # Run pre-edit hook for validation
  npx claude-flow hook pre-edit --file "$FILE" --validate-syntax

  if [ $? -ne 0 ]; then
    echo "Validation failed for $FILE"
    exit 1
  fi

  # Run post-edit hook for formatting
  npx claude-flow hook post-edit --file "$FILE" --auto-format
done

# Run tests
npm test

exit $?
```

#### Post-Commit Hook
```bash
# Add to .git/hooks/post-commit

#!/bin/bash
# Track commit metrics

COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)

npx claude-flow hook notify \
  --message "Commit completed: $COMMIT_MSG" \
  --level info \
  --swarm-status
```

#### Pre-Push Hook
```bash
# Add to .git/hooks/pre-push

#!/bin/bash
# Quality gate before push

# Run full test suite
npm run test:all

# Run quality checks
npx claude-flow hook session-end \
  --generate-report \
  --export-metrics

# Verify quality thresholds
TRUTH_SCORE=$(npx claude-flow metrics score --format json | jq -r '.truth_score')

if (( $(echo "$TRUTH_SCORE < 0.95" | bc -l) )); then
  echo "Truth score below threshold: $TRUTH_SCORE < 0.95"
  exit 1
fi

exit 0
```

### Custom Hook Creation

Create custom hooks for specific workflows:

#### Custom Hook Template

```javascript
// .claude/hooks/custom-quality-check.js

module.exports = {
  name: 'custom-quality-check',
  type: 'pre',
  matcher: /\.(ts|js)$/,

  async execute(context) {
    const { file, content } = context;

    // Custom validation logic
    const complexity = await analyzeComplexity(content);
    const securityIssues = await scanSecurity(content);

    // Store in memory
    await storeInMemory({
      key: `quality/${file}`,
      value: { complexity, securityIssues }
    });

    // Return decision
    if (complexity > 15 || securityIssues.length > 0) {
      return {
        continue: false,
        reason: 'Quality checks failed',
        warnings: [
          `Complexity: ${complexity} (max: 15)`,
          `Security issues: ${securityIssues.length}`
        ]
      };
    }

    return {
      continue: true,
      reason: 'Quality checks passed',
      metadata: { complexity, securityIssues: 0 }
    };
  }
};
```

#### Register Custom Hook

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "^(Write|Edit)$",
        "hooks": [
          {
            "type": "script",
            "script": ".claude/hooks/custom-quality-check.js"
          }
        ]
      }
    ]
  }
}
```
