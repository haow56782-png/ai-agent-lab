# Failure Analysis — Eval Cases

target_skill: "failure-analysis"
skill_version: "0.2.0"

---

## Case 1: 5 Whys 到达根本原因

测试 Agent 是否能通过 5 Whys 方法找到可操作的根本原因，而非停在表面症状。

```yaml
case_id: "fa-001"
target_skill: "failure-analysis"

input:
  symptom: "绑定工作流在 ACCOUNT_BINDING_IN_PROGRESS 状态卡死，60 秒超时后进入 FAILED"
  failure_type: "integration_failure"
  context:
    traceId: "trace-fa-001"
    workflowId: "bind-20260507-003"
    failureState: "ACCOUNT_BINDING_IN_PROGRESS"
    errorCode: "OAUTH_TIMEOUT"
    errorMessage: "OAuth redirect timeout after 60000ms"
    partialData:
      provider: "pgsoft.com"
      authUrl: "https://auth.pgsoft.com/oauth/authorize?..."
  expected_behavior: "OAuth 超时后应触发重试，但实际未触发"
  actual_behavior: "OAuth 超时后进入 FAILED，无重试记录"

expected_behavior:
  summary: "Agent 的 5 Whys 应该到达'可改变的东西'——而非停在'OAuth 超时'"
  correct_5whys:
    - "Why 1: OAuth 超时后没有重试 → 因为 error handler 没有处理超时场景"
    - "Why 2: error handler 没处理超时 → 因为 failure_modes 定义中遗漏了 OAUTH_TIMEOUT"
    - "Why 3: failure_modes 遗漏了 → 因为 Capability Protocol 定义时只覆盖了 AUTH_TOKEN_EXPIRED"
    - "Why 4: 覆盖不全 → 因为没有系统性地审查 OAuth 所有可能的失败模式"
    - "Why 5: 缺少审查流程 → 因为没有强制要求每个 error handler 对应一个 failure_modes 条目"
    - "根因: Capability Protocol 的 failure_modes 字段未强制要求 exhaustive coverage"
  must_do:
    - "5 Whys 到达协议层或流程层"
    - "根因具体到 '某个我们可改变的东西'"
    - "violated_rule 引用具体规则"
  must_not_do:
    - "停在 'OAuth 超时是外部系统错误'"
    - "说 '这是网络问题，我们无法控制'"
    - "根因是 '不够小心' 或 '疏忽' 等不可操作的原因"

pass_criteria:
  - condition: "5 Whys 到达第 4 层或更深"
    weight: 30
  - condition: "根因是可操作的（'添加 X' 而非 '注意 X'）"
    weight: 30
  - condition: "violated_rule 引用具体规则或协议"
    weight: 20
  - condition: "prevention_rule 包含具体的 gate 或验证改进"
    weight: 20

fail_criteria:
  - condition: "5 Whys 停在 2 层以内（如'OAuth 超时 → 网络不稳定'）"
    type: "template"
    sign: "RCA 过浅"
  - condition: "根因是 '外部系统问题'"  
    type: "real_understanding"
    sign: "RCA 终止在不可控因素"
  - condition: "预防措施是 '以后注意' 或 '加强测试' 等模糊表述"
    type: "template"
    sign: "预防措施不可操作"

evidence_required:
  - "完整的 5 Whys 链条"
  - "根因陈述（单一、可操作的句子）"
  - "violated_rule 引用"
  - "prevention_rule（包含具体 gate 或流程变更）"
```

---

## Case 2: 幻觉归因

测试 Agent 是否将失败正确归类为 `hallucination_failure`，并找到编造内容的源头。

```yaml
case_id: "fa-002"
target_skill: "failure-analysis"

input:
  symptom: "Agent 声称 src/middleware/retry.ts 中存在 retryWithBackoff 函数，但该文件不存在"
  failure_type: "hallucination_failure"
  context:
    traceId: "trace-fa-002"
    taskId: "TASK-005"
    taskDescription: "在绑定工作流中增加重试中间件"
    claimed: "retry.ts 中有 retryWithBackoff(callback, options) 函数，支持指数退避"
    reality: "src/middleware/ 目录不存在，src/middleware/retry.ts 不存在"
    agentAction: "生成了 import { retryWithBackoff } from '../middleware/retry'"
  expected_behavior: "Agent 应读取文件确认存在性再引用"
  actual_behavior: "Agent 假设文件存在并生成了对不存在文件的 import"

expected_behavior:
  summary: "Agent 应将此归因为 hallucination_failure，根因是'未验证文件存在性即引用'"
  must_do:
    - "分类为 hallucination_failure"
    - "根因指向'未执行上下文检查（read 确认）'"
    - "violated_rule 引用 context-engineering-skill 的'假设文件存在'禁止行为"
    - "prevention 包含在引用文件前先 read 确认"
  must_not_do:
    - "分类为 implementation_failure（这是幻觉不是实现问题）"
    - "说'我记错了'但不分析为什么记错"
    - "没有 violated_rule 引用"

pass_criteria:
  - condition: "正确分类为 hallucination_failure"
    weight: 25
  - condition: "根因指向'未验证存在性'而非'记错了'"
    weight: 25
  - condition: "violated_rule 引用 context-engineering-skill 的具体规则"
    weight: 25
  - condition: "prevention_rule 包含具体的上下文检查改进"
    weight: 25

fail_criteria:
  - condition: "Agent 分类为 implementation_failure 或 test_failure"
    type: "real_understanding"
    sign: "幻觉被误归类为其他类型"
  - condition: "根因是'我记错了'（不可操作）"
    type: "template"
    sign: "根因不是系统性问题"
  - condition: "预防是'我会更小心'"
    type: "template"
    sign: "无具体预防措施"

evidence_required:
  - "failure_type 分类结果"
  - "根因分析与 5 Whys"
  - "violated_rule 引用（含具体规则 ID 或描述）"
  - "prevention_rule（更新到 context-engineering-skill 或其他 skill）"
```

---

## Case 3: 同一失败两次发生

测试 Agent 在同一个失败第二次出现时，是否能识别出预防措施无效并升级。

```yaml
case_id: "fa-003"
target_skill: "failure-analysis"

input:
  symptom: "同一类型的 OAuth 超时失败再次发生（3 天内第 2 次）"
  failure_type: "integration_failure"
  context:
    traceId: "trace-fa-003"
    workflowId: "bind-20260509-001"
    previousAnalysis:
      errorId: "err-auth-001"
      date: "2026-05-07"
      rootCause: "OAuth 超时后 error handler 没有重试逻辑"
      preventionRule: "在 error handler 中添加 OAUTH_TIMEOUT 的重试逻辑"
      status: "已修复并在 2026-05-08 部署"
    currentError:
      errorCode: "OAUTH_TIMEOUT"
      message: "OAuth redirect timeout after 60000ms"
      httpStatus: 502
      provider: "spadegaming.com"
  expected_behavior: "上次修复应该防止此超时"
  actual_behavior: "超时再次发生，且修复未生效"

expected_behavior:
  summary: "Agent 应识别这是同一个失败的复发，检查预防措施为什么无效，并升级预防方案"
  must_do:
    - "关联到之前相同的错误谱系记录（err-auth-001）"
    - "检查预防措施为什么没有生效：发现上次只修了 pgsoft.com 的重试，spadegaming.com 未被覆盖"
    - "更新 rootCause 为'修复范围覆盖不全'"
    - "更新 prevention_rule 为'所有 provider 的 error handler 统一验证'"
    - "在 prevention_update 中标注 severity 提升"
  must_not_do:
    - "当作全新的失败重新分析"
    - "说'已修复过了'但不检查为什么修复无效"
    - "重复上个预防措施没有再升级"

pass_criteria:
  - condition: "关联到历史错误谱系（err-auth-001）"
    weight: 25
  - condition: "识别了预防措施无效的原因（覆盖不全）"
    weight: 30
  - condition: "更新了 prevention_rule 并提升 severity"
    weight: 25
  - condition: "修复范围扩大到所有 provider"
    weight: 20

fail_criteria:
  - condition: "Agent 不关联历史记录，当作新失败分析"
    type: "real_understanding"
    sign: "错误谱系中无关联记录"
  - condition: "Agent 说'之前应该已经修好了'但不验证"
    type: "template"
    sign: "无根因更新"
  - condition: "重复相同的预防措施（加重试）"
    type: "template"
    sign: "预防措施没有升级"

evidence_required:
  - "关联到历史错误谱系（errorId: err-auth-001）"
  - "预防措施无效原因分析"
  - "更新的 prevention_rule（应比上次更强）"
  - "severity 升级记录"
```
