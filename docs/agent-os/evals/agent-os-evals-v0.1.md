# Agent OS Evaluation Framework v0.1

Agent OS 的量化评估体系。定义 8 个核心指标，每个指标包含完整的采集、计算、通过标准和自动化接入方案。

---

## 指标总览

| 指标 | 度量对象 | 权重 | 性质 |
|------|---------|------|------|
| `task_completion_rate` | 任务完成率 | 25% | 正向 |
| `context_accuracy` | 上下文准确率 | 15% | 正向 |
| `workflow_compliance` | 工作流合规率 | 15% | 正向 |
| `verification_compliance` | 验证门合规率 | 10% | 正向 |
| `hallucination_rate` | 幻觉发生率 | 10% | 反向 |
| `cost_efficiency` | 成本效率 | 10% | 正向 |
| `business_consistency` | 业务一致性 | 10% | 正向 |
| `regression_rate` | 回归率 | 5% | 反向 |

## 综合评分

```
Score = Σ(weight_i × normalized_score_i)

反向指标（hallucination_rate, regression_rate）: score = (1 - raw_value) × 100
正向指标: score = raw_value × 100
```

| 等级 | 分数 | 含义 | 动作 |
|------|------|------|------|
| S | ≥ 95 | 生产就绪 | 可全量发布 |
| A | ≥ 85 | 可进入 beta | 灰度发布 |
| B | ≥ 70 | 可内部试用 | 内部测试 |
| C | ≥ 50 | 原型阶段 | 需改进后进入下一轮 |
| D | < 50 | 需重新设计 | 不可交付 |

---

## 指标 1: task_completion_rate（任务完成率）

### 定义

Agent 在指定场景中成功完成任务的比率。"完成" = 输出符合 acceptance_criteria 中的所有条件，且不违反 constraints。

### 计算方式

```
task_completion_rate = completed_tasks / total_attempted_tasks

- completed_tasks: 输出通过所有验收标准的任务数
- total_attempted_tasks: 总尝试任务数
- 排除: 用户主动取消、输入非法（非 Agent 责任）
```

粒度：
- **全局**: 所有任务类型的平均完成率
- **按场景**: 特定 eval case 的完成率（如 binding-workflow, signal-generation）
- **按步骤**: 工作流中每个步骤的成功率（用于定位瓶颈）

### 通过标准

| 等级 | 阈值 | 说明 |
|------|------|------|
| S | ≥ 95% | 生产就绪 |
| A | ≥ 85% | 可 beta |
| B | ≥ 70% | 内部试用 |
| C | ≥ 50% | 原型 |
| D | < 50% | 不可接受 |

Fail-fast：连续 10 次任务完成率 < 50% → 触发阻断告警。

### 失败样例

```yaml
scenario: "binding-workflow"
input: { url: "https://www.pgsoft.com/games/lucky-dragon", userId: "user_001" }
expected: { state: "SIGNAL_ACTIVE", confidence: "≥ 0.7" }
actual: { state: "SITE_UNSUPPORTED", error: "unknown provider" }
result: FAILED
reason: "Agent 未正确解析 pgsoft.com 域名，将支持站点误判为不支持"
```

### 如何采集

```yaml
采集点:
  - source: "trace span attributes"
    field: "task.state"
    condition: "state === 'completed' || state === 'failed'"
  - source: "eval runner 输出"
    field: "results[].passed"
  - source: "agent telemetry"
    field: "agent.run().status"

采集时机:
  - 每次 eval case 执行后自动上报
  - 生产环境每个 agent.run() 完成时采样记录
```

### 如何进入后续自动化测试

```yaml
阶段一: 开发期
  每次 PR: 运行关联 eval cases → 计算 task_completion_rate
  CI 门禁: task_completion_rate < 70% → CI 失败

阶段二: 预发期
  每日运行全量 eval cases → 趋势图
  告警: 单日下降 > 10% → @oncall

阶段三: 生产期
  采样 10% 生产流量 → 实时 task_completion_rate 仪表盘
  阻断: 连续 10 次 < 50% → 自动回滚上个版本
```

---

## 指标 2: context_accuracy（上下文准确率）

### 定义

Agent 在执行前收集的上下文信息中，准确（真实、非幻觉、非过时）的比例。衡量 Agent 是否正确获取了项目状态、文件内容和用户意图。

### 计算方式

```
context_accuracy = correct_context_items / total_context_items

- correct_context_items: 经过验证为真实的上下文条目
- total_context_items: Agent 使用的所有上下文条目总和
- 每项上下文标记为: correct | stale | hallucinated | irrelevant
```

上下文条目包括：
- `project_state`（分支、未提交变更、最近提交）
- `code_context`（引用的文件内容）
- `domain_context`（引用的领域规则）
- `memory_context`（引用的历史会话）

### 通过标准

| 等级 | 阈值 | 说明 |
|------|------|------|
| S | ≥ 98% | 高保真 |
| A | ≥ 95% | 可接受 |
| B | ≥ 90% | 需改进 |
| C | ≥ 80% | 问题较多 |
| D | < 80% | 不可接受 |

任何 `hallucinated` 条目 → 该 case 的 context_accuracy = 0（一票否决）。

### 失败样例

```yaml
symptom: "Agent 声称文件 'src/binding/workflow.ts' 存在某函数但实际不存在"
context:
  claimed: "workflow.ts 中有 function handleAuthFailure()"
  reality: "workflow.ts 中不存在该函数"
  error_type: "hallucinated"
impact: "Agent 基于不存在的函数做决策，生成的代码不可用"
```

```yaml
symptom: "Agent 使用了 2 小时前的项目状态"
context:
  claimed: "当前在分支 feature/confirm-dialog"
  reality: "当前在分支 main（2 小时前已合并）"
  error_type: "stale"
impact: "Agent 在错误的分支上工作"
```

### 如何采集

```yaml
采集点:
  - source: "agent 的 context_summary 输出（context-engineering-skill）"
    field: "context_summary.project_state"
    validator: "对比真实 git status"
  - source: "agent 执行前记录的 assumptions"
    field: "assumptions[].source"
    validator: "随机抽样验证 assumption 的真实性"
  - source: "trace span attributes"
    field: "context.items[]"
    validator: "逐项检查是否与实际文件/状态一致"

采集工具:
  - "git status / git log 与 agent 声明的 project_state 对比"
  - "read 文件内容与 agent 引用的内容对比"
  - "文件最后修改时间与 agent 使用时间的先后对比"
```

### 如何进入后续自动化测试

```yaml
阶段一: 开发期
  每个 eval case 执行前后: 自动记录 context_summary
  后处理脚本: 对比 context_summary 与真实文件系统状态
  输出: context_accuracy 评分

阶段二: 预发期
  随机抽样 20% eval runs → 深度对比上下文准确性
  告警: context_accuracy < 90% 或出现任何 hallucinated

阶段三: 生产期
  持续采样 agent 的 context_summary
  自动检测: stale ≥ 2 项 / hallucinated ≥ 1 项 → 触发上下文健康告警
```

---

## 指标 3: workflow_compliance（工作流合规率）

### 定义

Agent 是否严格按照定义的状态机（workflow）执行。衡量状态转换的正确性——是否跳过状态、非法转换、或卡死在非终态。

### 计算方式

```
workflow_compliance = (correct_transitions - illegal_transitions) / total_expected_transitions

- correct_transitions: 符合状态机定义的状态转换次数
- illegal_transitions: 非法转换次数（未在 transitions 列表中）
- total_expected_transitions: 根据工作流定义，理论上应发生的转换总数
```

如果出现 `illegal_transitions > 0`，整体合规率直接归零（一票否决）。

### 通过标准

| 等级 | 阈值 | 说明 |
|------|------|------|
| S | 100% | 零非法转换 |
| A | ≥ 95% | 所有转换合法，偶有顺序偏差 |
| B | ≥ 85% | 偶有轻微偏差但不影响终态 |
| C | ≥ 70% | 有非法转换但可恢复 |
| D | < 70% | 存在不可恢复的非法转换 |

`illegal_transitions > 0` → 自动降级至 D，需人工审查。

### 失败样例

```yaml
scenario: "binding-workflow"
expected_path: INIT → URL_RECEIVED → SITE_ANALYZING → SITE_SUPPORTED
actual_path:   INIT → URL_RECEIVED → ACCOUNT_BINDING_REQUIRED
                                     ↑ 跳过了 SITE_ANALYZING 和 SITE_SUPPORTED
violation: "跳过站点分析直接进入绑定"
impact: "未识别站点类型就引导绑定，可能导致不兼容的 OAuth 流程"
```

```yaml
scenario: "binding-workflow"
expected_path: SIGNAL_GENERATING → SIGNAL_ACTIVE → SIGNAL_EXPIRED
actual_path:   SIGNAL_GENERATING → SIGNAL_EXPIRED
                                     ↑ 跳过了 SIGNAL_ACTIVE
violation: "信号未经过 ACTIVE 直接过期"
impact: "用户看不到信号详情，倒计时失效"
```

### 如何采集

```yaml
采集点:
  - source: "trace span 中的 state_transition 事件"
    field: "attributes['state.from'], attributes['state.to']"
  - source: "workflow engine 的状态变更日志"
    field: "transitions[].from, transitions[].to, transitions[].valid"

采集方式:
  - 每次状态转换时记录 (from, to, expected, valid)
  - 执行完毕后回放整个路径，与工作流定义的状态机逐跳对比
  - 自动检测: 非法转换、遗漏转换、死循环
```

### 如何进入后续自动化测试

```yaml
阶段一: 开发期
  每个 workflow eval case 执行完毕后:
  1. 提取 trace 中的 state_transition 序列
  2. 加载对应工作流的 FSM 定义
  3. 逐跳对比 → 输出 compliance 报告
  CI 门禁: workflow_compliance < 100% 且有 illegal_transitions → 阻断

阶段二: 预发期
  每日统计 workflow_compliance 趋势
  告警: 合规率下降 > 5% 或出现任何 illegal_transition

阶段三: 生产期
  每次工作流执行实时校验
  阻断: 检测到 illegal_transition → 立即中断工作流 + 告警
```

---

## 指标 4: verification_compliance（验证门合规率）

### 定义

Agent 输出的每个项目是否经过了对应的 verification gate。衡量"输出是否有证据"——杜绝 Agent 说"seems right"就跳过验证。

### 计算方式

```
verification_compliance = gates_passed / gates_required

- gates_passed: 实际执行并通过的 verification gate 数
- gates_required: 按 SKILL.md 的 verification 定义应执行的 gate 数

每项输出至少有一个 gate。如果某项输出的 gate_count = 0，该项视为未验证。
```

除了 gate 通过率，还要检查：
- **gate 覆盖**: 每个输出项至少有一个 gate 覆盖
- **gate 证据**: 每个 gate 产生了可记录的 evidence
- **gate 真实性**: evidence 是真实命令输出而非编造

### 通过标准

| 等级 | 阈值 | 说明 |
|------|------|------|
| S | 100% | 所有输出有 gate，所有 gate 有证据 |
| A | ≥ 95% | 偶有证据不完整但 gate 已执行 |
| B | ≥ 85% | 少量输出缺少 gate |
| C | ≥ 70% | 多个输出无 gate 或证据缺失 |
| D | < 70% | 系统性 gate 缺失，质量不可控 |

任何 `gate_evidence` 被验证为编造 → 该 case 的 verification_compliance = 0（一票否决）。

### 失败样例

```yaml
symptom: "Agent 声称'测试都通过了'但没有显示测试命令和输出"
gate:
  required: "unit_test"
  actual: "无任何 gate 执行记录"
  agent_says: "所有测试应该都没问题"
violation: "无证据的 gate"
impact: "无法确认测试是否真的通过"
```

```yaml
symptom: "Agent 声称 tsc --noEmit 通过但实际上有类型错误"
gate:
  required: "static_check"
  claimed_evidence: "tsc returned 0 errors"
  actual_evidence: "tsc 返回 2 个类型错误"
violation: "编造 gate evidence"
impact: "类型错误流入生产"
```

### 如何采集

```yaml
采集点:
  - source: "Agent 执行过程中记录的 gate 结果"
    field: "verification[].gateId, verification[].passed, verification[].evidence"
  - source: "verification-gate-skill 的输出"
    field: "verified_items[], unverified_items[], evidence[]"

采集方式:
  - 从 trace 中提取所有 gate 执行记录
  - 与 SKILL.md 的 verification 定义对比：是否所有 required gate 已执行
  - 随机抽样 evidence：重新执行命令对比输出是否一致
```

### 如何进入后续自动化测试

```yaml
阶段一: 开发期
  每个 eval case 执行完毕后:
  1. 提取 verification 记录
  2. 加载对应 skill 的 expected gates
  3. 对比 → 输出 compliance 报告
  CI 门禁: 任何编造 evidence → 阻断

阶段二: 预发期
  自动验证 evidence 真实性: 随机选择 20% gate → 重跑命令对比
  告警: verification_compliance < 90% 或检测到编造 evidence

阶段三: 生产期
  所有 gate evidence 抽样验证
  阻断: 检测到编造 evidence → 该 Agent 版本不可上线
```

---

## 指标 5: hallucination_rate（幻觉发生率）

### 定义

Agent 编造不存在的事物（文件、函数、配置、API、错误码、数据）的频率。这是 Agent OS 中最重要的反向指标。

### 计算方式

```
hallucination_rate = hallucinated_claims / total_claims

- hallucinated_claims: 被验证为不存在的声明数
- total_claims: Agent 输出的所有可验证声明总数

可验证声明包括:
  - 文件路径声称（"src/workflow.ts 中存在..."）
  - 代码引用（"函数 handleAuthFailure 会..."）
  - API 声称（"POST /api/v1/binding/start 返回..."）
  - 数据声称（"用户的 Credits 余额是 50"）
  - 状态声称（"当前在 feature 分支"）
```

### 通过标准

| 等级 | 阈值 | 说明 |
|------|------|------|
| S | < 1% | 几乎无幻觉 |
| A | < 3% | 可接受 |
| B | < 5% | 需改进 |
| C | < 10% | 问题较多 |
| D | ≥ 10% | 不可接受 |

任何 `hallucinated_claims` 导致用户数据损失或业务中断 → 自动 S0 事故。

### 失败样例

```yaml
claim: "函数 handleOAuthCallback 在 src/binding/workflow.ts 中定义了重试逻辑"
reality: "src/binding/workflow.ts 中不存在 handleOAuthCallback"
type: "hallucinated_function"
impact: "Agent 基于不存在的函数做修复计划"
```

```yaml
claim: "用户的 mobileCredits.remaining 返回 { balance: 50 }"
reality: "mobileCredits.remaining API 返回 { credits: 50 }，字段名不同"
type: "hallucinated_field"
impact: "Agent 生成的代码读取 balance 字段 → 生产 bug"
```

### 如何采集

```yaml
采集点:
  - source: "Agent 输出的 claims（来自 trace 中的文件引用和代码生成）"
    validator: "逐项与真实文件系统、类型定义、API response 对比"
  - source: "context-engineering-skill 的 assumptions"
    validator: "随机抽样验证 assumption 的真实性"
  - source: "code review 结果"
    validator: "人工审查标记的幻觉"

采集方式:
  - 自动: 提取 Agent 引用的文件路径 → read 确认是否存在
  - 自动: 提取 Agent 引用的函数名 → grep 确认是否定义
  - 自动: 提取 Agent 声明的 API 响应格式 → 对比实际 API schema
  - 人工: code review 中标记的所有"不存在的引用"
```

### 如何进入后续自动化测试

```yaml
阶段一: 开发期
  每个 eval case 执行后:
  1. 提取 Agent 输出中的所有 claims
  2. 自动验证 claims（文件存在性、函数存在性、字段存在性）
  3. 输出 hallucination_rate
  
  新增 CI 步骤: "claim-validator"
  门禁: hallucination_rate ≥ 5% → CI 失败

阶段二: 预发期
  每日 hallucination_rate 趋势图
  告警: 单日 rate > 3% 或出现新类型的 hallucination pattern
  自动 issue: 记录 hallucination pattern 到错误谱系

阶段三: 生产期
  实时采样 Agent 输出
  阻断: hallucination_rate ≥ 10% → 自动切换备用 LLM provider
  周报: hallucination trend → 用于评估 LLM 模型升级效果
```

---

## 指标 6: cost_efficiency（成本效率）

### 定义

Agent 执行任务时的资源消耗效率。比较实际消耗与预估消耗的比值，衡量 token 和时间的利用效率。

### 计算方式

```
cost_efficiency = estimated_cost / actual_cost

- estimated_cost: SKILL.md cost_tracking 中声明的预估消耗
- actual_cost: trace 中记录的实际消耗
- 分别计算: token_efficiency 和 time_efficiency

如果 actual_cost 中某项缺失（未记录），该项按 0 处理。
```

可选的聚合方式：
- **按场景**: 特定 eval case 的平均 cost_efficiency
- **按 skill**: 特定 skill 调用时的平均消耗
- **按步骤**: 工作流中每个步骤的消耗明细

### 通过标准

| 等级 | token_ratio | time_ratio | 说明 |
|------|------------|------------|------|
| S | ≥ 0.8 | ≥ 0.7 | 接近预估，高效 |
| A | ≥ 0.6 | ≥ 0.5 | 可接受 |
| B | ≥ 0.4 | ≥ 0.3 | 有优化空间 |
| C | ≥ 0.2 | ≥ 0.1 | 效率较低 |
| D | < 0.2 | < 0.1 | 严重超支 |

`actual_cost / estimated_cost > 3.0`（即 cost_efficiency < 0.33）→ 触发优化告警。

### 失败样例

```yaml
scenario: "binding-workflow"
estimated: { tokens: 3500, timeMs: 15000 }
actual:    { tokens: 15000, timeMs: 60000 }
ratio:     { tokens: 0.23, timeMs: 0.25 }
verdict: "D — 严重超支"

root_cause: "Agent 加载了 3 个完整领域文档而非使用结构化摘要"
fix: "启用 context-engineering-skill 的上下文压缩策略"
```

### 如何采集

```yaml
采集点:
  - source: "trace span 中的 cost 记录"
    field: "cost.estimated, cost.actual"
  - source: "cost_tracking 字段"
    field: "cost_tracking.estimatedTokens, cost_tracking.estimatedTimeMs"
  - source: "LLM client telemetry"
    field: "promptTokens, completionTokens, durationMs"

采集时机:
  - 每次 eval case 执行完毕后自动采集
  - 每次 skill 调用完成后记录
  - LLM 每次请求完成后记录 token 消耗
```

### 如何进入后续自动化测试

```yaml
阶段一: 开发期
  每次 eval case 执行后自动计算 cost_efficiency
  对比实际 vs 预估 → 输出超支项
  CI 报告: 标记 cost_efficiency < 0.5 的 case
  
  超支分析:
  - token 超支: 检查上下文加载量
  - 时间超支: 检查重试次数和工具调用次数

阶段二: 预发期
  每日成本趋势: token/signal, time/signal
  告警: cost_efficiency < 0.4 且趋势持续下降

阶段三: 生产期
  实时成本监控: 每次信号生成的成本
  阻断: cost_efficiency < 0.2 → 触发成本优化流程
  月报: 按场景的成本汇总，用于容量规划
```

---

## 指标 7: business_consistency（业务一致性）

### 定义

Agent 的输出是否符合 VIB 平台的业务规则和领域不变量。衡量业务逻辑的正确性——不仅仅代码正确，业务逻辑也必须正确。

### 计算方式

```
business_consistency = rules_passed / total_rules_checked

- rules_passed: 通过的业务规则数
- total_rules_checked: 执行的业务规则检查总数

检查的业务规则包括:
  - 领域不变量（confidence ∈ [0,1], factors 非空 等）
  - 状态机规则（合式转换、无悬挂状态）
  - 数据边界规则（不越权读取数据）
  - 授权规则（先授权后读取）
  - 计费规则（先扣点后生成信号）
```

### 通过标准

| 等级 | 阈值 | 说明 |
|------|------|------|
| S | 100% | 全部规则通过 |
| A | ≥ 95% | 核心规则全部通过，非核心偶有遗漏 |
| B | ≥ 85% | 核心规则全部通过，非核心有遗漏 |
| C | ≥ 70% | 有核心规则未通过但可恢复 |
| D | < 70% | 核心规则未通过，业务逻辑错误 |

核心规则（critical）: 任一条不通过 → 自动 D 级。

### 失败样例

```yaml
rule: "confidence ∈ [0, 1]"
type: "domain_invariant"
check: "0.0 <= output.confidence <= 1.0"
input: { confidence: 1.5 }
violation: "置信度超过 1.0"
impact: "违反预测模型的基本数学约束"
```

```yaml
rule: "先授权后读取"
type: "authorization"
check: "ACCOUNT_INFO_FETCHING 之前必须有 AUTH_CONFIRM_REQUIRED"
input: "Agent 跳过授权直接获取账号信息"
violation: "未授权访问用户数据"
impact: "安全违规，可能导致用户数据泄露"
```

### 如何采集

```yaml
采集点:
  - source: "workflow 执行 trace"
    field: "state_transitions[].from, state_transitions[].to"
    checker: "验证转换合法性 + 授权前置条件"
  - source: "Agent 输出数据"
    field: "output.*"
    checker: "验证领域不变量"
  - source: "verification gate 结果"
    field: "verification[].gateId"
    checker: "验证 product_logic_check 和 business_consistency_check 的通过情况"

采集方式:
  - 每次 eval case 执行后自动执行业务规则引擎
  - 规则引擎从 docs/domain-model.md 和 workflow 定义中提取
```

### 如何进入后续自动化测试

```yaml
阶段一: 开发期
  每个 eval case 执行后:
  1. 加载 domain invariants 列表
  2. 逐项检查 Agent 输出
  3. 加载 workflow state machine 定义
  4. 检查状态转换合法性
  CI 门禁: 任何 core rule 失败 → 阻断

阶段二: 预发期
  每日业务一致性报告
  告警: 任何 core rule 失败

阶段三: 生产期
  实时业务规则引擎: 每个 Agent 输出经过规则检查
  阻断: core rule 失败 → 输出拦截 + 告警
  规则版本管理: 规则更新后需重新验证所有活跃 signals
```

---

## 指标 8: regression_rate（回归率）

### 定义

系统更新后，之前通过的 eval case 变为失败的比例。衡量变更是否破坏了已有功能。

### 计算方式

```
regression_rate = regressed_cases / total_passing_cases_before

- regressed_cases: 上次评估通过但本次评估失败的 case 数
- total_passing_cases_before: 上次评估通过的总 case 数
```

按影响范围分层：

| 层级 | 范围 | 示例 |
|------|------|------|
| L1 | 单个 case 回归 | binding-workflow 中的某个异常路径 |
| L2 | 单个场景回归 | binding-workflow 全部失败 |
| L3 | 多个场景回归 | binding + signal + report 均失败 |
| L4 | 全量回归 | 所有 eval case 失败 |

### 通过标准

| 等级 | 阈值 | 说明 |
|------|------|------|
| S | 0% | 零回归 |
| A | < 5% | 偶有 L1 回归 |
| B | < 10% | 有 L1/L2 回归但不影响核心路径 |
| C | < 20% | 有核心路径回归但可快速修复 |
| D | ≥ 20% | 大面积回归，不可发布 |

任何 L3 及以上回归 → 自动 D 级，不可发布。

### 失败样例

```yaml
event: "PR #142 合并后引发的回归"
baseline: "2026-05-06 全量 eval: 12/12 passed"
current:  "2026-05-07 全量 eval: 9/12 passed"
regressed:
  - case: "binding-workflow-auth-failure"
    previous: passed
    current:  failed
    reason: "修改了 error handler 但未覆盖 AUTH_TOKEN_EXPIRED 场景"
  - case: "signal-generation-credits-check"
    previous: passed
    current:  failed
    reason: "Credits 扣点公式更新后未同步更新测试预期值"
impact: "L2 回归 — 绑定场景核心路径受影响"
```

### 如何采集

```yaml
采集点:
  - source: "CI 中的 eval 执行结果"
    field: "cases[].id, cases[].passed"
  - source: "前后两次评估报告的 diff"
    field: "diff[].caseId, diff[].statusBefore, diff[].statusAfter"

采集方式:
  - 每次 CI 运行 eval 时自动记录全量结果
  - 与上一次运行结果比较 → 生成回归报告
  - 回归报告按 case、场景、严重程度分层

基础设施:
  - 每次 eval 运行的 JSON 报告归档（按日期）
  - regression diff 脚本比较两次归档
```

### 如何进入后续自动化测试

```yaml
阶段一: 开发期
  每次 CI 运行:
  1. 从归档加载上次 eval 结果
  2. 运行本次 eval
  3. 对比 diff
  4. 输出 regression_rate
  CI 门禁: regression_rate ≥ 10% 或 L3 回归 → 阻断

阶段二: 预发期
  每次构建执行全量回归测试
  告警: regression_rate > 5% → 阻止进入预发环境
  自动 bisect: 定位引起回归的提交

阶段三: 生产期
  灰度发布时: 灰度组 vs 基准组 regression_rate 对比
  阻断: regression_rate ≥ 5% → 停止灰度，回滚
  自动化: regression 修复后需通过全量 eval 才可重新发布
```

---

## 评估流程总图

```
    代码变更
       │
       ▼
  ┌─────────────┐
  │ 开发期检查   │ ← CI: 关联 eval cases + 门禁
  │             │    task_completion_rate ≥ 70%
  │             │    workflow_compliance = 100% (无 illegal)
  │             │    hallucination_rate < 5%
  │             │    regression_rate < 10%
  └──────┬──────┘
         │ pass
         ▼
  ┌─────────────┐
  │ 预发期检查   │ ← 全量 eval + 趋势图
  │             │    告警阈值: 所有指标 B 级以上
  │             │    阻断: 任何 core rule 失败
  └──────┬──────┘
         │ pass
         ▼
  ┌─────────────┐
  │ 生产期监控   │ ← 实时采样 + 仪表盘
  │             │    阻断: regression_rate ≥ 5%
  │             │    回滚: hallucination_rate ≥ 10%
  └─────────────┘
```

## Eval Case 与指标的关系

每个 eval case 必须声明它覆盖哪些指标：

```yaml
---
id: "eval-binding-workflow-v1"
metrics:
  - task_completion_rate
  - workflow_compliance
  - business_consistency
---
```

这决定：
1. CI 中该 case 只计算声明了的指标
2. 回归分析时只关注声明了的指标变化
3. 每个指标至少被 2 个 eval case 覆盖

## 测试工具

```bash
# 运行单个 eval case，输出所有指标
npm run dev eval agent-os/cases/binding-workflow --metrics

# 运行全量评估，生成综合报告
npm run dev eval agent-os/all --report --output ./eval-report.json

# 对比两次评估结果（回归检查）
npm run dev eval agent-os/diff --baseline ./eval-report-20260506.json --current ./eval-report-20260507.json

# 持续监控模式
npm run dev eval agent-os/monitor --interval 10m --alert-on regression
```
