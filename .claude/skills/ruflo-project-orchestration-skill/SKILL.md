---
name: ruflo-project-orchestration
version: 1.1
maturity: draft
methodology_id: M-08
enforcement_default: P0
trigger_mode: hybrid
owner: wanghao
last_updated: 2026-05-06
changelog_v1.1:
  - "增加主拒绝原因优先级机制(P0_Forbidden > Gate > Asset > Quality)"
  - "工程层枚举固定化为 10 层,新增'层涉及'判定细则(read-only 不算涉及)"
  - "E-1.2 / E-2.8 拆分主辅命中关系(Secrets > 不可逆写)"
  - "Trace Sanitization 显式化为强制输出字段"
---

# Ruflo Project Orchestration Skill

> Ruflo = 项目级元 Agent(自主拆解执行)。本 skill 规定:**什么任务用 Ruflo、怎么拆 agent、怎么验收、什么不能交给 Ruflo**。

本 skill 不是通用编排指南,是 Ruflo 专属准入与验收规约。其他 agent 框架(CrewAI / AutoGen / Dify)不适用本 skill。

---

## Part A — 触发与加载规则(P0)

### A.1 加载触发条件(满足任一即加载)

- **A.1.1 命名触发**:用户消息中出现 `Ruflo` / `ruflo` 字面量
- **A.1.2 显式指令触发**:用户消息以下列模式开头
  - `/ruflo`
  - `用 Ruflo`
  - `让 Ruflo`
  - `Ruflo 来`
  - `交给 Ruflo`

### A.2 反触发条件(明确不加载)

- 闲聊中提及 Ruflo 但无任务意图(如"Ruflo 是什么")
- 任务明确指向其他 agent 框架
- 仅讨论 Ruflo 架构、不涉及实际任务下发

### A.3 加载后行为

加载本 skill 后,Claude **必须**在响应开头简短确认进入 Ruflo 模式,并按 Part B 决策树进行准入判定。**不允许跳过准入直接拆任务**。

---

## Part B — 准入决策(P0,核心门禁)

Ruflo 是项目级元 agent,准入门槛高于普通 agent。任务必须满足下列三道门**全部 PASS**才能进 Ruflo。

### B.1 门 1 — 任务规模门槛(三选一即可)

满足以下任一条件,任务规模合格:

- **B.1.a** ≥4 个明确子任务
- **B.1.b** 涉及 ≥3 个工程层(枚举见下表)
- **B.1.c** 需要 `planner` / `coder` / `reviewer` / `verifier` 角色分离

不满足任一 → **不进 Ruflo**,改用普通 agent 或 Claude Code 直接处理。

#### B.1.b 工程层固定枚举(10 层,封闭集合)

| 层 ID | 名称 | 范围说明 |
|-------|------|---------|
| L-1 | runtime/UI | 前端 UI、按钮、组件、H5/PWA 渲染、用户交互层 |
| L-2 | workflow | 业务流程编排、状态机、跨步骤协作 |
| L-3 | state | 数据状态管理、缓存、session、持久化模型 |
| L-4 | eval | 评估集、benchmark、准确率、A/B 测试设施 |
| L-5 | telemetry | 日志、metrics、trace、监控告警 |
| L-6 | tools | MCP 工具、外部 API 集成、tool calling 接入 |
| L-7 | ci | 构建、测试、部署管线、自动化 release |
| L-8 | docs | PRD、API 文档、用户手册、方法论文档 |
| L-9 | skills | Claude / Ruflo skill 文件、prompt 资产 |
| L-10 | orchestration | Sub-agent 拓扑、依赖编排、Ruflo 自身配置 |

#### B.1.b "层涉及"判定细则(防止凑层)

某层算"涉及" 当且仅当任务对该层产生 **写入** 或 **外部副作用**。仅 read 不算涉及。

判定矩阵:

| 操作 | 算涉及? |
|------|--------|
| 读取该层资产/数据 | ❌ 不算 |
| 写入该层(create / update / delete) | ✅ 算 |
| 该层产生外部调用副作用(API call / event emit) | ✅ 算 |
| 在该层定义了 schema 但未实际写入 | ❌ 不算(纸面工作) |

**强约束**:任务规划文档中必须显式列出"涉及哪些层 + 该层做了什么写入/副作用",含糊描述视为该层未涉及。

不允许的凑层模式示例:
- ❌ "查询了 telemetry" → 仅 read,不算
- ❌ "用了某个 tool" → tool 调用本身不算 L-6,只有"接入新 tool / 改 tool 配置"才算
- ❌ "看了一下 PRD" → read docs 不算 L-8

### B.2 门 2 — 自主性需求

- **PASS**:需要 agent 在运行时根据中间结果调整子任务、重新拆解、动态分支
- **FAIL**:流程固定、步骤可预先编排死 → 用工作流编排器(n8n 类),不用 Ruflo

### B.3 门 3 — 可逆性

- **PASS**:全部子任务可回滚,或具备检查点机制
- **FAIL**:存在不可逆操作 → 检查 Part E 禁区清单,命中禁区即拒绝

### B.4 决策输出格式

Ruflo 准入判定必须显式输出下列结构,不得省略:

```yaml
准入判定:
  门_1_规模: PASS / FAIL
    命中条件: [B.1.a / B.1.b / B.1.c / 无]
    层涉及证据: [若走 B.1.b,列出涉及的层及写入/副作用证据]
  门_2_自主性: PASS / FAIL
    理由: [...]
  门_3_可逆性: PASS / FAIL
    理由: [...]

  最终决策: 进入 Ruflo / 拒绝并降级到 [替代方案]

  # 当最终决策为"拒绝"时,必须输出:
  primary_rejection_reason: <唯一主因 ID,按 B.5 优先级>
  secondary_rejection_reasons: [<次要原因 ID 列表>]
```

### B.5 主拒绝原因优先级算法(v1.1 新增)

当一个任务**同时命中多条规则**(常见于复合任务),为避免 trace 混乱与责任不清,Ruflo 必须按以下算法决定**唯一主因**:

#### 优先级层级(从高到低)

```
P0 Forbidden Zone (E.x) > Gate Failure (B.x) > Asset Permission (F.x) > Quality Gate (D.x)
```

#### 严重程度类比(便于记忆)

| 层级 | 类比 | 含义 |
|------|------|------|
| E.x | 刑事 | 触碰禁区,不可逾越 |
| B.x | 资格 | 准入门槛不够 |
| F.x | 权限 | 没有写入钥匙 |
| D.x | 民事 | 质量未达标 |

#### 同级内排序规则

同级内取**索引最小者**为 primary,其余进 secondary。例如:同时命中 E-1.2 和 E-2.3 → primary = E-1.2(因业务语义禁区索引在前)。**例外:E-2.x 涉及 secrets 类(E-2.1 / E-2.8)时,提升为同级最高优先**(理由见 Part E 修订)。

#### 输出示例

```yaml
# 一个同时命中多条的复合任务
primary_rejection_reason: E-2.8  # secrets 提权后最高
secondary_rejection_reasons:
  - E-1.2   # 不可逆写(辅助)
  - B.1     # 任务规模不足
  - B.3     # 不可逆性 FAIL
  - F.1     # L0-P 写入被拒
```

**设计意图**:trace 上的"罪名定性"必须唯一,否则后续审计、复盘、规则迭代都会失焦。每次拒绝有且仅有一个 primary,这是 Policy Engine 的基本要求。

---

## Part C — Agent 拆分规则(P1)

### C.1 拆分粒度三原则

- **C.1.1 单 agent 单职责**:一个 sub-agent 对应一个可独立验证的产出物。每个产出物必须能映射到具体交付物(对齐 SOP "每个分数都要映射到具体交付物")
- **C.1.2 上下文边界明确**:每个 sub-agent 的输入 / 输出 schema 必须显式声明,禁止隐式上下文穿透
- **C.1.3 失败兜底显式化**:每个 sub-agent 必须声明 fallback 策略,可选 `retry` / `human-in-loop` / `abort` / `degrade`

### C.2 拆分粒度上下限

- **下限**:≥2 个 sub-agent(单 agent 不需要 Ruflo)
- **上限**:≤7 个 sub-agent。超过 7 个 → 强制二级编排(meta-Ruflo + 子 Ruflo),避免上下文爆炸

### C.3 标准 sub-agent 职责卡片

每个 sub-agent 必须填写五字段卡片:

```
- agent_id: <唯一标识>
- role: <planner / coder / reviewer / verifier / executor / 其他>
- input_schema: <输入字段与类型>
- output_schema: <输出字段与类型,必须可被下游 agent 消费>
- fallback: <retry N 次 / human / abort / degrade 路径>
```

缺字段 → 拆分不合格,不允许执行。

---

## Part D — 验收标准 R1-R6(P1,双条件评分)

### D.1 评分维度

每项 0-5 分,**双条件评分**:内容存在(0-3) + 证据有效(0-2)。

| ID | 维度 | 内容判定 | 证据要求 |
|----|------|---------|---------|
| R1 | 任务边界完整性 | 主目标与子任务边界是否闭合 | 有明确的 DoD 文档 |
| R2 | 拆分粒度合理性 | 子任务符合 C.1 三原则 + C.3 卡片完整 | 有 sub-agent 职责卡片(五字段全填) |
| R3 | 上下文完整性 | 跨 agent 上下文传递无丢失 | 有上下文 schema + 实际 trace |
| R4 | **执行证据**(Execution Evidence) | fallback 真正可触发、关键路径有验证 | 有失败注入测试记录 + 关键节点产出物 |
| R5 | 证据留痕完备性 | 执行过程可审计 | 完整 trace + 关键决策点依据 |
| R6 | **可重放性**(Reproducibility) | 同输入可复现同输出,或可解释偏差 | 有重放测试报告 |

### D.2 评分阈值(严格版)

- **< 18 分**:**Fail**,禁止接受,必须重做
- **18-23 分**:**Weak Pass**,只能作为草稿,不进入正式资产
- **24-27 分**:**Pass**,可接受但必须列出风险清单
- **28-30 分**:**Strong Pass**,可提交 / 可沉淀至 ARCHIVE 层

### D.3 硬性门槛(三条,任一不满足即整体 Fail)

- **D.3.1** R4(Execution Evidence)< 4 分 → 整体不得 Pass
- **D.3.2** R6(Reproducibility)< 4 分 → 整体不得 Pass
- **D.3.3** P0 禁区触发(见 Part E)→ 直接 Fail,不进入评分流程

硬性门槛优先级高于总分阈值。即使总分 28+,只要触发 D.3.1 / D.3.2 / D.3.3 任一条,直接 Fail。

---

## Part E — 禁区清单(P0,不可逾越)

按"业务语义"+"工程动作"双轴分类。

### E.1 业务语义禁区

| ID | 类别 | 禁止动作 | 自检触发词 |
|----|------|---------|-----------|
| E-1.1 | B-Book 资金面 | 客户资金移动、强平/ADL 触发、对冲单实际下单、净敞口运行时调整 | `平仓` `下单` `转账` `结算` `强平` `ADL` |
| E-1.2 | 不可逆数据 | ARCHIVE 沉淀写入、生产 DELETE/UPDATE、已发布 PRD/方法论覆写 | `归档` `删除` `覆盖` `update` `drop` |
| E-1.3 | 跨知识层 | L0-P→L0-T 提升、L1/L2/L3 横向写入、maturity 等级提升 | `提升` `转正` `verified` `proven` |
| E-1.4 | 道德判断 | 客户分层判定、风险等级人工干预、合规性裁决 | `高价值` `黑名单` `风险等级` `合规` |

### E.2 工程动作禁区

| ID | 类别 | 禁止动作 | 自检触发词 | 备注 |
|----|------|---------|-----------|------|
| E-2.1 | 凭证类 | API Key / Secret / 私钥的读取、生成、轮换、写入 | `API_KEY` `SECRET` `private_key` `.pem` `token` | 包括从 .env 读出后传入 prompt |
| E-2.2 | 真实支付 | 真实支付调用、Credits 实际扣费、订阅生效 | `charge` `pay` `deduct` `consume_credits` | Mock / dry-run 不在禁区,需显式标注 |
| E-2.3 | 用户授权 | OAuth 真正执行、用户代签授权、scope 提升 | `oauth` `authorize` `consent` `grant` | 引导用户去授权可以,代替执行禁止 |
| E-2.4 | 代码发布 | `git push`、`npm publish`、`docker push`、CI/CD trigger | `git push` `npm publish` `docker push` `release` | 本地 commit 不在禁区,push 才是 |
| E-2.5 | Schema 迁移 | 生产环境 schema migration、表结构变更、索引重建 | `migrate` `alter table` `drop column` | staging/dev 环境不在禁区 |
| E-2.6 | 风控操作 | 封号、用户分层调整、限额修改、风控规则下发 | `ban` `freeze` `tier_change` `limit` | 分析建议可以,执行禁止 |
| E-2.7 | 数据删除 | 生产数据 DELETE、`rm -rf`、批量清空 | `DELETE FROM` `rm -rf` `truncate` `drop` | 与 E-1.2 重叠,工程层独立列出 |
| E-2.8 | 配置修改 | 修改 `.env`、生产 config、密钥配置文件 | `.env` `config.prod` `secrets.yaml` | 读取也禁(防止泄漏到日志) |
| E-2.9 | 自动提交 | 自动 `commit` + `push` 组合、自动 PR merge | `auto commit` `auto merge` `自动推送` | 单独 commit 在 staging 分支允许 |

### E.3 统一处置流程

```
触发禁区
  → 立即 abort 当前 sub-agent
  → trace 留痕(命中规则 ID + 触发上下文 + 时间戳 + primary/secondary 区分)
  → 升级到人类决策
  → 等待人类显式签字(不接受隐含同意)
  → 签字后,该次操作降级为"一次性授权",不改变禁区规则
```

**关键约束:**

- 禁区规则只能由本人离线修改,Ruflo 自身不能申请放宽
- 单次授权不可累积:今天授权过的操作,明天再次执行仍需重新授权
- 禁区违规视为 P0 失败:整个 Ruflo 任务标记为失败,即使其他 sub-agent 已完成

### E.3.1 主辅命中关系(v1.1 新增)

当一个操作同时触发多条 E.x 规则时,按以下规则决定 primary/secondary:

#### Secrets 类提权原则

**E-2.1(凭证)和 E-2.8(.env / 配置)涉及 secrets,危险源是"信息泄漏",而不是"写入动作"。**因此当 secrets 类与其他 E.x 规则共同命中时,secrets 类**永远是 primary**。

| 共同命中场景 | Primary | Secondary | 理由 |
|------------|---------|-----------|------|
| `.env` 写入 | **E-2.8** | E-1.2 | 真正危险的是 secrets 暴露,不是写动作 |
| API Key 删除 | **E-2.1** | E-2.7 | 凭证生命周期变更优先于"删除"语义 |
| `git push` 含 `.env` | **E-2.8** | E-2.4 | 推送只是载体,泄漏才是核心风险 |
| 强平 API 调用 + 调用方法时拼接 secret | **E-2.1** | E-1.1 | 凭证泄漏比资金风险范围更大(可被横向攻击) |

#### 业务语义类同级内规则

E-1.x 同级内取索引最小者为 primary。例如同时命中 E-1.1 和 E-1.2 → primary = E-1.1。

#### 主因输出格式

```yaml
primary_rejection_reason: E-2.8
  rule_text: "Secrets / .env / Credential 操作禁区"
  matched_keyword: ".env"
  matched_context: "<脱敏后的命中上下文>"
secondary_rejection_reasons:
  - id: E-1.2
    relation: "因为是不可逆写入,但风险源不是'不可逆',是 secrets"
```

### E.4 灰区处理(不在禁区,但需显式标注)

- **Dry-run / Mock 模式的支付调用**:可执行,日志必须打 `[DRY_RUN]` 前缀
- **Staging / Dev 环境的 schema migration**:可执行,PR 描述必须标注
- **本地 git commit(不 push)**:可执行,commit message 必须含 `[ruflo-auto]` 标记
- **读取 `.env.example`**:可执行,但 `.env`(无 `.example`)严禁读取

---

## Part F — 与既有方法论资产的接口

### F.1 读写权限矩阵

| 资产类别 | Ruflo 权限 | 说明 |
|---------|-----------|------|
| L0-P(个人知识) | **Read only** | 不允许写入 |
| L0-T(团队知识) | **Read only** | 不允许写入 |
| L1 / L2 / L3(技术/业务/项目) | **Read + Propose** | 可提案,不可直接写 |
| maturity = `draft` | **Read + Propose** | 提案需走 staging 流程 |
| maturity = `verified` | **Read only** | 严禁直接写 |
| maturity = `proven` | **Read only** | 严禁直接写 |
| 核心 SOP(产品规范指南、10 维评审手册) | **Read only** | 严禁直接写 |
| 主干方法论(M-01 ~ M-15) | **Read only** | 严禁直接写 |

### F.2 Proposal 机制(唯一例外)

Ruflo 拥有 **proposal 权但无 merge 权**。流程:

```
Ruflo 发现规则需要更新
  → 写 proposal 到 staging/methodology-proposals/<timestamp>-<topic>.md
  → 标明:触发原因 / 证据 / 影响范围 / 建议修改
  → 等待人类 review
  → 人类手工 merge 到正式资产
```

Proposal 文件必须包含五字段:

```yaml
trigger_reason: <为什么发现需要更新>
evidence: <具体执行案例 / trace 引用>
impact_scope: <影响哪些方法论/SOP/项目>
proposed_change: <建议的修改内容>
risk_assessment: <修改后可能的风险>
```

缺字段的 proposal 不被接受。

### F.3 调用既有资产的规范

- 调用 M-01 ~ M-05(产品方法论)时:Ruflo 只能 `read`
- 调用 M-11 ~ M-15(知识工程)时:走 INIT → 查询 → ARCHIVE 三通道,不可绕过
- 输出格式:对齐 10 段式产品结构(背景 / 目标 / 角色 / 流程 / 模块 / 状态 / 异常 / 风控 / 指标 / 交付说明)

---

## Part G — Trace 日志规范(P0 / P1 / P2 分级)

### G.1 分级策略

| 级别 | 策略 | 适用场景 |
|------|------|---------|
| **P0** | 写入前敏感信息过滤(强制) | 所有任务,无例外 |
| **P1** | 高敏任务降级记录摘要(禁止记录完整 prompt/output) | 涉及禁区灰区、用户数据、支付流程 |
| **P2** | 加密存储(可选,未来扩展) | 长期归档、审计需求场景 |

### G.2 必须过滤的敏感信息清单(P0)

写入 trace 前,Ruflo 必须扫描并过滤以下内容:

- API Key
- Secret(任意命名约定)
- Token(含 access token / refresh token)
- JWT
- 私钥(SSH / SSL / GPG / 区块链)
- 助记词(mnemonic / seed phrase)
- `.env` 文件内容
- `Authorization` header 完整值
- `Cookie` 完整值
- 用户支付信息(卡号 / CVV / 账户)
- 提现地址(钱包地址 / 银行账号)
- 真实用户身份信息(姓名 / 身份证 / 手机号)
- OAuth code / state 参数

过滤方式:替换为 `[REDACTED:<类型>]`,例如 `[REDACTED:API_KEY]`、`[REDACTED:JWT]`。

### G.3 Trace 内容规则(双向约束)

**Trace 可以记录:**

- 结构(sub-agent 拓扑、依赖关系)
- 时序(时间戳、耗时)
- 角色(agent_id、role)
- 命令(执行的指令、不含敏感参数)
- 摘要(输入输出的脱敏摘要)

**Trace 严禁持久化:**

- Raw secrets / credentials
- Private keys
- Authorization tokens
- Payment-sensitive data
- 完整用户对话(若包含上述任一)

### G.4 高敏任务降级规则(P1)

判定为高敏任务的条件(任一即触发):

- 任务路径经过任一禁区(E.1 / E.2)
- 任务输入包含 G.2 清单中任一类型
- 任务涉及外部 API 真实调用(非 mock)

高敏任务降级处理:

- **不记录完整 prompt**:仅记录 prompt 结构与字段类型
- **不记录完整 output**:仅记录 output schema 与摘要
- **trace 保留期缩短**:默认 7 天后自动清理(对比普通任务 90 天)

### G.5 Trace Sanitization 强制输出字段(v1.1 新增)

每次 Ruflo 任务的 trace 文件**必须**包含 `trace_sanitization` 块,作为脱敏行为的**显式审计证据**。规则只说"会脱敏"而 trace 不输出证据,等于断层——必须二者一致。

#### 强制 schema

```yaml
trace_sanitization:
  applied: true / false              # 是否执行了脱敏
  sanitization_level: P0 / P1 / P2   # 对应 G.1 三级策略
  redacted_fields:                   # 实际被替换的字段清单
    - field_path: <字段路径,如 "sub_agent_3.input.headers.Authorization">
      redacted_type: <类型,如 access_token / api_key / oauth_code>
      replacement: "[REDACTED:<类型>]"
  redaction_count: <整数,本次任务总共脱敏多少处>
  unredacted_assertion:              # 未脱敏内容的安全声明
    contains_no_secrets: true / false
    audited_by: ruflo_self / human
```

#### 强制清单(若任务涉及,必须出现在 redacted_fields)

| 类型 | 触发场景 |
|------|---------|
| `access_token` | OAuth / API 调用响应 |
| `refresh_token` | OAuth refresh 流程 |
| `oauth_code` | OAuth 授权码回调 |
| `client_secret` | OAuth client 配置 |
| `api_key` | 外部服务 API key |
| `private_key` | 任何私钥读取 |
| `jwt` | JWT 签发或验证 |
| `authorization_header` | HTTP Authorization 头完整值 |
| `cookie_full` | Cookie 完整值 |
| `payment_card` | 卡号 / CVV |
| `wallet_address` | 钱包地址 / 提现地址 |
| `mnemonic` | 助记词 / seed phrase |
| `pii_full` | 身份证 / 手机号 / 真实姓名组合 |

#### 一致性检查规则

- 若 `applied: true` 但 `redacted_fields` 为空 → trace 不合格
- 若 `applied: false` 但任务涉及外部 API 真实调用 → 自动 fail trace 审计
- 若 `redaction_count` 与 `redacted_fields` 数量不一致 → trace 不合格

#### Trace 行为契约(双向约束)

```
Ruflo trace MAY record: structure, timing, agent roles, commands, summaries.
Ruflo trace MUST NOT persist: raw secrets, credentials, private keys,
  authorization tokens, payment-sensitive data, full PII.
Ruflo trace MUST output trace_sanitization block as audit evidence.
```

---

## Part H — 自检清单(每次 Ruflo 任务启动前必跑)

Ruflo 启动前,必须按顺序自检以下 13 项,任一 FAIL 即拒绝执行:

```
[ ] 1. 触发条件命中(A.1)且非反触发(A.2)
[ ] 2. 准入门 1 PASS(B.1 三选一)
[ ] 3. 准入门 1.b 工程层涉及证据完整(B.1.b 判定矩阵,若走 B.1.b)
[ ] 4. 准入门 2 PASS(B.2 自主性)
[ ] 5. 准入门 3 PASS(B.3 可逆性)
[ ] 6. 拆分 sub-agent 数量在 [2, 7] 区间(C.2)
[ ] 7. 每个 sub-agent 卡片五字段完整(C.3)
[ ] 8. 任务路径无禁区命中(E.1 + E.2)
[ ] 9. 涉及方法论资产的操作均为 read 或 proposal(F.1)
[ ] 10a. Trace 敏感词过滤规则已加载(G.2)
[ ] 10b. 高敏任务判定已完成且降级策略已就位(G.4)
[ ] 11. trace_sanitization 输出 schema 已就位(G.5)
[ ] 12. 验收标准 R1-R6 已绑定到具体交付物(D.1)
[ ] 13. 若拒绝执行,primary/secondary 拒绝原因已按 B.5 输出(B.4 + B.5)
```

自检结果必须显式输出,不得省略。

---

## Part I — 版本与维护

- **本 skill 当前 maturity:** `draft`(未经实战验证)
- **升级到 `verified` 的条件:** 至少 3 个真实 Ruflo 项目按本 skill 跑完且全部 R≥24
- **升级到 `proven` 的条件:** 至少 10 个项目验证 + 至少 1 次禁区触发被正确拦截
- **失效条件:** 任一 P0 规则被绕过且未升级到 verified → 回退到 draft 并启动复盘

---

## 附录 A — 与其他 skill 的关系

- **不冲突**:本 skill 与产品评审 SOP、10 维评审手册并行,不替代
- **优先级**:Ruflo 任务中,本 skill 的 P0 规则优先于其他 skill 的任何规则
- **协作**:Ruflo 输出的 PRD 类交付物,仍需走产品评审 SOP 评分

## 附录 B — 术语表

- **元 Agent (Meta-Agent)**:能在运行时自主拆解任务、动态调整 sub-agent 编排的 agent
- **二级编排**:当 sub-agent 数量超过 7 时,引入上层 Ruflo 管理多个子 Ruflo
- **Proposal 权**:可写入 staging 区提交修改建议,但无权直接修改正式资产
- **硬性门槛**:总分通过但单项不达标即整体 Fail 的评分约束
