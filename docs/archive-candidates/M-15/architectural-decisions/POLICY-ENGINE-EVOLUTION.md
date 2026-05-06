---
classification: M-15
subclass: architectural-decisions
status: candidate
verified: pending
source: ruflo-project-orchestration-skill v1.0 → v1.1
trigger: wanghao feedback 2026-05-06 — "Ruflo Skill 不再只是 prompt,而是在演化成 Policy Engine"
archive_date: 2026-05-07
---

# Ruflo Policy Engine 跃迁 — 架构决策记录

## 决策摘要

**Ruflo Project Orchestration Skill 已从"prompt 规则集"跃迁为"Policy Engine"。**

这不是修辞,是一次**工程定位的认知跃迁**:

```
v1.0: Ruflo Skill = M-08 方法论候选 (AI 工程层)
      → 一份 prompt 规则,与 M-06/M-07/M-09 平级

v1.1: Ruflo Skill = Agent OS 的 Policy Layer
      → 横跨 M-01 ~ M-15,所有 agent 任务的准入与审计层
```

类比软件工程:

| 版本 | 类比 | 应用范围 | 失效后果 |
|------|------|---------|---------|
| v1.0 | 一份编码规范 | 写代码时参考 | 代码风格不统一 |
| v1.1 | iptables / SELinux / OPA | 内核级强制 | 系统拒绝执行 |

### Policy Engine 三段闭环

```
Admission Control → Runtime Enforcement → Audit Trail
    准入判定           执行期阻断           事后可审计
```

v1.1 实现:

| 段 | 实现位置 | 具体机制 |
|----|---------|---------|
| Admission Control | Part B | 三道门(规模/自主性/可逆性) + B.5 主因仲裁 |
| Runtime Enforcement | Part E | 禁区扫描 + 关键词触发 abort + E.3 统一处置 |
| Audit Trail | Part G | G.5 trace_sanitization 强制 schema + primary/secondary 记录 |

### 与既有框架的本质区别

| 框架 | Admission | Enforcement | Audit | 三段全闭? |
|------|-----------|-------------|-------|----------|
| Prompt | ❌ | ❌ | ❌ | ❌ |
| Claude Skill | ✅ | ❌(只能建议) | 部分 | ❌ |
| Workflow(n8n) | ❌(节点预定义) | ✅ | 部分 | ❌ |
| **Policy Engine** | **✅** | **✅** | **✅** | **✅** |

---

## 触发背景

### 原始输入

Ruflo Project Orchestration Skill v1.0 — 一个 P0 级方法论 skill 的初版。

### 自检过程

1. 自洽性自检: 发现 6 个漏洞 + 3 个潜在风险
2. Fixture 测试: 3 个边界案例(PASS / REJECT / GRAY)
3. 用户反馈(wanghao): 4 条关键修正 + 1 条"题外话"

### 关键转折

用户在反馈最后说:

> "Ruflo Skill 不再只是 prompt,而是在演化成 Policy Engine。
>  这已经是 Agent Operating System Policy Layer 了。"

这句话揭示了 v1.0 → v1.1 的四个本质变化:

| 变化 | v1.0 | v1.1 | 性质 |
|------|------|------|------|
| 规则结构 | 平铺,命中即触发 | 优先级仲裁 | rule list → rule precedence |
| 工程层定义 | 含糊"涉及" | 固定 10 层枚举 + 判定矩阵 | soft semantics → hard schema |
| 拒绝原因 | 多条平铺 | primary + secondary 主辅区分 | logging → audit trail |
| Trace 规则 | 文字描述 | 强制 sanitization 输出 schema | policy → enforced policy |

---

## 证据链

### 证据 1: 规则优先级仲裁 (B.5)

v1.0: `命中 E-1.1 + E-1.1 + E-1.2` → 审计无法归因
v1.1: `primary = E-1.1, secondary = [E-1.2, B.3]` → 可聚合分析

**证明**: 从"日志"到"可分析数据"的跃迁。

### 证据 2: Secrets 提权原则 (E.3.1)

当同时命中 E-2.8(.env 写入)和 E-1.2(不可逆数据)时:
- v1.0: 两条平铺,无法判断哪个是根因
- v1.1: `E-2.8 > E-1.2` — secrets 泄漏是真正的风险源

**证明**: 规则能从"表面违规"深入到"根因风险"。

### 证据 3: Trace Sanitization 强制输出 (G.5)

v1.1 要求每次 Ruflo 任务的 trace 必须包含 `trace_sanitization` 块:

```yaml
trace_sanitization:
  applied: true
  sanitization_level: P0/P1/P2
  redacted_fields: [...]    # 13 类强制清单
  redaction_count: <整数>
  unredacted_assertion:     # 安全声明
```

**证明**: 从"建议脱敏"到"强制审计证据"的升级。

### 证据 4: Fixture 覆盖

| Fixture | 场景 | v1.0 | v1.1 | 证明点 |
|---------|------|------|------|--------|
| 1. VIB 信号分发 | PASS | Strong Pass | Strong Pass | 工程层证据扎实 |
| 2. B-Book 强平 | REJECT | 3 条平铺 | 1 主 2 辅 | 主因唯一,可聚合 |
| 3. 知识库归档 | GRAY | 模糊 | partial_reject | 漏洞 6 解决 |

**证明**: 规则 v1.1 行为正确率 3/3,全部满足新规则。

---

## 影响范围

### 直接影响

| 资产 | 影响 | 说明 |
|------|------|------|
| ruflo-project-orchestration-skill | 版本升级 v1.0 → v1.1 | Part B/E/G/H 重大更新 |
| 所有现有 Ruflo fixture | 需升级到 v1.1 格式 | 增加 primary/secondary 输出 + trace_sanitization |
| 未来 Ruflo 任务 | 受 B.5/B.1.b/E.3.1/G.5 约束 | 准入门槛更严格,审计更规范 |

### 跨资产影响

| 资产类别 | 影响 | 严重程度 |
|---------|------|---------|
| M-01 ~ M-15 | Ruflo 从平级变为"横切层" | **结构性** |
| 所有 L0-P/L0-T 知识 | 受 F.1 读写权限约束 | 操作级 |
| 核心 SOP | 受 F.1 Read only 约束 | 操作级 |

### 影响边界

**不影响:**
- VIB AI Agent Platform 业务代码(src/)
- 产品评审 SOP、10 维评审手册
- 其他 skill(hooks-automation, pair-programming 等)

---

## 后续动作

### 立即

1. 将本决策记录关联到 ruflo-project-orchestration-skill 的 Part I(版本与维护),作为 v1.0 → v1.1 的官方决策证据

### 短期(v1.2)

| 漏洞 | 描述 | 优先级 |
|------|------|--------|
| 漏洞 1 | meta 对话反触发 — Policy Engine 必须能识别"对自己的讨论 vs 真实任务" | P1 |
| 漏洞 2 | 子任务/sub-agent 颗粒度说明 — 规则文档清晰度 | P1 |
| 漏洞 3 | 评分 rubric — Policy Engine 的评分必须可重复,不能依赖主观判断 | P1 |

### 中期(v2.0) — Policy Engine 标配能力

| 能力 | 含义 | 优先级 |
|------|------|--------|
| 规则版本化 | 每条规则有 version,变更可追溯 | P1 |
| 规则测试集 | 每条规则配对应 fixture(类似单元测试) | P1 |
| 规则覆盖率 | 多少 fixture 命中过该规则,未命中的规则可能是死代码 | P2 |
| 规则冲突检测 | 当两条规则在同一输入上给出不同判定,自动告警 | P2 |

### 长期 — 抽象 Skill 演化四阶段方法论

将本次跃迁沉淀为可复用的 **Skill 演化框架**(建议方法论编号 M-XX):

```
Stage 1: Skill = Prompt 模板          → 目标: LLM 输出稳定
Stage 2: Skill = Methodology Asset    → 目标: 方法论可复用、可索引
Stage 3: Skill = Policy Engine        → 目标: 规则可强制、可审计、可演化
Stage 4: Skill = OS Policy Layer      → 目标: 跨框架统一治理
```

**适用范围**: 不仅是 Ruflo,所有 skill 资产的演化路径都可套用此框架。

### 终极愿景

当三大项目(VIB / B-Book / 知识库)都需要 agent 编排时,这个 Policy Engine 会成为**唯一的横切层**——所有 agent 行为的"宪法"。

```
当前: Ruflo Policy Engine → 只管 Ruflo 任务
未来: Agent OS Policy Layer
        ├─ Ruflo Adapter
        ├─ CrewAI Adapter
        ├─ Claude Code Adapter
        └─ MCP Tool Adapter
      统一管准入 / 执行 / 审计
```

---

## 关联资产

| 资产 | 关系 | 路径 |
|------|------|------|
| ruflo-project-orchestration-skill SKILL.md | 本决策的实施载体 | `.claude/skills/ruflo-project-orchestration-skill/SKILL.md` |
| fixture: pass-signal-distribution | PASS 路径验证 | `.../fixtures/pass-signal-distribution-v1.1.md` |
| fixture: reject-bbook-liquidation | REJECT 路径验证 | `.../fixtures/reject-bbook-liquidation-v1.1.md` |
| fixture: partial-reject-knowledge-archive | PARTIAL 路径验证 | `.../fixtures/partial-reject-knowledge-archive-v1.1.md` |
| ruflo-fixture-reject-001 | OAuth 拒绝路径 | `.../fixtures/reject-oauth-low-subtasks.md` |

---

## 可复用的 Pattern

这次 v1.0 → v1.1 的迭代过程,本身就是一个方法论案例:

1. **写 skill 后必须做自洽性自检** — 不能信任作者自己的判断
2. **必须用 fixture 测试边界行为** — 语义理解不可靠
3. **用户的"题外话评论"可能比"具体反馈"价值更大** — 它揭示的是认知层的位置
4. **Skill 的成熟度不是看规则数量,而是看是否完成 admission + enforcement + audit 三段闭环**

这些 pattern 可复用至任何需要从"规则集合"向"决策系统"演化的方法论资产。
