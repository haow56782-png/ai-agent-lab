---
name: failure-analysis
description: "Structured root cause analysis and recovery for agent failures, test failures, requirement drift, and implementation mismatches. Every failure produces a prevention rule that updates the system."
category: analysis
version: "0.2.0"
owner: "platform-team"

inputs:
  - name: symptom
    type: string
    required: true
    description: "失败的外部表现"
  - name: failure_type
    type: string
    required: true
    description: "失败类型（context | requirement | implementation | test | integration | product_logic | cost | hallucination）"
  - name: context
    type: object
    required: true
    description: "失败发生时的完整上下文（traceId, input, output, state）"
  - name: expected_behavior
    type: string
    required: true
    description: "原本期望的行为"
  - name: actual_behavior
    type: string
    required: true
    description: "实际发生的行为"

outputs:
  - name: failure_summary
    type: string
    description: "失败总结"
    alwaysPresent: true
  - name: root_cause
    type: string
    description: "根本原因"
    alwaysPresent: true
  - name: fix_plan
    type: array
    description: "修复步骤"
    alwaysPresent: true
  - name: verification_plan
    type: array
    description: "验证修复的步骤"
    alwaysPresent: true
  - name: prevention_update
    type: object
    description: "更新后的预防规则"
    alwaysPresent: true

tools:
  - name: read
    purpose: "读取相关代码和日志"
    required: true
  - name: execute
    purpose: "运行诊断命令和测试"
    required: false

verification:
  - id: "gate-rca-complete"
    description: "根因分析到达可操作的层面"
    type: invariant
    severity: critical
  - id: "gate-prevention-defined"
    description: "定义了预防规则"
    type: existence
    severity: critical
  - id: "gate-fix-testable"
    description: "修复方案是可验证的"
    type: invariant
    severity: major

failure_modes:
  - when: "根因无法确定"
    code: "RCA_INCONCLUSIVE"
    recoverable: true
    recovery: "记录已知信息，标记为需人工介入"
  - when: "修复引入了新的失败"
    code: "FIX_CAUSED_REGRESSION"
    recoverable: true
    recovery: "回滚修复，重新分析"
  - when: "预防规则与现有规则冲突"
    code: "PREVENTION_CONFLICT"
    recoverable: true
    recovery: "合并或优先级排序"
  - when: "失败上下文不足（缺少 traceId 等）"
    code: "INCOMPLETE_CAPTURE"
    recoverable: true
    recovery: "补充捕获条件，确保 traceId 等必填字段已记录"

fallback:
  strategy: degrade
  plan: "LLM 不可用时执行基于规则的模式匹配（errorCode → 预定义根因映射表）；5 Whys 无法收敛时标记为 MANUAL_REVIEW 而非返回空分析"

handoff:
  - to: "verification-gate"
    when: "修复计划制定完成"
    payload: "root_cause + fix_plan + verification_plan，供 verification gate 验证修复"
  - to: "context-engineering"
    when: "RCA 过程中发现上下文不足"
    payload: "缺失的上下文条目（traceId, workflowId, failureState），请求补充"

cost_tracking:
  estimatedTokens: 2000
  estimatedTimeMs: 5000
  recordFields:
    - field: "failureType"
      description: "失败类型"
    - field: "rcaDepth"
      description: "5 Whys 到达的深度"
    - field: "preventionRuleAdded"
      description: "是否新增了预防规则"

memory:
  required:
    - "error_history (同一失败的历史记录，用于复发检测)"
    - "failure_modes (skill 的已知失败模式)"
  ttl: "持久化 — 错误谱系记录跨会话保留"

workflow:
  steps:
    - "Capture — 记录失败上下文 (traceId, errorCode, state)"
    - "Classify — 确定 failure_type (8 类)"
    - "5 Whys — 逐层追问到可操作的根因"
    - "Fix — 制定修复计划"
    - "Verify — 验证修复有效"
    - "Prevent — 更新 prevention_rule"
  states:
    - "FAILURE_DETECTED"
    - "ROOT_CAUSE_IDENTIFIED"
    - "FIX_PLANNED"
    - "FIX_VERIFIED"
    - "PREVENTION_UPDATED"
---

# Failure Analysis Skill

## 1. Purpose

当 Agent 失败、测试失败、需求跑偏、实现不符合预期时，进行结构化归因和修复。**不是"修好就行"，而是"找到根因、修复、预防再发生"。**

每个失败分析必须产生一个预防规则，更新到系统中。如果同一个失败发生两次，说明第一次的分析没有到位。

## 2. When to Use

| 触发场景 | 说明 |
|---------|------|
| Agent 执行返回错误 | LLM 错误、工具异常、超时 |
| 测试失败 | unit test、integration test、e2e test 失败 |
| 需求跑偏 | 实现与需求不匹配（用户反馈或自检发现） |
| 实现不符合预期 | 代码行为与设计不一致 |
| 输出质量不达标准 | verification gate 失败 |
| 集成失败 | 组件间接口不匹配 |
| 成本超支 | token 或时间消耗显著超预期 |
| 疑似幻觉 | Agent 声称存在不存在的事物 |

**不要使用**：常规调试（已知问题直接修复）、信息性日志。

## 3. Inputs

```yaml
symptom: "绑定工作流在 AUTH_FAILED 状态后无法恢复"
failure_type: "integration_failure"
context:
  traceId: "trace-bind-003"
  workflowId: "bind-20260507-003"
  failureState: "AUTH_FAILED"
  errorCode: "AUTH_TOKEN_EXPIRED"
expected_behavior: "AUTH_FAILED 后重试或进入恢复路径"
actual_behavior: "AUTH_FAILED 后卡死，无重试，无错误提示"
```

## 4. Outputs

```yaml
failure_summary: "OAuth token 过期后工作流未触发重试机制，卡死在 AUTH_FAILED 状态"

root_cause: "ACCOUNT_INFO_FETCHING 的 error handler 未实现 recoverable 路径的重试逻辑"

fix_plan:
  - "在 ACCOUNT_INFO_FETCHING error handler 中添加 retryable 判断"
  - "当 error.recoverable === true 时执行指数退避重试"
  - "重试 3 次后仍然失败则进入不可恢复上报路径"

verification_plan:
  - "编写单元测试验证 recoverable error → retry → success 路径"
  - "编写单元测试验证 unrecoverable error → escalate 路径"
  - "运行绑定工作流全流程确认状态转换正确"

prevention_update:
  rule: "每个 error handler 必须同时实现 recoverable 和 unrecoverable 路径"
  gate: "verification-gate"
  severity: "critical"
```

## 5. Failure Types

### 5.1 context_failure

```yaml
type: context_failure
symptom: "Agent 使用了错误或过时的上下文"
common_causes:
  - "未执行 context check 直接执行"
  - "使用了 1 小时前的项目状态"
  - "忽略了用户最新指令"
  - "引用了不存在的文件"
violated_rule: "context-engineering-skill: 必须先检查再执行"
```

### 5.2 requirement_failure

```yaml
type: requirement_failure
symptom: "实现不满足用户需求"
common_causes:
  - "未提取 user_intent 或提取不准确"
  - "遗漏了 constraints 或 acceptance_criteria"
  - "假设了用户未提及的需求"
violated_rule: "verification-gate-skill: acceptance_check"
```

### 5.3 implementation_failure

```yaml
type: implementation_failure
symptom: "代码实现与设计不一致"
common_causes:
  - "误解了状态机转换规则"
  - "遗漏了边界情况"
  - "类型定义与使用不匹配"
violated_rule: "product_logic_check 或 static_check"
```

### 5.4 test_failure

```yaml
type: test_failure
symptom: "测试失败"
common_causes:
  - "测试本身有 bug（测试与实现互相拷贝 bug）"
  - "生产代码变更未同步更新测试"
  - "测试依赖的环境状态不一致"
violated_rule: "测试应在修改前通过（RED → GREEN 模式）"
```

### 5.5 integration_failure

```yaml
type: integration_failure
symptom: "组件间交互失败"
common_causes:
  - "接口契约不匹配（输入/输出格式不同）"
  - "依赖的组件未就绪"
  - "数据格式或类型不一致"
violated_rule: "Capability Protocol 的 inputs/outputs schema"
```

### 5.6 product_logic_failure

```yaml
type: product_logic_failure
symptom: "领域逻辑错误"
common_causes:
  - "状态机转换规则错误"
  - "领域不变量被破坏"
  - "业务规则理解错误"
violated_rule: "domain invariants 检查"
```

### 5.7 cost_failure

```yaml
type: cost_failure
symptom: "资源消耗远超预期"
common_causes:
  - "未使用上下文压缩（加载了过多无用信息）"
  - "重试次数过多"
  - "工具调用效率低（多次读取同一文件）"
violated_rule: "cost_check: overage < 2.0"
```

### 5.8 hallucination_failure

```yaml
type: hallucination_failure
symptom: "Agent 声称存在不存在的事物"
common_causes:
  - "假设文件存在但未读取确认"
  - "虚构 API 或函数（模型训练数据的记忆偏差）"
  - "虚构错误码或错误信息"
violated_rule: "context-engineering-skill: 确认后再引用"
hallucination_patterns:
  - "声称某个功能存在但无法找到实现文件"
  - "引用不存在的函数签名或参数"
  - "描述不存在的配置项"
```

## 6. Attribution Structure

每次分析必须完成以下归因结构：

```yaml
symptom: "{失败的外部表现}"
root_cause: "{通过 5 Whys 找到的根本原因}"
violated_rule: "{违反了哪个规则或协议}"
failed_gate: "{如果经过 verification gate，是哪个 gate 没拦住}"
recovery_action: "{如何恢复}"
prevention_rule: "{新增或更新的预防规则}"
```

## 7. Workflow

### Step 1: 捕获（Capture）

记录失败发生时的完整上下文：

```yaml
capture:
  timestamp: "2026-05-07T10:35:00Z"
  traceId: "trace-bind-003"
  failureType: "integration_failure"
  input: { url: "https://www.pgsoft.com/games/lucky-dragon" }
  output: { error: "AUTH_TOKEN_EXPIRED" }
  state: "AUTH_FAILED"
  environment: { node: "18.19", sqlite: "5.1" }
```

### Step 2: 分类（Classify）

确定失败类型、严重级别、可恢复性。

### Step 3: 5 Whys 根因分析

```
问题: 绑定工作流在 AUTH_FAILED 后卡死

Why 1: 因为 error handler 没有重试逻辑
  Why 2: 因为实现时只考虑了成功路径
    Why 3: 因为开发时没有列出所有 failure_modes
      Why 4: 因为 SKILL.md 的 failure_modes 字段在(当时)非必填
        Why 5: 因为 Capability Protocol v0.1 刚定义，未强制验证
根因: failure_modes 未强制要求导致 error handler 实现不完整
```

### Step 4: 修复（Fix）

制定修复计划，必须可验证。

### Step 5: 验证（Verify）

执行验证计划，确认修复有效且无回归。

### Step 6: 预防（Prevent）

将预防规则更新到系统中：

```yaml
prevention_update:
  action: "update_rule"
  target: "verification-gate-skill"
  rule: "每个 error handler 必须同时实现 recoverable 和 unrecoverable 路径"
  gate: "product_logic_check"
  severity: "critical"
```

## 8. Verification

1. [ ] 根因到达"可改变的东西"（非"外部系统错误"、"模型问题"等不可控因素）
2. [ ] 每个失败的 gate 都被识别并记录
3. [ ] 修复计划包含验证步骤
4. [ ] 预防规则被更新到对应 skill 或 gate 中
5. [ ] 同一失败不会发生第二次

## 9. Failure Modes

| 失败模式 | 识别条件 | 恢复 |
|---------|---------|------|
| `RCA_INCONCLUSIVE` | 5 Whys 无法收敛到单一根因 | 记录已知信息，标记人工介入 |
| `FIX_CAUSED_REGRESSION` | 修复后测试覆盖率下降或新测试失败 | 回滚，重新分析 |
| `PREVENTION_CONFLICT` | 新预防规则与现有规则矛盾 | 合并或按优先级排序 |
| `INCOMPLETE_CAPTURE` | 失败上下文不足（缺少 traceId 等） | 补充捕获条件 |

## 10. Forbidden Behaviors

| 禁止行为 | 为什么 | 替代做法 |
|---------|--------|---------|
| **说"这不会发生了"但不更新预防规则** | 没有预防措施一定会再发生 | 必须更新预防规则 |
| **RCA 停在"外部系统错误"** | 外部系统错误也可以做优雅降级 | 至少实现降级或上报路径 |
| **说"先继续，回头再分析"** | 上下文丢失后分析质量下降 | 先记录完整上下文再继续 |
| **修复后不验证** | 修复可能无效或引入新问题 | 必须执行验证计划 |
| **跳过 failure_modes 定义直接写 handler** | 缺少系统性地预见失败 | 先在 SKILL.md 中枚举 failure_modes |
| **把症状当根因** | "OAuth token 过期"是症状，不是为什么没有处理它 | 用 5 Whys 深入到"为什么没有处理" |

## 11. Output Template

```yaml
failure_summary: "{一句话描述失败}"

root_cause: "{单一、可操作的根因陈述}"

fix_plan:
  - "{具体修复步骤 1}"
  - "{具体修复步骤 2}"
  - "{具体修复步骤 3}"

verification_plan:
  - "{验证步骤 1}"
  - "{验证步骤 2}"

prevention_update:
  rule: "{新增或更新的预防规则}"
  target: "{应用该规则的 skill 或 gate}"
  severity: "critical/major/minor"
```

## 12. Fallback Strategy

| 场景 | 策略 | 行为 |
|------|------|------|
| LLM 不可用 | degrade | 使用 errorCode → 预定义根因映射表做模式匹配分析 |
| 5 Whys 无法收敛 | degrade | 标记为 MANUAL_REVIEW，返回已知信息摘要 |
| 预防规则冲突 | merge | 按 severity 排序，保留高优先级规则 |

## 13. Handoff Protocol

| 接收方 | 触发条件 | 传递内容 |
|--------|---------|---------|
| verification-gate | 修复计划制定完成 | root_cause + fix_plan + verification_plan |
| context-engineering | RCA 过程中上下文不足 | 缺失的上下文条目（traceId, workflowId, failureState） |

## 14. VIB Example

### 场景：绑定工作流卡死在 AUTH_FAILED

**症状**：OAuth token 过期后工作流不重试，卡死在 AUTH_FAILED。

**归因**：

```yaml
symptom: "绑定工作流在 AUTH_FAILED 后卡死，无重试，无错误提示"

root_cause: "ACCOUNT_INFO_FETCHING 的 error handler 只处理了 unrecoverable 路径，忽略了 recoverable 路径的重试逻辑"
violated_rule: "Capability Protocol failure_modes 中 AUTH_TOKEN_EXPIRED 标注了 recoverable: true，但实现未对应"
failed_gate: "product_logic_check（未验证 error handler 的路径覆盖）"
recovery_action: "手动回滚到 AUTH_CONFIRM_REQUIRED 状态，重新发起授权"

fix_plan:
  - "在 ACCOUNT_INFO_FETCHING error handler 中添加 retryable 判断"
  - "匹配 failure_modes 中的 AUTH_TOKEN_EXPIRED，执行重试"
  - "添加 maxRetries: 2，指数退避"
  - "重试耗尽后进入不可恢复上报路径"

verification_plan:
  - "单元测试 verify: recoverable error → retry → success path"
  - "单元测试 verify: unrecoverable error → escalate path"
  - "集成测试: mock OAuth 返回 401 后验证重试流程"

prevention_update:
  rule: "每个 error handler 必须实现 recoverable 重试路径和 unrecoverable 上报路径"
  target: "verification-gate-skill.product_logic_check"
  severity: "critical"
```
