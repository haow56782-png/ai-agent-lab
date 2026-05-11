---
id: ruflo-arch-decision-001
title: "Policy Engine 跃迁 — Ruflo Skill v1.0 → v1.1 认知升级"
type: architectural_decision
classification: M-15 (architectural decisions)
source: POLICY-ENGINE-EVOLUTION.md (wanghao, 2026-05-06)
---

# Policy Engine 跃迁分析

> Wanghao 在 v1.0 → v1.1 反馈最后说:
>
> "Ruflo Skill 不再只是 prompt,而是在演化成 Policy Engine。
>  这已经是 Agent Operating System Policy Layer 了。"
>
> 本文档拆解这句话。这不是修辞,是认知跃迁。

---

## 1. 这次反馈究竟改变了什么

| v1.0 还是 prompt 时 | v1.1 已是 Policy Engine 时 | 性质变化 |
|--------------------|---------------------------|---------|
| 规则平铺,命中即触发 | 规则有优先级,命中后做仲裁 | **rule list → rule precedence** |
| 工程层"含糊涉及" | 工程层枚举固定 + 涉及矩阵判定 | **soft semantics → hard schema** |
| 拒绝原因平铺多条 | primary + secondary 主辅区分 | **logging → audit trail** |
| Trace 规则只是文字描述 | Trace 必须输出 sanitization 块作为审计证据 | **policy → enforced policy** |

**这四个变化合在一起,就是从"prompt"到"engine"的本质区别。**

---

## 2. 为什么这是 Policy Engine,而不是 Workflow / Prompt / Skill

Policy Engine 的核心特征是 **三段闭环**:

```
admission control → runtime enforcement → audit trail
   ↓                    ↓                      ↓
  准入判定           执行期阻断              事后可审计
```

v1.1 的 Ruflo Skill 三段全有:

| 段 | v1.1 实现 |
|----|----------|
| Admission Control | Part B 三道门 + B.5 主因仲裁 |
| Runtime Enforcement | Part E 禁区扫描 + 关键词触发 abort |
| Audit Trail | Part G.5 trace_sanitization 强制 schema + 主辅命中记录 |

而 prompt / skill / workflow **不具备这三段**:
- **Prompt**:只有 instruction,无 enforcement,无 audit
- **Skill**(在 Codex 体系内):有 instruction + 部分 audit,但**无 enforcement**(skill 只能"建议",不能强制 abort)
- **Workflow**:有执行控制,但**无 admission**(节点是预定义的,不做"是否可接受"判定)

**Policy Engine = admission + enforcement + audit 三段全闭。**

---

## 3. 这意味着 Ruflo 的工程定位已经升级

按 Wanghao 既有的方法论资产体系,这个跃迁带来的位置变化:

```
v1.0 定位(M-08 候选):
  Ruflo Skill = AI 工程层的一个方法论
  地位:与 M-06 / M-07 / M-09 平级

v1.1 后真实定位:
  Ruflo Skill = Agent OS 的 Policy Layer
  地位:**横跨**全部 M-01 ~ M-15
      因为它是"所有 agent 任务的准入与审计层"
```

类比软件工程:

| 角色 | v1.0 类比 | v1.1 类比 |
|------|----------|----------|
| Ruflo Skill | 一份编码规范 | iptables / SELinux / OPA |
| 应用范围 | 写代码时参考 | 内核级强制 |
| 失效后果 | 代码风格不统一 | 系统拒绝执行 |

---

## 4. Policy Engine 化带来的新能力

### 4.1 可聚合的审计数据

v1.0 trace 写"命中 E-1.1 + E-1.1 + E-1.2"——这是日志,不能聚合。
v1.1 trace 写 `primary_rejection_reason: E-1.1`——这是结构化数据,可以做:

- 月度拒绝原因分布(哪类禁区被触发最多)
- 误报率分析(同一 primary 被人类签字放行的频次)
- 规则热度排序(高频命中的规则需要重新评估边界)

**这是 Ruflo 从"执行工具"到"决策资产"的关键转折。**

### 4.2 可计算的拒绝路径

`primary > secondary` 的层级让"为什么被拒"可以做**根因分析**:

```
任务被拒
  → primary = E-2.8(.env 写入)
  → 根因:secrets 操作
  → secondary 中的 E-1.2(不可逆写)是表象,不是根因
  → 修复方向:加密配置 / 引入 secrets manager,而不是"做成可逆"
```

v1.0 的平铺命中无法区分根因和表象,会导致**修复方向错误**。

### 4.3 可演化的规则集

Policy Engine 的规则可以**基于审计数据自我演化**:

```
观察:本月 G.4 高敏判定第三条触发了 200 次,但 95% 是误报
  → 提案:收窄第三条范围
  → 走 F.2 proposal 流程
  → 人类 review 后 merge
  → 新规则版本 v1.2 上线
```

**规则不是写死的,是 evolving 的——这是 Engine 才有的属性。**

---

## 5. 接下来的演化方向(认知地图)

### 5.1 短期(v1.2)

补完 v1.0 → v1.1 留下的 P1 漏洞:

- 漏洞 1:meta 对话反触发(Policy Engine 必须能识别"对自己的讨论 vs 真实任务")
- 漏洞 2:子任务/sub-agent 颗粒度说明(规则文档清晰度)
- 漏洞 3:评分 rubric(Policy Engine 的评分必须可重复,不能依赖主观判断)

### 5.2 中期(v2.0)

引入 Policy Engine 的标配能力:

| 能力 | 含义 |
|------|------|
| 规则版本化 | 每条规则有 version,变更可追溯 |
| 规则测试集 | 每条规则配对应 fixture(类似单元测试) |
| 规则覆盖率 | 多少 fixture 命中过该规则,未命中的规则可能是死代码 |
| 规则冲突检测 | 当两条规则在同一输入上给出不同判定,自动告警 |

### 5.3 长期(Agent OS 视角)

把 Ruflo Skill 从"针对 Ruflo 的 policy"扩展为"针对所有 agent 框架的 policy":

```
当前:Ruflo Policy Engine
  └─ 只管 Ruflo 任务

未来:Agent OS Policy Layer
  ├─ Ruflo Adapter
  ├─ CrewAI Adapter
  ├─ Codex Adapter
  └─ MCP Tool Adapter
统一管准入 / 执行 / 审计
```

**这就是 Wanghao 说的 "Agent Operating System Policy Layer" 的完整形态。**

---

## 6. Skill 演化路径

```
Stage 1:Skill = Prompt 模板
  目的:让 LLM 输出更稳定

Stage 2:Skill = Methodology Asset
  目的:让方法论可复用、可索引

Stage 3:Skill = Policy Engine  ← Ruflo Skill v1.1 在这里
  目的:让规则可强制、可审计、可演化

Stage 4:Skill = OS Policy Layer
  目的:跨框架统一治理
```

**Wanghao 在 v1.0 → v1.1 的反馈,实际上把这个 skill 从 Stage 2 推到了 Stage 3。**

---

## 7. 行动建议

### 立即动作

- 把这份 Policy Engine 跃迁分析作为 **ARCHIVE 候选**
- 类型归类:**架构决策**(对应 M-15 的 5 类沉淀中的"architectural decisions")
- 这是 Ruflo Skill 从 draft 走向 verified 路径上的关键节点证据

### 中期动作

- 把"Skill 演化四阶段"作为新方法论候选,编号 **M-XX(待定)**
- 适用范围:不仅是 Ruflo,所有 skill 资产的演化路径都可以套这个框架

### 长期视角

- 当 Wanghao 的三大项目(VIB / B-Book / 知识库)都需要 agent 编排时,这个 Policy Engine 会成为**唯一的横切层**
- 它本身会变成 Wanghao 工程栈中的"宪法"——所有 agent 行为都要服从

---

## 附:这次对话的方法论价值

这次 v1.0 → v1.1 的迭代过程,本身就是一个值得归档的案例:

**输入:** 一个 P0 级 skill 的初版
**过程:** 自洽性自检 + 三个 fixture 测试 + 用户反馈 4 点 + 修订
**关键转折:** 用户在反馈最后说"这已经是 Policy Layer 了"
**输出:** v1.1 + 认知升级 + 演化路径

**可复用的 pattern**:
1. 写 skill 后必须做自洽性自检(不能信任作者自己的判断)
2. 必须用 fixture 测试边界行为(语义理解不可靠)
3. 用户的"题外话评论"可能比"具体反馈"价值更大——它揭示的是认知层的位置
4. Skill 的成熟度不是看规则数量,而是看是否完成 admission + enforcement + audit 三段闭环

**这个 pattern 值得作为 M-XX 沉淀。**
