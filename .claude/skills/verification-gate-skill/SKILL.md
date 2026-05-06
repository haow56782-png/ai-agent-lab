---
name: verification-gate
description: "Forces every agent output to be verifiable through explicit checks. 'Seems right' is never sufficient — each output must carry evidence of passing defined gates before proceeding to the next step."
category: quality
version: "0.2.0"
owner: "platform-team"

inputs:
  - name: output
    type: object
    required: true
    description: "需要验证的输出数据"
  - name: gate_list
    type: array
    required: true
    description: "需要执行的验证门列表"
  - name: context
    type: object
    required: false
    description: "验证所需的上文（traceId, userId, 相关文件路径等）"

outputs:
  - name: verified_items
    type: array
    description: "通过验证的项目列表"
    alwaysPresent: true
  - name: unverified_items
    type: array
    description: "未通过验证的项目列表"
    alwaysPresent: true
  - name: evidence
    type: array
    description: "每项验证的证据记录"
    alwaysPresent: true
  - name: risks
    type: array
    description: "验证中发现的剩余风险"
    alwaysPresent: true
  - name: required_next_checks
    type: array
    description: "建议的后续验证步骤"
    alwaysPresent: true

tools:
  - name: read
    purpose: "读取待验证的文件和参考文档"
    required: true
  - name: execute
    purpose: "运行测试命令"
    required: false

verification:
  - id: "gate-meta-verify"
    description: "验证门本身已执行且记录可查"
    type: existence
    severity: critical
  - id: "gate-no-unverified-output"
    description: "没有未经验证的输出被传递到下一步"
    type: invariant
    severity: critical

failure_modes:
  - when: "critical gate 失败"
    code: "CRITICAL_GATE_FAILED"
    recoverable: true
    recovery: "回退到上一步，修复后重新验证"
  - when: "验证证据不足"
    code: "INSUFFICIENT_EVIDENCE"
    recoverable: true
    recovery: "补充缺失的证据来源后重新验证"
  - when: "多个 gate 同时失败"
    code: "MULTI_GATE_FAILURE"
    recoverable: true
    recovery: "逐个修复，从 severity 最高的开始"

cost_tracking:
  estimatedTokens: 800
  estimatedTimeMs: 3000
  recordFields:
    - field: "gatesExecuted"
      description: "执行的验证门数"
    - field: "gatesPassed"
      description: "通过的验证门数"
    - field: "gatesFailed"
      description: "失败的验证门数"

memory:
  required:
    - "gate_list (声明的验证门列表和严重级别)"
    - "output (待验证的输出内容)"
  ttl: "工作流步骤级别，验证完成后保留摘要"

workflow:
  steps:
    - "Gate Execution — 按顺序执行每个声明 gate"
    - "Evidence Collection — 记录每条命令的真实输出"
    - "Blocking Check — critical gate 失败时阻断"
    - "Summary Report — 汇总 total/passed/failed"
  states: []
---

# Verification Gate Skill

## 1. Purpose

确保 Agent 的每个输出在被接受之前都经过显式验证。**"Seems right" is not done. "Should work" is not evidence. "Looks good" is not a gate.**

输出可信度的来源不是 Agent 的自信程度，而是客观证据：

```
Agent says "it's done"       →  不可接受。证据呢？
Agent shows test result      →   可接受。gate passed。
Agent says "I checked it"    →   不可接受。怎么检查的？
Agent shows diff + test run  →   可接受。证据完整。
```

## 2. When to Use

| 触发场景 | 说明 |
|---------|------|
| Agent 声明"已完成"时 | 任何交付物、代码修改、文档更新 |
| 工作流状态转换前 | state_A → state_B 之间 |
| 跨 Agent 交接前 | 输出传递给另一个 Agent 前 |
| 用户交付物生成时 | 报告、代码、配置、PRD |
| 声称修复了问题时 | bug fix 必须有复现 → 修复 → 验证闭环 |
| 声称测试通过时 | 必须显示测试命令和输出 |

**不要使用**：探索性分析、头脑风暴、草稿阶段（但仍应声明"这是草稿，未经验证"）。

## 3. Inputs

```yaml
output:
  type: "code_change"        # 变更类型
  files: ["src/workflow.ts"] # 涉及文件
  description: "增加确认弹窗状态"
  diff: "+35 -2 lines"       # 变更量

gate_list:
  - static_check             # 静态检查
  - unit_test                # 单元测试
  - business_consistency     # 业务一致性

context:
  traceId: "trace-001"
  taskId: "TASK-005"
```

## 4. Outputs

```yaml
verified_items:
  - item: "所有文件语法正确"
    gate: "static_check"
    passed: true
    evidence: "tsc --noEmit 返回 exit code 0"

unverified_items:
  - item: "新增弹窗的 UI 样式"
    gate: "acceptance_check"
    passed: false
    reason: "缺少设计稿，无法验证样式匹配"

evidence:
  - gate: "unit_test"
    result: "17 passed, 0 failed"
    command: "npm test -- --run binding"
    timestamp: "2026-05-07T10:30:00Z"

risks:
  - risk: "新状态插入可能影响未覆盖的边界情况"
    likelihood: "low"
    mitigation: "已添加边界测试"

required_next_checks:
  - "UI 设计稿就绪后执行 acceptance_check"
  - "集成环境部署后验证实际弹窗交互"
```

## 5. Workflow

### Step 1: 声明待验证项

Agent 执行完成后，列出所有需要验证的输出项。

### Step 2: 选择验证门

根据输出类型选择合适的验证门类型：

| 类型 | 验证对象 | 验证方式 |
|------|---------|---------|
| `static_check` | 代码语法、类型、lint | tsc, eslint, prettier --check |
| `unit_test` | 函数逻辑、状态转换 | vitest run, jest |
| `integration_test` | 跨组件交互、DB 读写 | 集成测试脚本 |
| `acceptance_check` | 用户可见行为、UI/UX | 人工检查或 E2E 测试 |
| `product_logic_check` | 业务规则、领域不变量 | 规则引擎或人工审查 |
| `business_consistency_check` | 跨功能一致性、数据一致性 | 交叉检查 |
| `cost_check` | token 消耗、执行时间、API 调用次数 | 成本报告 |

### Step 3: 执行验证门

每个门必须产生可记录的证据：

```
[gate: static_check]
  step: 运行 tsc --noEmit
  evidence: exit code 0, 0 errors
  passed: true

[gate: unit_test]
  step: 运行 npm test -- --run binding
  evidence: 17 passed, 0 failed, 23ms
  passed: true

[gate: business_consistency]
  step: 检查新状态不影响现有状态转换
  evidence: 所有 18 个状态的 transition 规则未改变
  passed: true
```

### Step 4: 汇总验证结果

将通过的项、未通过的项、证据记录到 output。

### Step 5: 决定下一步

| 结果 | 处理 |
|------|------|
| 全部通过 | 输出可交付给下一步 |
| 有 critical 失败 | 阻塞，回退修复 |
| 有 major 失败 | 记录 risks，请求确认 |
| 证据不足 | 补充验证后重新提交 |

## 6. Seven Verification Types

### 6.1 static_check

```yaml
type: static_check
target: "代码语法和类型正确性"
method:
  - "tsc --noEmit 检查 TypeScript 类型"
  - "eslint 检查代码规范"
  - "prettier --check 检查格式"
evidence: "命令 exit code + 输出"
failure: "任何 error 视为 critical"
```

### 6.2 unit_test

```yaml
type: unit_test
target: "函数和模块逻辑正确性"
method: "vitest run 相关测试文件"
evidence: "passed/failed 计数 + 覆盖报告"
failure: "任何 failed test 视为 critical"
coverage_target: "新代码 ≥ 80%"
```

### 6.3 integration_test

```yaml
type: integration_test
target: "跨组件、跨服务交互正确性"
method: "集成测试场景执行"
evidence: "端到端场景通过率"
failure: "核心场景失败视为 critical"
```

### 6.4 acceptance_check

```yaml
type: acceptance_check
target: "用户需求是否被满足"
method: "逐项对照 acceptance_criteria"
evidence: "每个 criteria 的满足情况"
failure: "核心 criteria 不满足视为 critical"
```

### 6.5 product_logic_check

```yaml
type: product_logic_check
target: "业务规则和领域逻辑"
method: "检查 output 是否符合 domain invariants"
evidence: "不变量检查结果"
failure: "领域不变量破坏视为 critical"
```

### 6.6 business_consistency_check

```yaml
type: business_consistency_check
target: "跨功能的业务一致性"
method: "检查修改是否影响其他功能的行为"
evidence: "交叉对比清单"
failure: "发现不一致视为 major"
```

### 6.7 cost_check

```yaml
type: cost_check
target: "资源消耗是否在预期内"
method: "对比 estimated 和 actual 的 token/time"
evidence: "成本记录对比"
failure: "overage > 2.0 视为 warning，> 5.0 视为 major"
thresholds:
  token_overage_warning: 2.0
  token_overage_critical: 5.0
  time_overage_warning: 3.0
  time_overage_critical: 10.0
```

## 7. Verification

1. [ ] 所有输出项至少经过一个验证门
2. [ ] 每个验证门产生了可记录的证据
3. [ ] 没有"seems right"或"should work"替代证据
4. [ ] 失败的 gate 有明确的失败原因和修复路径
5. [ ] 验证结果记录到 trace/telemetry

## 8. Failure Modes

| 失败模式 | 识别条件 | 恢复 |
|---------|---------|------|
| `CRITICAL_GATE_FAILED` | static_check 或 unit_test 失败 | 修复后重新验证 |
| `INSUFFICIENT_EVIDENCE` | 声称通过但无命令输出 | 补充执行并记录 |
| `MULTI_GATE_FAILURE` | ≥ 2 个 gate 同时失败 | 逐个修复 |
| `ACCEPTANCE_GAP` | 输出通过技术 gate 但不满足用户需求 | 调整后重验 |
| `COST_OVERAGE` | 实际消耗 > 预估 × 阈值 | 优化后重验 |

## 9. Forbidden Behaviors

| 禁止行为 | 为什么 | 替代做法 |
|---------|--------|---------|
| **说"seems right"代替证据** | 不是可验证的陈述 | 运行对应 gate 产生证据 |
| **说"should work"代替测试** | 不是验证结果 | 真的跑一次测试 |
| **未运行测试却声称通过** | 虚假验证 | 必须显示命令和 exit code |
| **未验证字段却声称可交付** | 遗漏关键检查项 | 逐项确认或列出未验证项 |
| **跳过 critical gate 继续流程** | 破坏质量保障体系 | 修复后再继续 |
| **说"用户自己会看到的"** | 把验证责任推给用户 | 在交付前完成验证 |
| **只验证成功路径忽略异常路径** | 覆盖不全 | 至少检查一个正常 + 一个异常路径 |

## 10. Output Template

```yaml
verified_items:
  - item: "{已验证的内容}"
    gate: "{gate 类型}"
    passed: true
    evidence: "{验证命令和结果}"

unverified_items:
  - item: "{未验证的内容}"
    gate: "{需要的 gate 类型}"
    passed: false
    reason: "{未通过的原因}"

evidence:
  - gate: "{gate 类型}"
    result: "{输出摘要}"
    command: "{执行的命令}"
    timestamp: "{ISO-8601 时间戳}"

risks:
  - risk: "{风险描述}"
    likelihood: "high/medium/low"
    mitigation: "{缓解措施}"

required_next_checks:
  - "{后续需要执行的验证步骤}"
```

## 11. VIB Example

### 场景：验证绑定工作流的代码修改

**Agent 修改了 `src/binding/workflow.ts`，声明"已完成"**。

验证门执行：

```yaml
verified_items:
  - item: "TypeScript 编译无错误"
    gate: "static_check"
    passed: true
    evidence: "tsc --noEmit → exit code 0, 0 errors"
  - item: "绑定工作流测试全部通过"
    gate: "unit_test"
    passed: true
    evidence: "npm test -- --run binding/workflow → 17 passed, 0 failed"
  - item: "所有状态转换规则未被破坏"
    gate: "product_logic_check"
    passed: true
    evidence: "人工审查：18 个状态的 transition 未改变，新增 1 个状态插入正确位置"

unverified_items:
  - item: "确认弹窗的 UI 交互"
    gate: "acceptance_check"
    passed: false
    reason: "UI 设计稿未就绪，交互验证需等待设计稿完成"

evidence:
  - gate: "static_check"
    result: "0 errors, 0 warnings"
    command: "npx tsc --noEmit"
    timestamp: "2026-05-07T10:35:00Z"
  - gate: "unit_test"
    result: "17 passed, 0 failed, coverage 92%"
    command: "npx vitest run src/binding/workflow.test.ts"
    timestamp: "2026-05-07T10:36:00Z"

risks:
  - risk: "UI 设计稿未就绪，交互可能不符合预期"
    likelihood: "medium"
    mitigation: "使用文字确认作为默认实现，设计稿就绪后替换"

required_next_checks:
  - "UI 设计稿完成后执行 acceptance_check"
  - "集成环境部署后执行 E2E 交互验证"
```
