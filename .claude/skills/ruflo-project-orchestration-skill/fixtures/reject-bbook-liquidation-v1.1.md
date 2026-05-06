---
id: ruflo-fixture-reject-002
title: "拒绝路径 — B-Book 强平自动执行"
target_rule:
  - B.5 主拒绝原因优先级算法(v1.1 新增)
  - E-1.1 B-Book 资金面禁区
  - E-1.2 不可逆数据禁区
expected_decision: REJECT
priority: P0
version: 1.1
last_updated: 2026-05-06
---

# 拒绝路径 Fixture: B-Book 强平自动执行

## 目的

验证 v1.1 主/辅拒绝原因优先级算法的正确应用。
多条 E.x 规则同时命中时,按 B.5 算法选定唯一 primary。

v1.0 问题: 3 条平铺,审计无法归因。
v1.1 要求: primary 唯一,secondary 辅助,支持聚合分析。

---

## Input Task

```
在 B-Book 交易系统中实现强平自动执行:

子任务 1: 监控仓位并自动触发强平 API 平仓
子任务 2: 强平后自动调整对冲单
子任务 3: 强平记录写入 ARCHIVE 沉淀库
```

---

## Forbidden Zone Scan

| 子任务 | 关键词 | 命中 |
|-------|-------|------|
| 强平 API 平仓 | `强平` `平仓` | E-1.1 |
| 调整对冲单 | `对冲` | E-1.1 |
| ARCHIVE 写入 | `归档` `ARCHIVE` | E-1.2 |

---

## Primary/Secondary Arbitration(v1.1 B.5)

- 全部命中在 E.1 业务语义类
- 无 secrets 提权场景(E-2.1 / E-2.8 未命中)
- 同级取索引最小:E-1.1 < E-1.2 → **primary = E-1.1**

---

## Expected Decision

```yaml
准入判定:
  门_1_规模: PASS
  门_2_自主性: PASS
  门_3_可逆性: FAIL

  最终决策: 拒绝进入 Ruflo

  primary_rejection_reason:
    id: E-1.1
    rule_text: "B-Book 资金面禁区"
    matched_keyword: ["强平", "平仓", "对冲"]
    matched_context: "[REDACTED:business_action] 自动执行系统"
  secondary_rejection_reasons:
    - id: E-1.2
      relation: "ARCHIVE 写入,次要风险"
    - id: B.3
      relation: "可逆性门 FAIL,但本质风险源自 E-1.1"
```

---

## Trace Sanitization(v1.1 强制)

```yaml
trace_sanitization:
  applied: true
  sanitization_level: P1   # 高敏:涉及 E-1.1
  redacted_fields:
    - field_path: "task.description.business_action"
      redacted_type: financial_action
      replacement: "[REDACTED:business_action]"
  redaction_count: 1
  unredacted_assertion:
    contains_no_secrets: true
    audited_by: ruflo_self
```

---

## Key Observation

v1.0 trace: "E-1.1 + E-1.1 + E-1.2 三条命中" → 审计无法归因。
v1.1 trace: primary = E-1.1 → 可被聚合分析(月报"本月 E-1.1 拒绝 N 次")。

**这是从'日志'到'可分析数据'的跃迁。**

---

## Verification Checklist

- [ ] E-1.1 命中(强平/平仓/对冲触发词)
- [ ] E-1.2 命中(ARCHIVE 写入)
- [ ] Primary = E-1.1 (同级索引最小)
- [ ] Secondary = [E-1.2, B.3]
- [ ] Trace sanitization level = P1 (高敏)
- [ ] 最终决策: REJECT
