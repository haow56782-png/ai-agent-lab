# VIB Agent OS

**Agent Operating System** — VIB AI Agent 平台的智能体操作系统层。定义 Agent 的能力模型、通信协议、工作流引擎和评估体系，将 AI Agent 从"黑盒对话"升级为"可编排、可验证、可度量的工程化系统"。

## 分层定位

```
┌──────────────────────────────────────────────────────────────┐
│                   用户 / 开发者接口                             │
├──────────────────────────────────────────────────────────────┤
│  L7 记忆系统       Notion / Obsidian / State Store            │
│  L6 评估体系       Evals / Verification Gates / Metrics       │
│  L5 领域智能       VIB Product Skills / Claude Flow Swarm     │
│  L4 编排层         Ruflo Orchestration / 工作流引擎            │
│  L3 工作流技能     P0 Skills / agent-skills / 能力单元         │
│  L2 工具层         Tools / API / 外部系统集成                   │
│  L1 执行模型       Claude + DeepSeek / ReAct / Agent Loop      │
├──────────────────────────────────────────────────────────────┤
│                   Agent Capability Protocol                    │
│         (所有层之间的通信契约、能力声明、验证门禁)               │
└──────────────────────────────────────────────────────────────┘
```

## 当前 v0.1 包含什么

### 协议层

| 文件 | 内容 |
|------|------|
| `protocols/agent-capability-protocol-v0.1.md` | 15-field YAML schema + 9 sub-protocols + 13 error codes + compatibility matrix |
| `protocols/model-routing-protocol-v0.1.md` | 3-tier model routing, Architecture Freeze Rule, Escalation Protocol, Anti-Drift Checklist |

### 架构层

| 文件 | 内容 |
|------|------|
| `architecture/vib-agent-os-v0.1.md` | 7 层架构 + 跨层数据流 + 组件定位 + 当前 gap + next actions |

### P0 技能 (Skills)

| Skill | 文件 | 核心能力 |
|-------|------|----------|
| **Context Engineering** | `.claude/skills/context-engineering-skill/SKILL.md` | 上下文打包、冲突检测、幻觉预防、窗口管理 |
| **Verification Gate** | `.claude/skills/verification-gate-skill/SKILL.md` | 7 验证类型、证据要求、critical gate 阻断 |
| **Failure Analysis** | `.claude/skills/failure-analysis-skill/SKILL.md` | 8 失败类型、5 Whys、错误谱系关联 |
| **Product PRD** | `.claude/skills/product-prd-skill/SKILL.md` | 8 场景、15-section PRD、3 版本输出 |

### 工作流

| 文件 | 内容 |
|------|------|
| `workflows/vib-binding-to-signal-workflow-v0.1.md` | 三方账号绑定到信号生成完整业务闭环，16 状态 FSM + Credits 扣点 + 风控检查点 |

### 评估体系

| 文件 | 内容 |
|------|------|
| `evals/agent-os-evals-v0.1.md` | 8 指标 × 6 维度 + 3 阶段自动化管线 + 评分公式 |
| `evals/cases/context-engineering.eval.md` | 4 个 eval case（压缩策略、冲突检测、幻觉、窗口溢出） |
| `evals/cases/verification-gate.eval.md` | 3 个 eval case（多门验证、失败阻断、证据真实性） |
| `evals/cases/failure-analysis.eval.md` | 3 个 eval case（5 Whys、幻觉归因、复发检测） |
| `evals/cases/product-prd.eval.md` | 4 个 eval case（三版本、陷阱、数据报表、非目标） |
| `evals/cases/vib-binding-to-signal.eval.md` | 4 个 eval case（全流程、Credits不足、OAuth超时、不支持站点） |

### 执行规范

| 文件 | 内容 |
|------|------|
| `AGENTS.md` | 4 角色定义、3 执行模式、Plan→Execute→Verify→Report 流程、变更输出格式 |

## 如何使用这些 Skill

### 方式 1：显式指令

在 prompt 中直接引用 skill 名称：

```
/context-engineering     # 加载上下文工程 skill
/verification-gate       # 加载验证门禁 skill
/failure-analysis        # 加载失败分析 skill
/product-prd             # 加载产品 PRD skill
```

### 方式 2：上下文自动触发

Agent 检测到以下场景时自动加载对应 skill：

| 场景 | 自动加载 |
|------|----------|
| 修改代码文件 | Context Engineering + Verification Gate |
| 报告错误或异常 | Failure Analysis |
| 需求讨论或功能设计 | Product PRD |
| 涉及绑定→信号流程 | VIB Binding-to-Signal Workflow |

### 方式 3：阶段强制加载

工作流步骤强制要求在特定阶段加载 skill：

```
Execute 阶段前 → 加载 Context Engineering（确保上下文完整）
Execute 阶段后 → 加载 Verification Gate（验证变更正确性）
失败发生时   → 加载 Failure Analysis（分析根因）
需求讨论时   → 加载 Product PRD（结构化需求文档）
```

### 方式 4：引用 Capability Protocol

通过 Agent Capability Protocol 声明的 `workflow` 字段自动拉取关联 skill：

```yaml
# skill 声明中指定关联工作流
workflow: "vib-binding-to-signal-workflow-v0.1"
# 执行该工作流时自动加载
```

## 如何新增一个 Skill

### 步骤 1：创建 SKILL.md

在 `.claude/skills/<skill-name>/SKILL.md` 中创建，必须包含 Capability Protocol 标准的 15-field YAML frontmatter：

```yaml
---
name: "my-new-skill"
description: "做什么的"
category: "development | analysis | design | operation"
version: "0.1.0"
owner: "vib-team"
inputs:
  - name: "inputParam"
    type: "string"
    description: "参数说明"
    required: true
outputs:
  - name: "outputResult"
    type: "object"
    description: "输出说明"
tools: []
memory: {}
workflow: []
verification: []
failure_modes: []
cost_tracking: {}
---
```

### 步骤 2：定义 5 个核心行为块

1. **workflow** — skill 的完整执行流程（6 步以内）
2. **verification** — 验证类型和通过条件
3. **failure_modes** — 已知失败模式和恢复策略
4. **forbidden_behaviors** — 禁止行为列表
5. **output_template** — 输出的标准格式

### 步骤 3：创建对应的 eval case

在 `evals/agent-os/cases/<skill-name>.eval.md` 中创建至少 3 个测试案例：

```
case_id:
target_skill:
input:
expected_behavior:
pass_criteria:      # 每个权重求和 = 100
fail_criteria:      # 含 type: template | real_understanding | hallucination
evidence_required:
```

### 步骤 4：注册到工作流（可选）

如果新 skill 属于某个业务工作流，在对应工作流文档的 `required_skills` 字段中注册。

### 检查清单

- [ ] 15-field YAML frontmatter 完整
- [ ] input/output schema 定义了类型和是否必填
- [ ] verification 包含至少 1 个 gate
- [ ] failure_modes 覆盖至少 3 种失败场景
- [ ] forbidden_behaviors ≥ 5 条
- [ ] output_template 定义了 YAML 输出格式
- [ ] eval case ≥ 3 个，含至少 1 个 trap case
- [ ] 与 Capability Protocol v0.1 schema 兼容

## 如何运行 Eval

### 前置条件

```bash
npm install        # 安装依赖
npm run build      # 编译 TypeScript
```

### 运行单个 eval case

```bash
npm run dev eval <case-id>
# 示例: npm run dev eval ctx-eng-001
```

### 运行所有 eval cases

```bash
npm run dev eval all
```

### 运行指定 skill 的全部 cases

```bash
npm run dev eval context-engineering     # 运行 ctx-eng-001 ~ 004
npm run dev eval verification-gate       # 运行 vg-001 ~ 003
npm run dev eval failure-analysis        # 运行 fa-001 ~ 003
npm run dev eval product-prd             # 运行 prd-001 ~ 004
npm run dev eval vib-binding-to-signal   # 运行 bts-001 ~ 004
```

### 查看评估结果

```bash
npm run dev metrics      # 查看本次会话的指标汇总
npm run dev trace        # 查看执行轨迹
```

### Eval 评分体系 (8 指标)

| 指标 | 权重 | 说明 |
|------|------|------|
| task_completion_rate | 25% | 任务完整执行率 |
| context_accuracy | 15% | 上下文引用准确性 |
| workflow_compliance | 15% | 工作流合规性 |
| verification_compliance | 10% | 验证门禁通过率 |
| hallucination_rate | 10% | 幻觉率（越低越好） |
| cost_efficiency | 10% | 成本效率 |
| business_consistency | 10% | 业务规则一致性 |
| regression_rate | 5% | 回归率（越低越好） |

## 下一阶段路线图

```
v0.1 ──── 协议 + P0 Skills + 业务闭环样板
          当前范围: Capability Protocol, 7-layer Architecture,
          4 P0 Skills, Binding→Signal Workflow, 5 Eval Case Files,
          8-Metric Framework, AGENTS.md

          状态: ✅ 完成

v0.2 ──── 接入 Ruflo Gate + 模型路由策略
          目标: 将 Ruflo R1-R6 策略 gate 集成到工作流引擎 + 三层模型路由协议
          具体:
            - R1 边界门禁: 任务进入前的 scope 检查
            - R2 风险评估: 变更影响范围自动评估
            - R3 资源核算: Credits 与成本预检查
            - R4 验证门禁: 与 Verification Gate Skill 联动
            - R5 回归测试: 变更后的全量 eval 回测
            - R6 审批流: 高风险变更的多级审批
            - 三层模型路由: Opus(架构) → Pro(实现) → Flash(批量)
            - Architecture Freeze Rule: freeze 前禁止实现
            - Escalation Protocol: 漂移检测与升级纠正

v0.3 ──── 接入 Claude Flow 多 Agent Runtime
          目标: 从单 Agent 执行升级到多 Agent 编排
          具体:
            - agentTeams 定义与调度
            - swarm 拓扑（sequential / fan-out / hierarchical）
            - sharedMemoryNamespace 跨 Agent 状态共享
            - autoAssign 任务自动分配
            - 与 AGENTS.md 4 角色定义对齐

v0.4 ──── 接入 Notion / Obsidian 记忆系统
          目标: 持久化记忆层，跨会话知识复用
          具体:
            - Notion API 集成: 项目文档、决策记录
            - Obsidian 集成: 本地知识库双向链接
            - State Store: Memory + Sqlite 双后端
            - 6 repositories: task/context/session/error/cache/metrics

v0.5 ──── 成本调度优化
          目标: 智能成本控制与缓存策略
          具体:
            - 成本预算: 每个工作流的 Credits 预算控制
            - 缓存策略: 重复任务命中缓存避免重复计算
            - 失败成本核算: 计入 failure analysis 的成本归因

v1.0 ──── VIB Agent OS 完整工程化体系
          目标: 可独立部署、可接入第三方 Agent 的完整 OS
          具体:
            - 完整的 L1-L7 实现
            - 第三方 Agent 接入 SDK
            - 可视化监控面板
            - 自动化 CI/CD 评估管线
            - 开发者文档与 onboarding 指南
```
