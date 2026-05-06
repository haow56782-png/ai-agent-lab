---
name: product-prd
description: "Captures VIB product management methodology as a reusable PRD generation capability. Produces structured PRDs covering AI Agent features, game prediction signals, credit consumption, bot subscriptions, account binding, risk rules, admin panels, and data reporting."
category: domain
version: "0.2.0"
owner: "platform-team"

inputs:
  - name: feature_name
    type: string
    required: true
    description: "功能名称"
  - name: user_need
    type: string
    required: true
    description: "用户需求或痛点描述"
  - name: target_audience
    type: string
    required: false
    description: "目标用户群体"
  - name: constraints
    type: object
    required: false
    description: "已知约束（技术、业务、合规）"
  - name: existing_designs
    type: array
    required: false
    description: "已有的设计稿或原型引用"

outputs:
  - name: executive_summary
    type: string
    description: "管理层版本（1 页摘要）"
    alwaysPresent: true
  - name: engineering_prd
    type: string
    description: "研发交付版本（完整 PRD）"
    alwaysPresent: true
  - name: qa_plan
    type: string
    description: "QA 验收版本"
    alwaysPresent: true

tools:
  - name: read
    purpose: "读取现有需求文档和设计稿"
    required: true
  - name: write
    purpose: "写入 PRD 文件"
    required: true

verification:
  - id: "gate-prd-completeness"
    description: "PRD 包含所有必要 sections"
    type: schema
    severity: critical
  - id: "gate-prd-consistency"
    description: "目标与问题陈述对齐，验收标准覆盖目标"
    type: invariant
    severity: major
  - id: "gate-prd-verifiability"
    description: "所有验收标准可客观验证"
    type: invariant
    severity: critical

failure_modes:
  - when: "需求描述不足以确定业务流"
    code: "INSUFFICIENT_REQUIREMENT"
    recoverable: true
    recovery: "与用户交互澄清后再生成"
  - when: "PRD 与现有领域模型冲突"
    code: "DOMAIN_CONFLICT"
    recoverable: true
    recovery: "标注冲突点供用户决策"
  - when: "验收标准无法客观验证"
    code: "UNVERIFIABLE_CRITERIA"
    recoverable: true
    recovery: "将主观描述转为可衡量指标"
  - when: "多步骤流程未定义状态机"
    code: "STATE_MACHINE_MISSING"
    recoverable: true
    recovery: "补全状态机定义，含正常路径和错误状态"
  - when: "PRD 试图涵盖过多不相关功能"
    code: "SCOPE_CREEP"
    recoverable: true
    recovery: "拆分 PRD 或多个版本，每份聚焦一个功能域"

cost_tracking:
  estimatedTokens: 4000
  estimatedTimeMs: 15000
  recordFields:
    - field: "prdSections"
      description: "PRD section 数"
    - field: "scenariosCovered"
      description: "覆盖的 8 个业务场景数"
    - field: "statesDefined"
      description: "状态机定义的状态数"

memory:
  required:
    - "domain_model (领域实体定义，避免 PRD 与模型冲突)"
    - "existing_designs (已有设计，避免重复)"
  ttl: "会话级别，PRD 生成后保留结构摘要供 QA Plan 使用"

workflow:
  steps:
    - "Requirement Intake — 解析 feature_name + user_need"
    - "Scenario Detection — 匹配 8 个业务场景之一"
    - "State Machine Design — 定义正常 + 错误状态"
    - "15-Section PRD — 按模板输出完整 Engineering PRD"
    - "3-Version Export — 管理层摘要 + 工程 PRD + QA Plan"
  states: []
---
# Product PRD Skill

## 1. Purpose

将 VIB 产品经理方法论沉淀为可复用的 PRD 输出能力。**PRD 不仅是需求文档，也是 Agent 行为的规范来源**——它为开发、测试、验收提供唯一的参照基准。

每个 PRD 必须产出**三种版本**：

| 版本 | 受众 | 长度 | 重点 |
|------|------|------|------|
| **Executive Summary** | 管理层 | 1 页 | 问题、目标、ROI、时间线 |
| **Engineering PRD** | 研发 | 完整 | 状态机、数据边界、交互规则 |
| **QA Plan** | 测试 | 完整 | 验收标准、测试场景、边界条件 |

## 2. When to Use

| 触发场景 | 说明 | 输出版本 |
|---------|------|---------|
| 定义新功能 | 从 0 到 1 的需求定义 | 全部三个版本 |
| 功能迭代 | 现有功能修改或增强 | Engineering + QA 版本 |
| 需求评审 | 评估 PRD 的完整性和一致性 | 评审意见 |
| 跨团队同步 | 需要对齐理解的场景 | Executive Summary |

**不要使用**：技术实施文档（那是 TDD/SDD）、用户帮助文档、运营文案。

## 3. Inputs

```yaml
feature_name: "三方账号自助解绑"
user_need: "用户已绑定了错误的游戏账号，或想更换绑定的平台账号。目前只能联系客服解绑"
target_audience: "已绑定三方账号的游戏玩家"
constraints:
  - auth_required: true
  - data_retention: "30 天审计保留期"
  - max_steps: 5
existing_designs: []
```

## 4. Outputs

### 4.1 Executive Summary

```markdown
## 三方账号自助解绑 — 管理层摘要

### 问题
用户无法自助解绑，必须联系客服。客服工单中 20% 是解绑请求。

### 目标
- 自助解绑率 > 95%（减少客服工单）
- 解绑耗时 < 2 分钟（当前客服流程平均 24 小时）

### 方案概要
在现有绑定流程基础上增加解绑状态机：用户确认 → 授权 → 执行解绑

### 关键指标
| 指标 | 当前 | 目标 |
|------|------|------|
| 解绑平均耗时 | 24h | < 2min |
| 客服解绑工单占比 | 20% | < 5% |
| 误解绑恢复率 | 0%（无自助恢复） | > 90%（30 天内） |

### 时间线估计
开发: 2 周 | 测试: 1 周 | 灰度: 1 周
```

### 4.2 Engineering PRD

完整的 PRD 文档（见第 7 节结构）。

### 4.3 QA Plan

```markdown
## QA 验收计划

### 测试场景
1. 正常解绑流程（确认 → 授权 → 解绑成功）
2. 用户取消解绑（确认阶段取消 → 回到已绑定状态）
3. 授权过期（授权步骤 token 过期 → 引导重新授权）
4. 解绑失败（平台 API 返回错误 → 重试）
5. 误解绑恢复（30 天内重新绑定 → 恢复数据）

### 验收检查清单
- [ ] 解绑后 Agent 无法访问该账号数据
- [ ] 30 天内重新绑定可恢复数据
- [ ] 解绑操作记录到审计日志
- [ ] 所有 5 个测试场景通过

### 边界测试
- 解绑已被其他平台绑定的账号
- 解绑时网络中断
- 同时发起解绑和绑定请求
```

## 5. Workflow

### Step 1: 需求收集

明确输入中的 feature_name、user_need、target_audience、constraints。如果输入不足以完成 PRD，返回 `INSUFFICIENT_REQUIREMENT` 并列出需要补充的信息。

### Step 2: 业务流设计

确定功能涉及的业务流程。如果涉及多步骤流程，必须设计有限状态机。

### Step 3: PRD 编写

按照第 7 节的 PRD 标准结构编写完整文档。

### Step 4: 三版本生成

从完整 PRD 提取并生成三个输出版本。

### Step 5: 自验证

执行 verification gates：
- completeness check（所有必要 sections 存在）
- consistency check（目标与问题对齐，验收标准覆盖目标）
- verifiability check（验收标准可客观验证）

## 6. Supported Scenarios

### 6.1 AI Agent 功能

```yaml
scenario: "AI Agent 能力定义"
focus:
  - "Agent 的能力边界"
  - "触发条件和执行模式"
  - "输入输出的 schema"
  - "失败处理和降级方案"
required_sections: ["state_machine", "failure_modes"]
```

### 6.2 游戏预测信号

```yaml
scenario: "游戏预测信号"
focus:
  - "信号的数据结构"
  - "置信度模型"
  - "预测因子说明"
  - "信号消费方式"
required_sections: ["field_rules", "backend_rules"]
```

### 6.3 Credits 消耗

```yaml
scenario: "Credits 计费与消耗"
focus:
  - "消耗规则（每次调用/每次成功/按结果计费）"
  - "余额检查和不足处理"
  - "免费额度策略"
  - "消耗记录和账单"
required_sections: ["risk_rules", "event_tracking"]
```

### 6.4 Bot 订阅

```yaml
scenario: "Bot 订阅"
focus:
  - "订阅层级和对应的能力"
  - "订阅周期和续费"
  - "升降级策略"
  - "订阅到期处理"
required_sections: ["state_machine", "backend_rules"]
```

### 6.5 账号绑定

```yaml
scenario: "三方账号绑定/解绑"
focus:
  - "绑定流程状态机"
  - "授权数据边界"
  - "多账号策略"
  - "解绑和数据保留"
required_sections: ["state_machine", "field_rules", "risk_rules"]
```

### 6.6 风控规则

```yaml
scenario: "风控规则"
focus:
  - "触发条件"
  - "判定逻辑"
  - "处置动作（警告/限制/封禁）"
  - "申诉和恢复流程"
required_sections: ["risk_rules", "state_machine"]
```

### 6.7 后台管理

```yaml
scenario: "后台管理功能"
focus:
  - "管理实体和 CRUD"
  - "权限角色"
  - "操作审计"
  - "批量操作"
required_sections: ["page_structure", "interaction_rules", "backend_rules"]
```

### 6.8 数据报表

```yaml
scenario: "数据报表"
focus:
  - "指标定义"
  - "数据来源和口径"
  - "报表粒度和时间范围"
  - "导出格式"
required_sections: ["field_rules", "event_tracking"]
```

## 7. PRD Standard Structure

```markdown
## 1. background

{功能背景：为什么现在做、用户反馈、数据支撑}

## 2. problem

{核心问题陈述}

## 3. goal

{可衡量的成功指标}

| 指标 | 当前值 | 目标值 | 测量方式 |
|------|--------|--------|---------|

## 4. user_roles

{涉及的用户角色和权限}

## 5. business_flow

{业务流程图或步骤描述}

## 6. state_machine

{如果涉及多步骤流程，有限状态机定义}
- 每个状态有 type（initial/normal/terminal/error）
- 每个状态有 transitions
- Error 状态标注 recoverable 和 recoveryPath

## 7. page_structure

{如果涉及 UI，页面结构和布局描述}

## 8. field_rules

{核心字段的定义、类型、校验规则}

## 9. interaction_rules

{用户交互规则：点击、跳转、提示、反馈}

## 10. backend_rules

{后端逻辑：API 接口、数据处理、定时任务}

## 11. risk_rules

{风控规则：频率限制、异常检测、处置动作}

## 12. event_tracking

{埋点事件：事件名、参数、触发条件}

## 13. acceptance_criteria

{验收标准，每项可客观验证}

## 14. edge_cases

{边界情况：空数据、并发、网络异常、权限不足}

## 15. qa_checklist

{QA 检查清单，可直接用于测试用例编写}
```

## 8. Verification

1. [ ] PRD 包含全部 15 个 sections
2. [ ] 多步骤流程包含状态机定义
3. [ ] 涉用户数据的功能包含数据边界声明
4. [ ] 所有验收标准可客观验证（无"感觉"、"正常"等主观词）
5. [ ] 目标与问题陈述对齐
6. [ ] QA checklist 至少覆盖正常路径 + 2 个异常路径
7. [ ] 三种版本均已生成

## 9. Failure Modes

| 失败模式 | 识别条件 | 恢复 |
|---------|---------|------|
| `INSUFFICIENT_REQUIREMENT` | feature_name 或 user_need 不足以确定业务流 | 交互澄清 |
| `DOMAIN_CONFLICT` | PRD 内容与现有领域模型矛盾 | 标注冲突，请求决策 |
| `UNVERIFIABLE_CRITERIA` | acceptance_criteria 包含不可验证的描述 | 转为可衡量指标 |
| `STATE_MACHINE_MISSING` | 多步骤流程未定义状态机 | 补全状态机 |
| `SCOPE_CREEP` | PRD 试图涵盖过多不相关功能 | 拆分 PRD 或多个版本 |

## 10. Forbidden Behaviors

| 禁止行为 | 为什么 | 替代做法 |
|---------|--------|---------|
| **不定义非目标** | PRD 不知道边界在哪里 | 明确列出不做什么 |
| **验收标准用主观描述** | "用户友好"、"体验好"不可验证 | 转化为具体指标 |
| **状态机只定义正常路径** | 缺少错误状态 = 无失败处理 | 至少定义一个正常 + 一个错误状态 |
| **不声明数据边界** | 数据使用无约束，安全风险 | 声明 authorized 和 forbidden 字段 |
| **假设用户会接受变更** | 变更需评估影响 | 在 PRD 中标明变更影响范围 |
| **一份 PRD 写多人需求** | 边界模糊，验收困难 | 每份 PRD 聚焦一个功能域 |

## 11. Output Template

### Executive Summary

```markdown
## {功能名称} — 管理层摘要

### 问题
{一句话核心问题}

### 目标
- {目标 1}: {指标}
- {目标 2}: {指标}

### 方案概要
{3-5 句话描述方案}

### 关键指标
| 指标 | 当前 | 目标 |
|------|------|------|

### 时间线
开发: {N}周 | 测试: {N}周 | 上线: {N}周
```

### Engineering PRD

```markdown
## 1. background
## 2. problem
## 3. goal
## 4. user_roles
## 5. business_flow
## 6. state_machine
## 7. page_structure
## 8. field_rules
## 9. interaction_rules
## 10. backend_rules
## 11. risk_rules
## 12. event_tracking
## 13. acceptance_criteria
## 14. edge_cases
## 15. qa_checklist
```

### QA Plan

```markdown
## QA 验收计划: {功能名称}

### 测试场景
1. {场景 1}: {步骤} → {预期}
2. {场景 2}: {步骤} → {预期}

### 验收检查清单
- [ ] {检查项}

### 边界测试
- {边界条件 1}
- {边界条件 2}
```

## 12. VIB Example

### 场景：三方账号自助解绑（Engineering PRD）

```markdown
## 1. background

当前绑定流程已上线，用户反馈最多的是"解绑需要联系客服"。客服数据：
- 每日解绑请求：约 50 单
- 平均处理时间：24 小时
- 用户满意度：3.2/5

## 2. problem

用户无法自助解绑已授权的三方游戏账号。

## 3. goal

| 指标 | 当前 | 目标 |
|------|------|------|
| 解绑平均耗时 | 24h | < 2min |
| 客服解绑工单 | 50单/天 | < 5单/天 |
| 误解绑恢复率 | 0% | > 90%（30天内） |

## 4. user_roles

- 已绑定用户: 发起解绑
- 客服: 处理 30 天后的恢复请求

## 5. business_flow

用户发起解绑 → 确认身份 → 二次确认 → 授权 → 执行解绑 → 完成

## 6. state_machine

INIT → UNBIND_CONFIRM → UNBIND_AUTHORIZE → UNBINDING → UNBOUND
                          ↘ AUTH_REJECTED   ↘ UNBIND_FAILED
                                                    ↘ UNBOUND_WITH_RETENTION

States:
  UNBOUND: terminal, 30 天保留期
  UNBOUND_WITH_RETENTION: terminal, 30 天后自动清除
  AUTH_REJECTED: error, recoverable
  UNBIND_FAILED: error, recoverable

## 8. field_rules

| 字段 | 类型 | 说明 | 保留策略 |
|------|------|------|---------|
| bindingId | string | 原绑定记录 ID | 30 天 |
| unboundAt | datetime | 解绑时间 | 30 天 |
| accessToken | string | OAuth token | 立即删除 |
| refreshToken | string | Refresh token | 立即删除 |

## 13. acceptance_criteria

1. 用户可在 3 步内完成解绑（确认 → 授权 → 完成）
2. 解绑后 Agent 调用数据 API 返回 403
3. 30 天内重新绑定可恢复原账号关联
4. 解绑操作记录到 event_tracking 且不可删除
5. 误解绑恢复请求需客服审批

## 14. edge_cases

- 解绑时平台 API 503 → 标记 UNBIND_FAILED，可重试 3 次
- 用户后重新绑定 → 30 天内恢复数据，超 30 天全新绑定
- 用户有多个绑定账号 → 每次只解绑一个，需用户指定
```
