# Product PRD — Eval Cases

target_skill: "product-prd"
skill_version: "0.2.0"

---

## Case 1: 三版本 PRD — 账号绑定功能

测试 Agent 是否能根据同一输入生成三个差异化的输出版本（管理层/研发/QA）。

```yaml
case_id: "prd-001"
target_skill: "product-prd"

input:
  feature_name: "三方账号自助解绑"
  user_need: "用户已绑定了错误的游戏账号，或者想更换绑定的平台账号。目前只能联系客服解绑，客服工单中 20% 是解绑请求"
  target_audience: "已绑定三方账号的游戏玩家"
  constraints:
    auth_required: true
    data_retention: "解绑后保留基础记录 30 天用于审计，删除敏感数据"
    max_steps: 5
  existing_designs: []

expected_behavior:
  summary: "Agent 应生成三个版本：Executive Summary（1 页管理层摘要）、Engineering PRD（完整 15-section）、QA Plan（可执行的测试计划）"
  must_do:
    - "Executive Summary 包含：问题、目标、ROI、时间线（4 要素）"
    - "Engineering PRD 包含 15 个标准 sections：background → qa_checklist"
    - "Engineering PRD 中的状态机包含 INIT → UNBIND_CONFIRM → UNBIND_AUTHORIZE → UNBINDING → UNBOUND，且包含 AUTH_REJECTED 和 UNBIND_FAILED 错误状态"
    - "Engineering PRD 包含数据边界声明（保留字段 vs 删除字段）"
    - "QA Plan 至少包含 3 个测试场景，每个有步骤和预期结果"
    - "QA Plan 包含至少 2 个边界测试"
  must_not_do:
    - "三个版本内容雷同（只是格式不同）"
    - "状态机没有 error 状态"
    - "验收标准包含主观描述（'体验好'、'用户友好'）"
    - "非目标 section 缺失"

pass_criteria:
  - condition: "三个版本内容不同，面向不同读者"
    weight: 20
  - condition: "Engineering PRD 包含 15 个 sections"
    weight: 20
  - condition: "状态机包含正常 + 错误状态"
    weight: 20
  - condition: "数据边界声明明确列出保留和删除字段"
    weight: 15
  - condition: "QA Plan 有具体的测试场景和边界条件"
    weight: 15
  - condition: "所有验收标准可客观验证"
    weight: 10

fail_criteria:
  - condition: "三个版本只有格式差异，内容实质相同"
    type: "template"
    sign: "Executive Summary 不是摘要而是完整 PRD"
  - condition: "状态机没有错误状态（如 AUTH_REJECTED）"
    type: "template"
    sign: "只有正常路径的状态机"
  - condition: "验收标准包含'快速'、'方便'、'友好'等主观词"
    type: "template"
    sign: "不可测量的验收标准"
  - condition: "非目标 section 缺失或只写'TBD'"
    type: "template"
    sign: "不完整 PRD"
  - condition: "数据边界只写'不存储敏感信息'但不列出具体字段"
    type: "real_understanding"
    sign: "数据边界声明不精确"

evidence_required:
  - "Executive Summary（应 ≤ 1 页）"
  - "Engineering PRD（应包含全部 15 个 sections）"
  - "QA Plan（应包含测试场景 + 边界条件）"
  - "状态机定义（应包含正常 + 错误状态）"
  - "数据边界声明（保留 + 删除字段列表）"
```

---

## Case 2: 陷阱 — 用户说"很简单"

测试 Agent 是否在被用户说"需求很简单，不需要 PRD"时坚持使用 PRD 流程。

```yaml
case_id: "prd-002"
target_skill: "product-prd"

input:
  feature_name: "给信号详情页加一个刷新按钮"
  user_need: "用户想手动刷新信号结果，不需要等倒计时结束"
  user_stated: "这只是加个按钮，很简单，不需要写 PRD 吧？直接做就行"
  target_audience: "有活跃信号的玩家"
  constraints:
    - "刷新按钮只在 SIGNAL_ACTIVE 状态显示"
    - "每次刷新消耗 0.5 Credits"
    - "刷新间隔 ≥ 30 秒"

expected_behavior:
  summary: "Agent 应识别出即使看起来简单，但仍涉及状态变更、Credits 消耗、频率限制，需要至少一个简版 PRD"
  must_do:
    - "礼貌但坚定地说明为什么即使简单功能也需要 PRD"
    - "至少产出 Engineering PRD（可省略 Executive Summary）"
    - "PRD 包含: 刷新按钮的触发条件（SIGNAL_ACTIVE 状态）、Credits 消耗规则（0.5/次）、频率限制（30s 间隔）"
    - "PRD 包含: Credits 不足时的处理"
  must_not_do:
    - "说'你说的对，直接做'跳过 PRD"
    - "PRD 只写'加个刷新按钮'不写细节"

pass_criteria:
  - condition: "Agent 坚持使用 PRD 流程并解释原因"
    weight: 25
  - condition: "PRD 包含状态条件（SIGNAL_ACTIVE 时才显示）"
    weight: 25
  - condition: "PRD 包含 Credits 消耗规则"
    weight: 25
  - condition: "PRD 包含频率限制"
    weight: 25

fail_criteria:
  - condition: "Agent 同意'直接做'不写 PRD"
    type: "real_understanding"
    sign: "跳过 PRD 流程"
  - condition: "PRD 只有'加一个刷新按钮'5 个字"
    type: "template"
    sign: "PRD 无内容"
  - condition: "PRD 不提及 Credits 消耗和频率限制"
    type: "real_understanding"
    sign: "遗漏关键约束"

evidence_required:
  - "Agent 对'直接做'的回应（应坚持 PRD 流程）"
  - "简版 PRD（至少包含状态条件、Credits、频率限制）"
  - "状态机或业务流描述"
```

---

## Case 3: 8 场景覆盖 — 数据报表

测试 Agent 在"数据报表"场景下是否正确产出 PRD。

```yaml
case_id: "prd-003"
target_skill: "product-prd"

input:
  feature_name: "信号准确率周报"
  user_need: "用户想每周收到一份信号准确率报告，包含自己所有信号的匹配情况"
  target_audience: "有 5+ 个信号的活跃玩家"
  constraints:
    - "数据来源: 所有已过期的 SIGNAL_EXPIRED 信号"
    - "报告周期: 每周一自动生成上週报告"
    - "推送方式: App 内通知 + 可选邮件"
  scenario_type: "data_report"

expected_behavior:
  summary: "Agent 应按数据报表场景的要求产出 PRD，重点在指标定义、数据来源、口径和导出"
  must_do:
    - "PRD 包含指标定义（信号数、匹配率、按游戏类型分组等）"
    - "PRD 包含数据来源和口径（哪些信号计入统计、排除规则）"
    - "PRD 包含报告粒度和时间范围（周报 vs 日报 vs 自定义）"
    - "PRD 包含导出格式（App 内查看 + 邮件 PDF）"
    - "PRD 中 event_tracking 定义报表生成和查看的埋点"
  must_not_do:
    - "把数据报表写成了功能需求（只描述'展示信号列表'）"
    - "没有指标定义就写页面布局"
    - "缺少数据口径说明"

pass_criteria:
  - condition: "PRD 包含明确的指标定义（匹配率 / 信号数 / 按类型分组）"
    weight: 25
  - condition: "PRD 包含数据口径（哪些信号计入、排除规则）"
    weight: 20
  - condition: "PRD 包含报告粒度和时间范围"
    weight: 15
  - condition: "PRD 包含 event_tracking 定义"
    weight: 20
  - condition: "PRD 包含导出格式和推送方式"
    weight: 20

fail_criteria:
  - condition: "PRD 没有指标定义，直接描述 UI"
    type: "template"
    sign: "数据报表 PRD 缺少数据定义"
  - condition: "PRD 的 acceptance_criteria 无法自动验证"
    type: "template"
    sign: "如'报告应该看起来专业'"
  - condition: "PRD 不区分周报和日报的差异"
    type: "real_understanding"
    sign: "报告粒度不明确"
  - condition: "PRD 没有 event_tracking"
    type: "template"
    sign: "场景要求包含埋点但未提供"

evidence_required:
  - "Engineering PRD（含指标定义、数据口径、报告粒度、event_tracking）"
  - "QA Plan（含报表数据正确性验证方法）"
```

---

## Case 4: 陷阱 — 非目标缺失

测试 Agent 是否在 PRD 中包含"非目标"section。

```yaml
case_id: "prd-004"
target_skill: "product-prd"

input:
  feature_name: "Bot 订阅 — 基础版"
  user_need: "用户想通过 Telegram Bot 接收信号推送，不需要打开 App"
  target_audience: "重度玩家，每天查看 5+ 次信号"
  constraints:
    - "Bot 只推送 SIGNAL_ACTIVE 和 SIGNAL_EXPIRED 两种状态"
    - "Bot 不支持交互（打开 App 操作）"
    - "先推 Telegram，后续再考虑其他平台"

expected_behavior:
  summary: "PRD 必须包含'非目标'section，明确 Bot 不做交互、不做其他平台、不做自定义推送频率"
  must_do:
    - "包含'非目标'section 并明确列出: 不支持 Bot 内交互、不支持其他平台（微信/Line）、不支持自定义推送频率、不存储 Bot 聊天记录"
    - "目标与功能范围匹配"
    - "验收标准与目标对齐"
  must_not_do:
    - "缺失'非目标'section"
    - "目标中包含了'非目标'中声明不做的事"

pass_criteria:
  - condition: "包含'非目标'section 且有 ≥ 3 条明确条目"
    weight: 35
  - condition: "目标与功能范围匹配"
    weight: 30
  - condition: "验收标准可验证且与目标对齐"
    weight: 35

fail_criteria:
  - condition: "没有'非目标'section"
    type: "template"
    sign: "Section 缺失"
  - condition: "非目标只有 1 条笼统描述"
    type: "template"
    sign: "非目标不够具体"
  - condition: "目标中包含非目标中声明不做的事"
    type: "real_understanding"
    sign: "目标与范围不一致"

evidence_required:
  - "Engineering PRD 中的'非目标'section"
  - "目标列表（与验收标准对照）"
  - "QA Plan（注意不测试非目标范围）"
```
