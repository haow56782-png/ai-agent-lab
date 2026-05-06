---
title: "D1-D10 产品评审 — VIB Agent Runtime Flow (Account Binding)"
domain: binding-workflow
evaluator: Ruflo → D1-D10
date: 2026-05-07
version: 1.0
---

# D1-D10 产品评审: VIB Agent Runtime Flow

> 评审对象: URL → Site → Auth → Bind → Analyze → Signal 绑定工作流。
> 代码基线: `src/binding/` (types.ts, mock-provider.ts, workflow.ts) + tests (20 tests)

---

## D1. Product Philosophy（产品哲学）

**核心问题: 用户为什么相信你？**

### 产品存在的第一性原理

AI 预测需要数据，数据需要授权访问。Binding Workflow 是用户从"局外人"到"获得预测洞察"的**唯一入口**——没有绑定就没有信号。这是一个**信任建立管道**,不是工具。

### 是否解决真实矛盾

**是。**用户在游戏平台有账户和游戏历史,但这些数据与 VIB AI 之间存在"授权鸿沟"。VIB 无法直接读取第三方游戏数据,用户也不会手动导出/导入。Binding Workflow 自动化了"用户授权 → VIB 读取 → 产出信号"的闭环,解决了**有数据但无法利用**的矛盾。

### 是否形成长期价值

- **短期**: 用户绑定后立即获得信号(confidence 0.68-0.82)
- **长期**: 每次绑定产生的 trace 数据可用于优化信号模型,形成数据复利
- **平台侧**: 绑定记录(ThirdPartyAccount)是后续个性化服务的基础资产

### 是否有"非它不可"的理由

当前市场上竞品的账户绑定通常需要:
1. 手动输入 API Key (技术门槛高)
2. 共享 Cookie/Session (安全风险高)
3. 客服人工绑定 (延迟高)

VIB 用 **URL → Agent 识别 → OAuth → 自动信号** 的自动流水线,在**低门槛 + 安全 + 实时**三个维度上形成"非它不可"。

### 是否符合 AI 原生时代范式

**符合。**以 Agent 为中心而非以表单为中心: 用户输入 URL 就够了,Agent 完成识别、编排、授权引导、信号生成的完整链路。这是 AI 原生的"意图驱动"范式。

```
v1.0 范式: 用户填写表单 → 系统处理 → 用户等结果
AI 原生范式: 用户表达意图(URL) → Agent 全权编排 → 用户决策(key confirmations)
                                  ↑ Binding Workflow 在这里
```

### 价值主张

```
For 游戏分析用户
Who 有 PG Soft / JILI / Spade Gaming 账户但无法获取预测洞察
The Binding Workflow
Is 一个 AI 驱动的自动账户绑定 + 信号生成管道
That 用户只需提供 URL,Agent 自动完成站点识别、授权引导、账号绑定、信号分析
Unlike 手动配置 API Key 或依赖人工绑定
We 用状态机编排 + 显式双确认(auth + bind) + 实时 trace 可视化的方式建立信任
```

### 产品世界观

**绑定的本质不是技术动作,是信任转移。**用户将自己对游戏平台的信任延伸至 VIB。每个 stage 的显式状态输出,不是技术日志,而是信任建立的"进度条"。

### 核心矛盾

**预测价值 vs 授权风险。**用户要获得预测洞察,就必须授予 VIB 访问游戏账户的权限。Binding Workflow 的价值 = 将这对矛盾的摩擦降到最低(≈ URL 输入 + 2 次确认)。

### 信任来源

| 信任层次 | Binding Workflow 的信任证据 |
|---------|---------------------------|
| 能力信任 | 自动识别 3 个游戏平台,支持多游戏 |
| 安全信任 | OAuth 标准授权,不存储凭据(Domain Invariant #5) |
| 过程信任 | 每个 stage 显式输出,失败有原因 + 建议 |
| 控制信任 | 用户在 auth 和 bind 两个关键节点显式确认 |

**得分: 4/5** (扣分: 尚无真实 OAuth 实现,当前为 mock)

---

## D2. Business Model（商业模式）

**核心问题: 这门生意为什么成立？**

### 收入来源

Binding Workflow 本身不是收入中心,它是**转化漏斗的起点**:

```
URL 输入 (获客) → 站点识别 (兴趣验证) → 授权 (信任确认) → 绑定 (激活) → 信号 (价值交付)
                                                                        ↓
                                                                  Credits 消耗模型(未来)
```

可能的收入模式:
- **按绑定收费**: 每个绑定的游戏账户产生订阅 Credits
- **按信号收费**: 每次信号生成消耗 Credits
- **按平台收费**: 不同游戏平台支持分层付费解锁

### 成本结构

| 成本项 | 当前 | 生产环境预估 |
|-------|------|------------|
| LLM 调用 | 无( mock ) | 每次信号分析 ~$0.01-0.05 |
| OAuth 基础设施 | 无(mock) | 认证服务器 + Token 管理 |
| 存储 | SQLite(本地) | 云端数据库 |

### 单位经济模型

```
当前(mock) 单位经济:
  用户获取: URL 输入(零成本)
  激活: 2 次确认点击
  价值交付: mock 信号(零推理成本)
  用户留存: 信号频率 × 信号质量

生产环境预估单位经济:
  单次绑定成本 ≈ OAuth 存储 + 首次账号抓取
  单次信号推理 ≈ $0.02(DeepSeek API)
  盈亏平衡 ≈ 用户需要在绑定后生成 ~5-10 次信号
```

### 毛利空间

当前 mock 阶段: 边际成本趋近于零,毛利 ≈ 100%。
生产环境: 毛利空间取决于 Credits 定价 vs API 成本的比率。按行业标准 3-5x 定价,毛利约 60-80%。

### CAC / LTV

- **CAC**: URL 输入的获客成本极低(自然流量),但绑定完成率是关键转化指标
- **LTV**: 绑定后用户生成信号的频率 × 信号价值 × 用户生命周期

### 网络效应

**弱网络效应。**更多绑定用户 → 更多 trace 数据 → 可优化信号模型 → 更好预测 → 更多用户。但当前架构下,信号是独立针对每个游戏平台生成的,跨用户受益有限。

### 规模化能力

| 维度 | 规模化能力 | 瓶颈 |
|------|-----------|------|
| 游戏平台数 | 高(新增 provider 是纯代码工作) | 每个平台的 OAuth 协议差异 |
| 用户绑定数 | 中(每个绑定需要存储) | 存储成本线性增长 |
| 信号生成 | 高(异步可并行) | LLM API 速率限制 |

**得分: 3/5** (扣分: mock 阶段无真实收入模式验证,网络效应弱)

---

## D3. User & Role Modeling（用户与角色建模）

**核心问题: 谁在用？为什么用？**

### 用户分层

| 层 | 用户 | 行为模式 | 绑定频率 |
|----|------|---------|---------|
| L1 | 游戏数据分析师(小王) | 绑定 → 多次分析信号 | 低频(绑定一次用多次) |
| L2 | AI Agent 开发者(Alex) | 测试绑定 → 调试 provider | 高频(增加新 provider) |
| L3 | 普通游戏玩家(未来) | 绑定 → 看信号 → 决策 | 极低频(一次绑定) |

### Persona 映射

| Persona | 在 Binding Workflow 中的角色 | 关键交互 |
|---------|---------------------------|---------|
| 小王(分析师) | **核心用户。**需要通过绑定获取游戏数据 | URL 输入 → 信号输出 |
| Linda(设计工程师) | **不直接使用。**但 binding 的 stage 输出 UI 需要她设计 | 不直接交互 |
| Alex(开发者) | **拓展者。**为新游戏平台实现 provider | `confirmAuth`/`confirmBind` callback 调试 |

### 动机

- **分析师小王**: "我需要看到这个游戏的预测数据来做报告"
- **开发者 Alex**: "我需要验证新平台的绑定流程是否正常"
- **玩家(未来)**: "我想知道今天玩哪个游戏胜率高"

### 风险偏好

| 用户类型 | 授权风险容忍度 | 行为 |
|---------|--------------|------|
| 分析师 | 中高(专业需求驱动) | 愿意完成完整绑定流程 |
| 开发者 | 高(理解技术原理) | 可能 mock 或快速跳过 |
| 普通玩家 | 低(安全敏感) | 需要强烈的信任信号才能完成绑定 |

### 用户决策链

```
认知: "VIB 能预测游戏结果"
  ↓
兴趣: "但需要绑定我的游戏账户"
  ↓
评估: "绑定安全吗？有什么风险？"(关键决策点！)
  ↓                     ↙ 不信任 → 流失
信任: 看到显式 auth + bind 双确认 + stage 可视化
  ↓
行动: 粘贴 URL → 确认授权 → 确认绑定
  ↓
验证: 看到信号结果
  ↓
复购/留存: 再次生成信号
```

### 角色地图

```
                    ┌─────────────────────────┐
                    │    游戏分析用户(小王)    │
                    │  (提供 URL,确认授权,消费信号) │
                    └──────────┬──────────────┘
                               │ URL
                               ▼
┌─────────────┐    ┌─────────────────────┐    ┌──────────────┐
│ 游戏平台     │◄───│  VIB Binding Agent  │───►│  Signal       │
│(PG Soft/    │    │  (编排绑定工作流)    │    │  Consumer    │
│ JILI/Spade) │    └─────────────────────┘    └──────────────┘
└─────────────┘
```

**得分: 4/5** (扣分: 普通玩家 persona 尚未在产品中实际支持)

---

## D4. User Experience & Interaction（交互与体验）

**核心问题: 用户为什么愿意持续使用？**

### 心智模型

Binding Workflow 的心智模型是 **"自助服务终端"**: 用户把 URL 放进去,机器自动处理,每个步骤可见,遇到问题有提示。

```
用户: 粘贴 URL → [机器工作中...] → 拿到结果
         ↑                ↑              ↑
      极简输入       每步可见(消除焦虑)   即时价值
```

### 信息架构

当前信息架构(CLI):

```
VIB Agent Runtime Flow Demo
  │
  ├─ Session ID  ← 定位锚点
  │
  ├─ Stage Flow  ← 线性进度(icon + label + detail)
  │   ├─ ✅ URL_INPUT valid: pgsoft.com
  │   ├─ 🔄 SITE_RECOGNIZING Identifying site...
  │   ├─ ✅ SITE_RECOGNIZED PG Soft — 3 games
  │   ├─ 🔄 AUTH_CONFIRM_REQUIRED User authorization...
  │   ├─ ✅ THIRD_PARTY_AUTHORIZING Token acquired
  │   ├─ ✅ ACCOUNT_INFO_FETCHING LuckyPlayer (pg_acc_abc123)
  │   ├─ ✅ ACCOUNT_BOUND LuckyPlayer → pg_acc_abc123
  │   └─ ✅ SIGNAL_READY confidence 82%
  │
  └─ Summary Block  ← 结论(Outcome/Provider/Account/Duration/Events/Signal)
```

### 页面流(未来 H5 版推测)

```
[输入页] → [识别页] → [授权页] → [绑定确认页] → [结果页]
    |          |           |            |           |
  输入URL   识别中...   授权按钮   绑定确认    信号+信心
                           ↓                      ↓
                       拒绝 → 失败页           失败 → 错误页
```

### Agent 交互状态机

Binding Workflow 本身就是状态机。18 个 state,7 个 failure state。

关键交互模式:
- **线性推进**: 每个 stage 完成后自动进入下一个
- **用户决策点**: AUTH_CONFIRM_REQUIRED 和 ACCOUNT_BIND_CONFIRM 需要用户输入
- **失败即停止**: 任何 failure state 终止流程,输出原因 + 建议

### 降噪能力

每次 stage transition 只输出一行 log。

```
✅ SITE_RECOGNIZED PG Soft — 3 games
```

而不是原始 API 响应的 JSON dump。信息经过**摘要化**再展示给用户。

### AI 可解释性

信号(Signal)是 AI 产出的核心,包含:
- **confidence**: 0.68-0.82 的量化信心
- **prediction**: 人类可读的自然语言描述
- **factors**: 因子列表(解释"为什么")

```
PG_SOFT: Gem Saviour — high volatility expected in next 24h
  factors:
    - Historical win rate: 34%
    - Current streak: 3 losses
    - Tournament active
```

### 情绪节奏

```
↑ 期待 │  输入URL
      │    ↘
      │     识别中... ← 轻微焦虑
      │        ↘
      │    ✅ 识别成功! ← 小确幸
      │         ↘
      │          授权确认... ← 决策压力(关键)
      │             ↘
      │          ✅ 授权成功! ← 信任建立
      │               ↘
      │            绑定确认... ← 最终决策压力
      │                 ↘
      │              ✅ 绑定成功!  ← 完成感
      │                   ↘
      │               分析中... ← 期待
      │                     ↘
      │                  ✅ SIGNAL! ← 🎯 峰值体验
      └─────────────────────────────────────────→ Time
```

**得分: 4/5** (扣分: CLI 体验优秀但缺乏 H5/UI 版本)

---

## D5. Behavioral & Conversion Design（行为与转化）

**核心问题: 用户为什么会转化？**

### Hook 模型

```
触发(URL 输入) → 行动(授权) → 可变奖励(信号) → 投入(绑定)
    ↑                                              │
    └──────────────────────────────────────────────┘
```

- **外部触发**: 用户有预测需求 → 启动 VIB
- **行动**: 粘贴 URL(最低 friction)
- **可变奖励**: 每次信号不同(confidence 0.68-0.82,预测内容变化)
- **投入**: 绑定后账户关联,下次使用 friction 更低

### 转化的关键节点

```
URL 输入 ──→ 站点识别 ──→ 授权确认 ──→ 绑定确认 ──→ 信号获取
 100%         85%          60%          45%          40%  (预估转化率)
(基准)     (↓15%未知站点)  (↓25%不信任)  (↓15%犹豫)  (↓5% 失败)
```

每个阶段的**转化阻尼**:
1. **URL → 识别(85%)**: 15% 损失来自未知站点。缓解: 明确列出支持的平台
2. **识别 → 授权(60%)**: 最大损失点!用户在此决定"是否信任"。缓解: Demo 模式先展示价值
3. **授权 → 绑定(45%)**: 二次确认让部分用户犹豫。缓解: 清晰的权限范围说明
4. **绑定 → 信号(40%)**: 技术失败。缓解: 重试 + 降级策略

### 激励

当前阶段:
- **内在激励**: 获得 AI 预测洞察的好奇心
- **外在激励**: 暂未实现(未来可加分)

建议:
- 绑定完成后展示"解锁了 N 款游戏"的成就
- 首次信号突出 confidence 和 actionable insights

### 复购

绑定是低频一次性行为。**留存的关键在信号质量**,不在绑定流程本身。

### 成长体系(未来)

- 绑定账户数 → "数据网络"等级
- 信号消费次数 → "洞察力"等级
- Provider 多样性 → "游戏通"徽章

### Credits 消耗模型(未来)

```
信号生成 → 消耗 Credits
Credits → 按绑定账户数分配月额度
超额 → 订阅升级
```

**得分: 3/5** (扣分: 无真实激励/积分/Credits 体系,转化率无真实数据)

---

## D6. Data & Metrics System（数据与指标体系）

**核心问题: 怎么知道系统真的有效？**

### North Star

**Bound Accounts × Signal Quality** — 绑定账户数衡量广度,信号质量(confidence + 准确率)衡量深度。

### 指标体系

| 指标 | 定义 | 当前值 | 目标值 |
|------|------|-------|-------|
| 绑定完成率 | 成功绑定 / URL 输入 | ~80%(mock) | >90% |
| 授权转化率 | 授权确认 / 识别完成 | 100%(mock) | >70% |
| 绑定成功率 | 绑定确认 / 授权完成 | 100%(mock) | >95% |
| 信号成功率 | 信号生成 / 开始分析 | ~90%(mock) | >95% |
| 平均完成时长 | URL 输入 → 信号输出 | ~4.5s(mock) | <10s(prod) |
| 信号平均 confidence | - | 0.75(mock) | >0.75(prod) |

### 埋点

当前已实现:
- **RuntimeEvent[]**: 每个 stage 的 entered/completed/failed + durationMs
- **TraceSpans**: StateStore 持久化的嵌套 span
- **LLM/Tool Call Records**: telemetry 收集

缺少:
- 用户级 session 追踪(binding session → user identity 关联)
- 漏斗转化率自动计算
- 信号准确率反馈回路(用户需标记"预测是否正确")

### Eval

20 个 binding workflow 测试,覆盖:
- Happy path(2)
- Failure cases(8)
- StateStore persistence(4)
- Runtime events(3)
- Edge cases(3)

### 评估机制

当前无针对信号准确率的自动评估——信号是 mock 的,无法评估。
生产环境需要: 预测记录 + 实际结果对比 → calibration 报告。

**得分: 3/5** (扣分: 无真实信号准确率评估,无用户级漏斗分析)

---

## D7. Runtime & System Architecture（运行时与系统架构）

**核心问题: 系统怎么稳定运行？**

### 状态机架构

18 个状态,7 个 failure,线性推进 + 用户决策点。

```
INIT → URL_INPUT
         → INVALID_URL ❌
         → SITE_RECOGNIZING → UNSUPPORTED_SITE ❌
                            → SITE_RECOGNIZED
                               → AUTH_CONFIRM_REQUIRED → AUTH_REJECTED ❌
                                                       → THIRD_PARTY_AUTHORIZING → AUTH_FAILED ❌
                                                                                  → ACCOUNT_INFO_FETCHING → ACCOUNT_FETCH_FAILED ❌
                                                                                                           → ACCOUNT_BIND_CONFIRM → BIND_FAILED ❌
                                                                                                                                    → ACCOUNT_BOUND
                                                                                                                                       → AGENT_ANALYZING → SIGNAL_GENERATION_FAILED ❌
                                                                                                                                                          → SIGNAL_READY ✅
```

### 容错设计

| 层次 | 机制 | 实现 |
|------|------|------|
| Stage 级 | try/catch → failure state | transition() 函数 |
| 超时 | Promise.race + setTimeout | withTimeout() |
| LLM 降级 | catch → 结构化错误消息 | agent.ts graceful degradation |
| 持久化 | 失败时 catch + log,不阻塞主流程 | finalize() 中的 try/catch |

### Telemetry + Tracing

- Trace spans: 每个 stage transition 记录嵌套 span
- 结构化日志: JSONL 到 stderr,支持 jq 过滤
- StateStore 持久化: 失败 session 也记录

### 当前限制

- **单线程**: 无并发绑定处理
- **Mock 依赖**: 所有 provider 是 mock,无真实 OAuth
- **本地存储**: SQLite 不适合生产多用户

**得分: 4/5** (扣分: mock provider 未对接真实 API,无并发控制)

---

## D8. Operations & Governance（运营与治理）

**核心问题: 系统如何长期可控？**

### 权限

当前无用户权限系统。Binding Workflow 的权限体现在:
- **Domain Invariant #6**: 授权必须用户显式确认
- **Stage 级控制**: auth + bind 两个决策点不可跳过

### 安全设计

| 安全要求 | 实现 |
|---------|------|
| 不存储凭据 | Domain Invariant #5: ThirdPartyAccount 禁止存储密码/私钥 |
| 用户授权确认 | confirmAuth callback |
| 绑定确认 | confirmBind callback |
| Session 隔离 | 每次 binding 独立 sessionId |

### 审计

- 完整 RuntimeEvent[] 记录(时序 + 耗时 + 错误)
- StateStore trace_spans 持久化
- Trace sanitization 规则(P0/P1/P2 分级)

### 运营挑战

- Provider 新增流程: 需要开发 + 测试新平台,当前无运营工具
- 失败归因: 当前 trace 足够,但无聚合 dashboard
- 用户支持: 失败提示仅有 CLI 文本,无工单系统

**得分: 3/5** (扣分: 无用户权限系统,无运营 dashboard,provider 管理需手工)

---

## D9. Competitive Strategy（竞争策略）

**核心问题: 为什么竞争对手打不过你？**

### 差异化

| 维度 | 竞品(传统) | VIB Binding Workflow |
|------|-----------|---------------------|
| 绑定方式 | API Key 手动输入 | URL → Agent 自动识别 |
| 授权流 | 开发者自行实现 | 内置 OAuth 编排 + mock 验证 |
| 信号生成 | 需要单独的数据管道 | 绑定后立即自动信号 |
| 可视化 | 无 | 实时 stage 输出 + 延迟显示 |
| 失败处理 | 静默失败 | 显式 failure state + 建议 |

### 进入壁垒

| 壁垒 | 强度 | 说明 |
|------|------|------|
| Provider 适配 | 中 | 每平台 OAuth 协议不同,但纯代码工作 |
| 信号模型 | 中 | 需要领域数据 + LLM 调优 |
| 用户绑定数据 | 低(当前) | 本地 SQLite,无网络效应 |

### 数据壁垒(未来)

绑定数据本身是壁垒: 用户一般只愿意绑定一次。谁先让用户绑定,谁就锁定了该用户的游戏数据管道。

### Skill 资产

Binding Workflow 本身就是 skill 的最佳实践: 状态机编排 + trace + telemetry + failure injection 的组合,是可复用的**编排模式资产**。

**得分: 3/5** (扣分: mock 阶段尚未建立真实数据壁垒)

---

## D10. Evolution & Anti-Fragility（演化与反脆弱）

**核心问题: 系统如何越变越强？**

### 自学习

当前: 无。信号是 mock 的,不学习。
未来: 信号 confidence vs 实际结果 → 校准模型。

### Eval → Calibration

20 个测试用例保证流程正确性。但信号本身的准确性无法评估(需要真实数据)。

### Provider 演化

```
当前: 3 个 mock provider (PG Soft, JILI, Spade Gaming)
下步: 真实 OAuth 对接
未来: Provider 注册机制(可插拔)
```

### 失败反馈

每个 failure 产出:
- 结构化错误原因
- 用户可读的失败提示
- Trace 记录(技术审计)

这些数据可用于:
- 分析最常见的失败类型 → 优先修复
- 识别模糊的失败提示 → 优化文案
- 发现用户放弃的关键节点 → 改进流程

### Anti-Fragile 设计

| 机制 | 反脆弱效果 |
|------|-----------|
| 显式 failure state | 失败不隐藏,暴露即改进机会 |
| trace 完整记录 | 每次失败都是审计资产 |
| mock provider 架构 | 真实 API 故障时仍可 demo |
| failure injection 测试 | 开发阶段暴露边界条件 |

**得分: 3/5** (扣分: 无真实数据反馈回路,无自校准机制)

---

## 总分汇总

| ID | 维度 | 得分 | 关键弱点 |
|----|------|------|---------|
| D1 | Product Philosophy | 4/5 | 无真实 OAuth 信任验证 |
| D2 | Business Model | 3/5 | mock 阶段无收入验证 |
| D3 | User & Role Modeling | 4/5 | 普通玩家 persona 未支持 |
| D4 | UX & Interaction | 4/5 | CLI 优秀但无 H5/UI |
| D5 | Behavioral & Conversion | 3/5 | 无激励/Credits 体系 |
| D6 | Data & Metrics | 3/5 | 无信号准确率评估 |
| D7 | Runtime & Architecture | 4/5 | mock provider 未接真实 API |
| D8 | Operations & Governance | 3/5 | 无用户权限/dashboard |
| D9 | Competitive Strategy | 3/5 | 无真实数据壁垒 |
| D10 | Evolution & Anti-Fragility | 3/5 | 无自学习/校准回路 |
| **总分** | | **34/50** | |

### 解读

- **≥40**: Strong — 产品系统层健康
- **30-39**: Pass — 核心成立,需补齐关键短板
- **<30**: Weak — 需要结构性调整

**综合判定: Pass (34/50)**

Binding Workflow 在产品哲学(D1=4)、UX(D4=4)、运行时架构(D7=4)三个维度表现突出。最大短板集中在商业验证(D2/D5/D9)和数据回馈(D6/D10),这些需要在接入真实数据后补齐。

### 优先级行动建议

```
P0 (阻塞):  真实 OAuth 集成 + 信号准确率评估
P1 (重要):  转化漏斗埋点 + 失败原因聚合
P2 (增强):  用户体系 + Credits 模型 + H5 前端
```
