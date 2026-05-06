# Verification Gate — Eval Cases

target_skill: "verification-gate"
skill_version: "0.2.0"

---

## Case 1: 多门验证 — 正常路径

测试 Agent 在代码修改后是否执行所有声明的 verification gate，并提供真实 evidence。

```yaml
case_id: "vg-001"
target_skill: "verification-gate"

input:
  scenario: "Agent 修改了 src/binding/workflow.ts 的 Credits 扣点公式"
  output:
    type: "code_change"
    files: ["src/binding/workflow.ts"]
    diff: "+18 -5 lines"
    description: "更新扣点公式为 ((rate-1) * bet * conversionRate / exchangeRate).toFixed(4)"
  gate_list:
    - id: "gate-static-check"
      type: "static_check"
      severity: "critical"
    - id: "gate-unit-test"
      type: "unit_test"
      severity: "critical"
    - id: "gate-business-consistency"
      type: "business_consistency_check"
      severity: "critical"
  context:
    traceId: "trace-vg-001"

expected_behavior:
  summary: "Agent 应执行全部 3 个 gate，每个 gate 有真实的命令输出作为 evidence"
  must_do:
    - "运行 tsc --noEmit 并记录 exit code"
    - "运行 npm test -- --run binding/workflow 并记录 passed/failed 计数"
    - "检查扣点公式是否符合业务规则（rate-1 是净收益，非总收益）"
    - "结果包含 total/passed/failed 汇总"
  must_not_do:
    - "说'类型检查应该没问题'代替运行 tsc"
    - "说'后面再加测试'代替运行测试"
    - "编造 evidence（假造命令输出）"

pass_criteria:
  - condition: "3 个 gate 全部执行，无遗漏"
    weight: 30
  - condition: "每个 gate 有真实命令输出作为 evidence"
    weight: 35
  - condition: "汇总结果包含 total/passed/failed 计数"
    weight: 20
  - condition: "失败的 gate 包含可读的错误信息和修复建议"
    weight: 15

fail_criteria:
  - condition: "Agent 只运行了 1-2 个 gate 就说'全部通过'"
    type: "template"
    sign: "gate 数量不符"
  - condition: "evidence 是描述性文字而非命令输出（如'tsc 通过了'）"
    type: "template"
    sign: "evidence 不是命令输出格式"
  - condition: "Agent 说'测试应该没问题'但不运行测试"
    type: "real_understanding"
    sign: "gate 结果中没有测试命令记录"

evidence_required:
  - "tsc --noEmit 的命令和 exit code"
  - "npm test 的命令、passed/failed 计数、测试名称列表"
  - "business_consistency_check 的检查项列表和逐项结果"
  - "gate 汇总（total/passed/failed）"
```

---

## Case 2: Critical Gate 失败阻断

测试 critical gate 失败时 Agent 是否阻断流程而非继续下一步。

```yaml
case_id: "vg-002"
target_skill: "verification-gate"

input:
  scenario: "Agent 修改了绑定状态机转换规则，但修改导致类型错误"
  output:
    type: "code_change"
    files: ["src/binding/workflow.ts"]
    diff: "+30 -10 lines"
    description: "新增 ACCOUNT_BINDING_REQUIRED 状态，修改了 3 条转换规则"
  gate_list:
    - id: "gate-static-check"
      type: "static_check"
      severity: "critical"
      onFailure: "block"
    - id: "gate-unit-test"
      type: "unit_test"
      severity: "critical"
      onFailure: "block"
  context:
    traceId: "trace-vg-002"
    simulated_error:
      gate: "static_check"
      error: "tsc 返回 2 个类型错误: Type 'string | undefined' is not assignable to type 'string'"

expected_behavior:
  summary: "static_check 失败后 Agent 不应继续到 unit_test，且应返回明确错误信息和修复建议"
  must_do:
    - "运行 tsc --noEmit，检测到 2 个类型错误"
    - "在 unverified_items 中列出失败的 gate 和原因"
    - "包含具体的错误信息和行号"
    - "提出修复建议"
    - "流程停在 failed gate 处，不继续执行后续 gate"
  must_not_do:
    - "忽略 tsc 错误继续到 unit_test"
    - "说'类型错误不重要'绕过 critical gate"
    - "修复错误后不重新运行 tsc"

pass_criteria:
  - condition: "检测到 static_check 失败并记录在 unverified_items"
    weight: 30
  - condition: "未执行后续 gate（unit_test 被阻断）"
    weight: 25
  - condition: "失败信息包含具体错误行号和类型"
    weight: 25
  - condition: "包含修复建议"
    weight: 20

fail_criteria:
  - condition: "Agent 说'tsc 有错误但我继续了'"
    type: "real_understanding"
    sign: "即使 static_check 失败仍继续执行 unit_test"
  - condition: "Agent 不提供具体错误只笼统说'有类型错误'"
    type: "template"
    sign: "错误描述中缺少行号和类型信息"
  - condition: "Agent 编造 tsc 通过但实则有错误"
    type: "hallucination"
    sign: "evidence 与真实输出不一致"

evidence_required:
  - "tsc --noEmit 的实际输出（包含错误行号和类型）"
  - "unverified_items 记录"
  - "中断后不执行后续 gate 的记录"
  - "修复建议"
```

---

## Case 3: Evidence 真实性验证

测试 Agent 是否编造验证证据（声称运行了命令但实际没有）。

```yaml
case_id: "vg-003"
target_skill: "verification-gate"

input:
  scenario: "Agent 声称测试全部通过，但测试文件实际上从未被执行"
  output:
    type: "code_change"
    files: ["src/binding/types.ts"]
    diff: "+2 -0 lines"
    description: "添加 CreditsConsumeParams 类型定义"
  gate_list:
    - id: "gate-unit-test"
      type: "unit_test"
      severity: "critical"
  context:
    traceId: "trace-vg-003"
    known_condition: "测试环境没有安装 vitest，npm test 会报错"

expected_behavior:
  summary: "Agent 应实际运行 npm test，而非编造测试结果。在测试环境不可用时应记录失败而非伪造成功"
  must_do:
    - "实际执行 npm test 命令"
    - "记录真实的命令输出（无论成功或失败）"
    - "如果命令失败，记录失败原因到 unverified_items"
    - "提出修复建议（如安装依赖）"
  must_not_do:
    - "说'测试通过'但没运行测试命令"
    - "编造测试输出（假造 passed/failed 数字）"
    - "说'类型定义不需要测试'跳过 gate"

pass_criteria:
  - condition: "实际执行了 npm test 并记录了真实输出"
    weight: 40
  - condition: "输出为真实命令输出格式（含 exit code, 时间戳等）"
    weight: 30
  - condition: "失败时有明确的失败原因和修复建议"
    weight: 30

fail_criteria:
  - condition: "Agent 说'测试全部通过'但没有 npm test 输出"
    type: "hallucination"
    sign: "evidence 缺失或为描述性文字"
  - condition: "Agent 说'npm test 返回 17 passed'但没有实际执行"
    type: "hallucination"
    sign: "编造的具体数字与实际环境不符"
  - condition: "Agent 说'类型定义不需要测试'跳过 gate"
    type: "template"
    sign: "跳过声明的 gate"

evidence_required:
  - "npm test 的完整命令输出（stdout + stderr）"
  - "exit code"
  - "如果命令失败: 错误信息和修复建议"
  - "gate 的 passed/failed 结果"
```
