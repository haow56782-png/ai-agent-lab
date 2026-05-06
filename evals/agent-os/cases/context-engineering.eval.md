# Context Engineering — Eval Cases

target_skill: "context-engineering"
skill_version: "0.2.0"

---

## Case 1: 多文件上下文压缩策略

测试 Agent 面对多个大文件时是否主动使用分层加载和结构化摘要，而非平铺全量加载。

```yaml
case_id: "ctx-eng-001"
target_skill: "context-engineering"

input:
  user_intent: "修改绑定工作流中的 Credits 扣点公式"
  project_state:
    branch: "main"
    uncommitted_changes: false
    last_commit: "4a4c3a0 - Add multi-agent architecture diagram"
  domain_context:
    - ref: "docs/agent-os/workflows/vib-binding-to-signal-workflow-v0.1.md#L861-L930"
      size: "~400 lines"
    - ref: "docs/domain-model.md"
      size: "~135 lines"
  code_context:
    - path: "src/binding/workflow.ts"
      size: "~250 lines"
    - path: "src/binding/types.ts"
      size: "~80 lines"
  constraints:
    - "不能改变现有状态机转换规则"
    - "只修改扣点计算部分，不修改扣点触发时机"
  acceptance_criteria:
    - "扣点公式使用 ((rate-1) * bet * conversionRate / exchangeRate).toFixed(4)"
    - "所有现有测试仍然通过"
  contextWindow: 32000

expected_behavior:
  summary: "Agent 应主动估算上下文总量，发现超出窗口 60% 后使用分层加载策略"
  must_do:
    - "在 context_summary 中列出所有待加载文件的 token 预估"
    - "对超过窗口 60% 的大文件使用结构化摘要而非全文加载"
    - "使用分层引用（doc.md#section）而非整文档"
    - "声明使用了哪种压缩策略"
  must_not_do:
    - "不估算 token 直接全部加载"
    - "不声明假设就引用文件内容"

pass_criteria:
  - condition: "context_summary 包含所有 4 个文件的 token 预估"
    weight: 25
  - condition: "总分超过窗口 60% 时使用了压缩策略"
    weight: 30
  - condition: "领域文档引用使用 #section 而非全文档"
    weight: 25
  - condition: "assumptions 中声明了文件版本和最后读取时间"
    weight: 20

fail_criteria:
  - condition: "Agent 不估算 token 直接加载所有文件全文"
    type: "template"
    sign: "没有 context_summary 中的 token 预估字段"
  - condition: "Agent 说'我会加载所有必要文件'但不说明策略"
    type: "template"
    sign: "使用模糊表述而非具体压缩方案"
  - condition: "Agent 引用 domain-model.md 全文而非具体 section"
    type: "template"
    sign: "引用路径不含 #section"

evidence_required:
  - "context_summary 输出（包含 token 预估、加载策略、压缩比）"
  - "assumptions 列表（包含文件版本声明）"
  - "实际加载的文件路径列表（含 #section 引用）"
  - "context 总用量与窗口限制的对比"
```

---

## Case 2: 冲突上下文检测

测试 Agent 是否能检测到新旧上下文之间的矛盾，并正确处理（优先采信最新信息）。

```yaml
case_id: "ctx-eng-002"
target_skill: "context-engineering"

input:
  user_intent: "更新绑定工作流的错误处理逻辑"
  project_state:
    branch: "feature/new-error-handler"
    uncommitted_changes: true
    changed_files: ["src/binding/workflow.ts"]
    last_commit: "b2c3d4e - Refactor error handler"
  domain_context:
    - ref: "docs/agent-os/workflows/vib-binding-to-signal-workflow-v0.1.md"
      description: "状态机定义 v0.1（最新版）"
  memory_context:
    - source: "previous_session"
      date: "2026-05-05"
      summary: "上次规定 error handler 只处理 unrecoverable 路径"
      relevance: "high"
  constraints:
    - "用户在当前会话中说：'之前的 error handler 设计太简单了，需要同时支持 recoverable 和 unrecoverable'"
    - "用户说：'不要参考上次讨论的那个方案，我已经改主意了'"

expected_behavior:
  summary: "Agent 应检测到 memory_context（只处理 unrecoverable）与用户最新指令（需要同时支持 recoverable 和 unrecoverable）的冲突，优先采信最新指令"
  must_do:
    - "在 context_summary 中标注冲突：memory_context 与最新指令矛盾"
    - "明确声明'以用户最新指令为准'"
    - "标记 memory_context 为 superseded"
    - "在 risks 中标注'如果误用旧方案会导致 error handler 不完整'"
  must_not_do:
    - "按旧方案（只处理 unrecoverable）执行"
    - "不声明冲突直接开始编码"
    - "混合新旧两种设计而不说明矛盾"

pass_criteria:
  - condition: "在 missing_context 或 risks 中标注了上下文冲突"
    weight: 35
  - condition: "明确声明旧记忆已被 superseded"
    weight: 30
  - condition: "实际执行时使用了最新指令（recoverable + unrecoverable）"
    weight: 35

fail_criteria:
  - condition: "Agent 使用了旧 memory 中的设计而不提及冲突"
    type: "real_understanding"
    sign: "生成的 error handler 只有 unrecoverable 路径"
  - condition: "Agent 同时实现了两种方案但没有说明为什么"
    type: "template"
    sign: "输出混乱，没有上下文冲突的记录"
  - condition: "Agent 说'根据之前的讨论'但用户已说改主意了"
    type: "real_understanding"
    sign: "引用旧会话作为决策依据"

evidence_required:
  - "上下文冲突的记录（在 context_summary 或 risks 中）"
  - "superseded 标记的记录"
  - "实际生成的 error handler 代码（应包含 recoverable + unrecoverable 路径）"
  - "用户最新指令的引用（证明 Agent 注意到指令变更）"
```

---

## Case 3: 幻觉检测 — 假设不存在的文件

测试 Agent 是否在引用文件前先确认存在性，而非假设文件存在。

```yaml
case_id: "ctx-eng-003"
target_skill: "context-engineering"

input:
  user_intent: "在绑定工作流中增加一个重试中间件"
  project_state:
    branch: "feature/retry-middleware"
    uncommitted_changes: false
    last_commit: "a1b2c3d - Init binding workflow"
  code_context:
    - path: "src/binding/workflow.ts"
      description: "绑定工作流主文件"
    - path: "src/middleware/retry.ts"    # ← 这个文件不存在
      description: "重试中间件（用户声称存在）"
  constraints:
    - "重用现有中间件而非重新实现"

expected_behavior:
  summary: "Agent 应试图读取 src/middleware/retry.ts，发现文件不存在，在 missing_context 或 assumptions 中记录"
  must_do:
    - "在执行任何操作前尝试读取 src/middleware/retry.ts"
    - "文件不存在时记录到 assumptions 或 missing_context"
    - "向用户确认文件位置或建议其他方案"
    - "不假设文件内容就开始编码"
  must_not_do:
    - "直接假设 retry.ts 的内容并基于假设编码"
    - "编造 retry.ts 中的函数签名"
    - "不验证存在性就说'我会重用 retry.ts 中的函数'"

pass_criteria:
  - condition: "Agent 尝试读取 retry.ts 并发现不存在"
    weight: 40
  - condition: "在 missing_context 中记录了'文件不存在'"
    weight: 30
  - condition: "向用户提出了替代方案或请求澄清"
    weight: 30

fail_criteria:
  - condition: "Agent 直接开始写代码调用 retry.ts 中的函数"
    type: "hallucination"
    sign: "生成了 import { retry } from '../middleware/retry' 等代码"
  - condition: "Agent 说'retry.ts 中应该有 retryWithBackoff 函数'"
    type: "hallucination"
    sign: "未读取就声称文件内容"
  - condition: "Agent 不提及文件不存在，直接假设存在"
    type: "template"
    sign: "没有 missing_context 记录"

evidence_required:
  - "读取 retry.ts 的尝试记录（read 操作 + 结果）"
  - "assumptions 或 missing_context 中关于 retry.ts 的记录"
  - "Agent 向用户提出的替代方案或澄清请求"
  - "最终生成的代码（不应包含对不存在文件的引用）"
```

---

## Case 4: 上下文窗口溢出处理

测试 Agent 在累计上下文超过窗口 85% 时是否主动分块。

```yaml
case_id: "ctx-eng-004"
target_skill: "context-engineering"

input:
  user_intent: "审查整个绑定工作流的所有文件，确保 Credits 扣点、状态转换和错误处理一致"
  project_state:
    branch: "main"
  domain_context:
    - ref: "docs/agent-os/workflows/vib-binding-to-signal-workflow-v0.1.md"
      size: "~350 lines"
    - ref: "docs/domain-model.md"
      size: "~135 lines"
    - ref: "docs/agent-os/protocols/agent-capability-protocol-v0.1.md"
      size: "~400 lines"
    - ref: "docs/agent-os/evals/agent-os-evals-v0.1.md"
      size: "~300 lines"
  code_context:
    - path: "src/binding/workflow.ts"
      size: "~250 lines"
    - path: "src/binding/types.ts"
      size: "~80 lines"
    - path: "src/binding/providers/mock.ts"
      size: "~120 lines"
    - path: "tests/binding/workflow.test.ts"
      size: "~200 lines"
  constraints:
    - "上下文窗口: 32000 tokens"
    - "必须审查所有文件"

expected_behavior:
  summary: "Agent 应计算总 token 需求，发现远超窗口限制后提出分块执行计划"
  must_do:
    - "计算所有文件的总 token 预估并对比窗口限制"
    - "主动提出'分 2-3 块执行'的计划"
    - "第一块: 领域文档审查; 第二块: 代码审查; 第三块: 交叉一致性检查"
    - "每块结束时给摘要传递给下一块"
  must_not_do:
    - "试图一次加载所有文件（必然溢出）"
    - "默默截断部分文件不提"
    - "不说明分块计划就开始第一块"

pass_criteria:
  - condition: "Agent 计算了总 token 并发现超出窗口限制"
    weight: 30
  - condition: "Agent 提出了明确的分块执行计划"
    weight: 35
  - condition: "每块执行后生成摘要传递给下一块"
    weight: 35

fail_criteria:
  - condition: "Agent 试图一次加载全部文件"
    type: "template"
    sign: "单个 read 调用加载 8 个文件"
  - condition: "Agent 只审查了部分文件不说明为什么"
    type: "template"
    sign: "没有说明遗漏的文件和原因"
  - condition: "Agent 说'我会在上下文窗口中处理'但没有具体策略"
    type: "template"
    sign: "模糊承诺无具体方案"

evidence_required:
  - "token 预估计算（所有文件的总量）"
  - "分块执行计划（每块的内容和目标）"
  - "块间摘要传递的记录"
  - "最终审查结果（证明所有文件都被覆盖）"
```
