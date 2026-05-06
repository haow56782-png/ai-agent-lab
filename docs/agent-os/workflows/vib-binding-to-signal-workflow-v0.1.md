# VIB Binding-to-Signal Workflow v0.1

## 完整业务闭环

用户输入游戏网址 → Agent 识别站点 → 用户绑定平台账号 → Agent 分析账号状态 → 判断是否满足信号条件 → 检查 Credits / 会员状态 → 生成 Signal → Signal 生效倒计时 → 追踪结果 → 生成报告

---

## 1. 业务目标

### 1.1 核心目标

让游戏玩家通过 VIB Agent 完成**一次操作**即可：
1. 绑定自己的游戏平台账号
2. 获得 AI 生成的预测信号
3. 追踪信号结果
4. 获得分析报告

### 1.2 成功指标

| 指标 | 目标值 | 测量方式 |
|------|--------|---------|
| 全流程完成率 | > 70%（从 URL 输入到报告生成） | 事件埋点 funnell |
| 单次流程耗时 | < 60 秒（从输入到 SIGNAL_ACTIVE） | trace duration |
| Signal 准确率 | > 75% | 信号结果 vs 实际结果 |
| 用户回访率 | > 40%（7 日内再次使用） | 用户事件统计 |
| Credits 消耗透明度 | 100%（每次消耗有记录） | cost_tracking 记录 |

### 1.3 非目标

- 不涉及真实货币交易
- 不保证 100% 预测准确
- 不支持非游戏平台（社交、金融等）
- 不存储用户游戏密码

---

## 2. 用户角色

| 角色 | 说明 | 使用场景 | 权限 |
|------|------|---------|------|
| **已注册玩家** | 已完成平台注册的用户 | 绑定账号、获取信号、查看报告 | 基础功能 |
| **会员用户** | 已订阅会员的玩家 | 无限信号、优先分析、高级报告 | 除 Credits 外全部 |
| **访客** | 未注册用户 | 只能浏览、不能使用信号 | 无操作权限 |
| **后台管理员** | 平台运营人员 | 查看绑定记录、管理 Credits、风控审核 | 全部管理权限 |

---

## 3. 主流程

```
Step 1: 用户输入游戏平台 URL
  ↓
Step 2: Agent 分析 URL → 识别站点和游戏
  ↓ (站点不支持 → 返回错误)
Step 3: 引导用户绑定平台账号（OAuth）
  ↓ (用户拒绝 → 流程结束)
Step 4: Agent 分析绑定的账号状态
  ↓ (账号无数据 → 返回提示)
Step 5: 检查会员状态 / Credits 余额
  ↓ (Credits 不足 → 引导充值)
Step 6: 扣除 Credits → 生成 Signal
  ↓
Step 7: Signal 进入 ACTIVE 倒计时
  ↓ (倒计时结束)
Step 8: 追踪信号结果（匹配/不匹配）
  ↓
Step 9: 生成分析报告
```

### 3.1 详细步骤

**Step 1-2: URL 输入与站点识别**

```
用户: "帮我看看这个游戏 https://www.pgsoft.com/games/lucky-dragon"
Agent:
  1. 解析域名 → pgsoft.com
  2. 匹配支持列表 → PG Soft
  3. 识别游戏 → Lucky Dragon (Slot)
  4. 确认: "检测到 PG Soft 平台的 Lucky Dragon，需要绑定账号后生成信号"
```

**Step 3: 账号绑定**

```
Agent:
  1. 重定向到 PG Soft OAuth 授权页
  2. 用户授权
  3. 获取 access_token → 获取用户账号信息
  4. 显示账号信息让用户确认
  5. 用户确认 → 绑定完成
```

**Step 4: 账号分析**

```
Agent:
  1. 读取用户游戏数据（历史、持仓、活跃度）
  2. 分析是否满足信号生成条件（有足够游戏数据）
  3. 输出分析结论
```

**Step 5-6:  Credits 检查与信号生成**

```
Agent:
  1. 检查用户 Credits 余额 ≥ 1
  2. 如果是会员 → 免 Credits 消耗
  3. 扣除 Credits → 调用预测引擎
  4. 生成 Signal
```

**Step 7-9: 信号生命周期与报告**

```
Agent:
  1. Signal 标记 ACTIVE → 开始倒计时（T+1h / T+24h）
  2. 倒计时结束 → 对比实际结果
  3. 生成分析报告（包含信号 vs 实际、置信度、因子分解）
```

---

## 4. 异常流程

### E1: 站点不支持

```
触发: 用户输入的 URL 域名不在支持列表
行为:
  1. 返回 UNSUPPORTED 状态（非 FAILED）
  2. 明确告知用户该站点暂不支持
  3. 列出当前支持的站点列表
恢复: 用户输入其他支持的 URL，流程从 Step 1 重新开始
```

### E2: 授权失败

```
触发: OAuth 流程中用户取消或授权失败
行为:
  1. 保存当前上下文（已识别的站点和游戏）
  2. 记录失败原因
  3. 提示用户重新授权
恢复: 用户重新确认授权，从 Step 3 继续（无需重新识别站点）
```

### E3: 账号数据不足

```
触发: 绑定的账号游戏数据不足以生成信号（新账号、无历史）
行为:
  1. 返回 ACCOUNT_ANALYZING 但标记 data_insufficient
  2. 提示用户该账号数据不足
  3. 建议：游戏几局后再来
恢复: 用户玩了几局后重新发起流程
```

### E4: Credits 不足

```
触发: 用户 Credits 余额低于信号所需
行为:
  1. 提示 Credits 不足（当前: N, 需要: M）
  2. 引导用户购买 / 订阅会员
  3. 保存当前上下文，用户补充后继续
恢复: 用户充值后从 Credits 检查步骤继续
```

### E5: Signal 生成失败

```
触发: 预测引擎返回错误或超时
行为:
  1. 消耗的 Credits 退回
  2. 记录失败上下文
  3. 提示用户重试
恢复: 用户重试，或稍后重试
```

### E6: 结果追踪失败

```
触发: 倒计时结束后无法获取实际结果（平台数据不可用）
行为:
  1. Signal 标记 UNRESOLVED
  2. 生成部分报告（有信号无结果）
  3. 可手动刷新追踪
恢复: 平台数据恢复后重新追踪
```

---

## 5. 状态机

### 状态全集

| ID | 名称 | 类型 | 阶段 | 说明 |
|----|------|------|------|------|
| `INIT` | 初始 | initial | 输入 | 初始状态，等待用户输入 |
| `URL_RECEIVED` | URL 已接收 | normal | 输入 | 用户已提交 URL |
| `SITE_ANALYZING` | 站点分析中 | normal | 识别 | Agent 正在解析 URL 和匹配 provider |
| `SITE_SUPPORTED` | 站点已支持 | normal | 识别 | 站点识别成功，进入绑定流程 |
| `SITE_UNSUPPORTED` | 站点不支持 | error | 识别 | 站点不在支持列表，可恢复 |
| `ACCOUNT_BINDING_REQUIRED` | 需要绑定 | normal | 绑定 | 提示用户需要绑定账号 |
| `ACCOUNT_BINDING_IN_PROGRESS` | 绑定进行中 | normal | 绑定 | OAuth 流程进行中 |
| `ACCOUNT_BOUND` | 绑定成功 | normal | 绑定 | 账号绑定完成 |
| `ACCOUNT_ANALYZING` | 账号分析中 | normal | 分析 | Agent 分析账号游戏数据 |
| `MEMBERSHIP_REQUIRED` | 需要会员 | normal | 计费 | 功能需要会员订阅 |
| `CREDITS_REQUIRED` | 需要 Credits | normal | 计费 | Credits 余额不足 |
| `SIGNAL_GENERATING` | 信号生成中 | normal | 信号 | 调用预测引擎生成信号 |
| `SIGNAL_ACTIVE` | 信号有效 | normal | 信号 | 信号生成成功，倒计时中 |
| `SIGNAL_EXPIRED` | 信号过期 | terminal | 信号 | 倒计时结束，结果已知 |
| `REPORT_GENERATED` | 报告已生成 | terminal | 报告 | 分析报告完成 |
| `FAILED` | 失败 | terminal | — | 不可恢复的错误终态 |

### 状态转换图

```
                    ┌───────────────────────────────────────────────────┐
                    │                                                   │
                    ▼                                                   │
INIT → URL_RECEIVED → SITE_ANALYZING → SITE_SUPPORTED                   │
       │                │                    │                          │
       │                ▼                    ▼                          │
       │          SITE_UNSUPPORTED    ACCOUNT_BINDING_REQUIRED          │
       │          (recoverable)              │                          │
       │                              ACCOUNT_BINDING_IN_PROGRESS       │
       │                                     │                          │
       │                              ACCOUNT_BOUND ←──────────────────┘
       │                                     │
       │                              ACCOUNT_ANALYZING
       │                                     │
       │                         ┌───────────┼───────────┐
       │                         ▼           ▼           ▼
       │                   MEMBERSHIP_   CREDITS_   SIGNAL_
       │                   REQUIRED      REQUIRED    GENERATING
       │                         │           │           │
       │                         └───────────┴───────────┘
       │                                             │
       │                                      SIGNAL_ACTIVE
       │                                             │
       │                                      SIGNAL_EXPIRED
       │                                             │
       │                                      REPORT_GENERATED
       │
       └──→ FAILED (不可恢复)
```

### 状态转换规则

| 当前状态 | 下一状态 | 触发条件 | Guard |
|---------|---------|---------|-------|
| INIT | URL_RECEIVED | 用户提交 URL | URL 非空 |
| URL_RECEIVED | SITE_ANALYZING | Agent 开始分析 | URL 格式校验通过 |
| SITE_ANALYZING | SITE_SUPPORTED | 域名匹配支持列表 | provider 匹配成功 |
| SITE_ANALYZING | SITE_UNSUPPORTED | 域名不在支持列表 | 匹配失败 |
| SITE_UNSUPPORTED | URL_RECEIVED | 用户输入新 URL | 新 URL 有效 |
| SITE_SUPPORTED | ACCOUNT_BINDING_REQUIRED | 需要绑定 | 尚无有效绑定 |
| SITE_SUPPORTED | ACCOUNT_ANALYZING | 已有有效绑定 | authorizationStatus = AUTHORIZED |
| ACCOUNT_BINDING_REQUIRED | ACCOUNT_BINDING_IN_PROGRESS | 用户确认授权 | 用户交互确认 |
| ACCOUNT_BINDING_REQUIRED | FAILED | 用户拒绝授权 | 用户选择取消 |
| ACCOUNT_BINDING_IN_PROGRESS | ACCOUNT_BOUND | OAuth 回调成功 | token 有效、写入成功 |
| ACCOUNT_BINDING_IN_PROGRESS | FAILED | 授权失败且不可恢复 | error.recoverable = false |
| ACCOUNT_BOUND | ACCOUNT_ANALYZING | 绑定完成 | DB 持久化确认 |
| ACCOUNT_ANALYZING | SIGNAL_GENERATING | 数据充足、Credits 够 | credits ≥ 1 或会员 |
| ACCOUNT_ANALYZING | MEMBERSHIP_REQUIRED | 功能需要会员 | 非会员用户 |
| ACCOUNT_ANALYZING | CREDITS_REQUIRED | Credits 不足 | credits < 1 且非会员 |
| ACCOUNT_ANALYZING | FAILED | 数据不可用 | 平台数据完全不可读 |
| MEMBERSHIP_REQUIRED | SIGNAL_GENERATING | 用户订阅会员 | 订阅成功 |
| CREDITS_REQUIRED | SIGNAL_GENERATING | 用户补充 Credits | 充值成功 |
| SIGNAL_GENERATING | SIGNAL_ACTIVE | 信号生成成功 | signal schema 校验通过 |
| SIGNAL_GENERATING | FAILED | 信号生成失败 | 引擎返回错误 |
| SIGNAL_ACTIVE | SIGNAL_EXPIRED | 倒计时结束 | 时间到达 |
| SIGNAL_EXPIRED | REPORT_GENERATED | 报告生成完成 | 报告完整性校验通过 |
| SIGNAL_EXPIRED | FAILED | 报告生成失败 | 写入或渲染失败 |

### 异常转换汇总

| 当前状态 | 错误状态 | 可恢复 | 恢复路径 |
|---------|---------|--------|---------|
| SITE_ANALYZING | SITE_UNSUPPORTED | 是 | 新 URL → URL_RECEIVED |
| ACCOUNT_BINDING_REQUIRED | ACCOUNT_BINDING_IN_PROGRESS | 是 | 重新确认授权 |
| ACCOUNT_BINDING_IN_PROGRESS | ACCOUNT_BINDING_IN_PROGRESS (retry) | 是 | OAuth 重试 |
| ACCOUNT_ANALYZING | ACCOUNT_ANALYZING (retry) | 是 | 数据刷新后重试 |
| ANY | FAILED | 否 | 记录上下文，终止 |

---

## 6. 输入字段

### 6.1 用户输入（前端）

```yaml
url:
  type: string
  required: true
  description: "游戏平台 URL"
  constraints:
    - "必须为 http(s) 格式"
    - "最大长度 2048"
  example: "https://www.pgsoft.com/games/lucky-dragon"

optional:
  gameId:
    type: string
    description: "如果知道游戏 ID 可直接传入"
  provider:
    type: string
    description: "如果知道平台可直接指定"
```

### 6.2 系统上下文

```yaml
userId:
  type: string
  required: true
  description: "平台用户 ID"
  source: "auth token"

sessionId:
  type: string
  required: true
  description: "会话 ID"
  source: "自动生成"

traceId:
  type: string
  required: true
  description: "全局追踪 ID"
  source: "自动生成"
```

---

## 7. 输出字段

### 7.1 Signal 数据

```yaml
signalId:
  type: string
  description: "信号唯一 ID"
  format: "sig_{random16}"

gameInfo:
  provider: string      # PG Soft
  gameName: string      # Lucky Dragon
  gameType: string      # slot | fishing | sports | esports

prediction:
  outcome: string       # big-win | small-win | draw | loss
  confidence: number    # 0.0 - 1.0
  factors:
    - name: string      # "历史回报率"
      weight: number    # 0.0 - 1.0
      value: string     # "high"
  modelVersion: string  # "v0.1.0"

status:
  state: string         # SIGNAL_ACTIVE | SIGNAL_EXPIRED
  activatedAt: string   # ISO-8601
  expiresAt: string     # ISO-8601

binding:
  bindingId: string
  provider: string
  platformUserId: string

result:                 # 追踪结果（SIGNAL_EXPIRED 后有值）
  actualOutcome: string
  match: boolean
  resolvedAt: string
```

### 7.2 报告数据

```yaml
reportId:
  type: string
  format: "rpt_{random16}"

summary:
  signalCount: number
  matchRate: number           # 0.0 - 1.0
  totalCreditsUsed: number
  periodStart: string
  periodEnd: string

signals:
  - signalId: string
    gameInfo: { ... }
    prediction: { ... }
    result: { ... }

credits:
  used: number
  balanceBefore: number
  balanceAfter: number
```

---

## 8. API 草案

### 8.1 绑定相关

```yaml
# 提交 URL 开始流程
POST /api/v1/binding/start
  Request:  { url: string, userId: string }
  Response: { workflowId: string, state: "SITE_ANALYZING", supportedProviders: string[] }

# 确认绑定
POST /api/v1/binding/confirm
  Request:  { workflowId: string, bindingId: string }
  Response: { state: "ACCOUNT_BOUND", account: { nickname, platformUserId } }

# 获取绑定状态
GET /api/v1/binding/{workflowId}/status
  Response: { state: string, binding?: Binding, error?: ErrorInfo }

# 解绑
POST /api/v1/binding/{bindingId}/unbind
  Request:  { userId: string }
  Response: { state: "UNBOUND", unboundAt: string }
```

### 8.2 信号相关

```yaml
# 生成信号
POST /api/v1/signal/generate
  Request:  { bindingId: string, gameId: string }
  Response: { signalId: string, state: "SIGNAL_GENERATING" }

# 获取信号
GET /api/v1/signal/{signalId}
  Response: { signalId, prediction, status, result }

# 获取活跃信号列表
GET /api/v1/signal/active?userId={userId}
  Response: { signals: Signal[] }

# 获取信号历史
GET /api/v1/signal/history?userId={userId}&page={page}&limit={limit}
  Response: { signals: Signal[], total: number, page: number }
```

### 8.3 Credits 相关

```yaml
# 获取余额
GET /api/v1/credits/balance?userId={userId}
  Response: { balance: number, locked: number }

# 消耗 Credits
POST /api/v1/credits/consume
  Request:  { userId: string, amount: number, purpose: "signal_generation" }
  Response: { transactionId: string, balanceBefore: number, balanceAfter: number }

# 充值 Credits
POST /api/v1/credits/topup
  Request:  { userId: string, amount: number, paymentMethod: string }
  Response: { transactionId: string, newBalance: number }
```

### 8.4 报告相关

```yaml
# 获取报告
GET /api/v1/report/{reportId}
  Response: { reportId, summary, signals, credits }

# 获取用户报告列表
GET /api/v1/report/list?userId={userId}&page={page}
  Response: { reports: ReportSummary[], total: number }
```

---

## 9. Event Schema

### 9.1 客户端事件

```yaml
# 用户提交 URL
event: "binding.url_submitted"
properties:
  url: string
  userId: string
  sessionId: string

# URL 分析完成
event: "binding.site_analyzed"
properties:
  workflowId: string
  provider: string
  supported: boolean
  durationMs: number

# 绑定开始
event: "binding.started"
properties:
  workflowId: string
  provider: string

# 绑定完成
event: "binding.completed"
properties:
  workflowId: string
  bindingId: string
  provider: string
  durationMs: number

# 绑定失败
event: "binding.failed"
properties:
  workflowId: string
  reason: string
  recoverable: boolean
```

### 9.2 信号事件

```yaml
# 信号生成
event: "signal.generated"
properties:
  signalId: string
  userId: string
  gameId: string
  provider: string
  creditsUsed: number
  confidence: number

# 信号激活
event: "signal.activated"
properties:
  signalId: string
  expiresAt: string
  predictionOutcome: string

# 信号过期
event: "signal.expired"
properties:
  signalId: string
  actualOutcome: string
  match: boolean

# 信号失败
event: "signal.failed"
properties:
  signalId: string
  reason: string
  creditsRefunded: boolean
```

### 9.3 Credits 事件

```yaml
# Credits 消耗
event: "credits.consumed"
properties:
  userId: string
  amount: number
  purpose: string
  balanceAfter: number

# Credits 充值
event: "credits.topup"
properties:
  userId: string
  amount: number
  paymentMethod: string
  balanceAfter: number

# Credits 不足
event: "credits.insufficient"
properties:
  userId: string
  required: number
  balance: number
```

### 9.4 报告事件

```yaml
# 报告生成
event: "report.generated"
properties:
  reportId: string
  userId: string
  signalCount: number
  matchRate: number

# 报告查看
event: "report.viewed"
properties:
  reportId: string
  userId: string
```

---

## 10. 前端页面状态

### 10.1 状态 → 页面映射

| 工作流状态 | 前端页面 | UI 元素 |
|-----------|---------|---------|
| INIT | 首页 / 输入页 | URL 输入框 + 提交按钮 |
| URL_RECEIVED | 加载状态 | Loading spinner + "正在分析..." |
| SITE_ANALYZING | 加载状态 | Loading spinner + "正在识别站点..." |
| SITE_SUPPORTED | 确认页 | 站点信息卡片 + "继续绑定"按钮 |
| SITE_UNSUPPORTED | 错误提示 | 错误信息 + 支持站点列表 + 返回输入 |
| ACCOUNT_BINDING_REQUIRED | 授权引导页 | 授权说明 + 跳转三方授权按钮 |
| ACCOUNT_BINDING_IN_PROGRESS | 授权处理中 | 三方授权页（外部）或 Loading |
| ACCOUNT_BOUND | 绑定成功页 | 成功动画 + 账号信息卡片 + "继续"按钮 |
| ACCOUNT_ANALYZING | 加载状态 | Loading spinner + "正在分析账号数据..." |
| MEMBERSHIP_REQUIRED | 会员引导页 | 会员权益对比 + 订阅按钮 |
| CREDITS_REQUIRED | Credits 引导页 | 余额显示 + Credits 套餐 + 购买按钮 |
| SIGNAL_GENERATING | 信号生成中 | 动态卡片 + "AI 正在分析..." |
| SIGNAL_ACTIVE | 信号详情页 | 信号卡片（预测方向 + 置信度 + 因子）+ 倒计时 |
| SIGNAL_EXPIRED | 结果页 | 信号 vs 实际结果 + 匹配/不匹配标记 |
| REPORT_GENERATED | 报告页 | 完整报告（信号列表 + 统计 + Credits） |
| FAILED | 错误页 | 错误原因 + 重试按钮 + 客服联系 |

### 10.2 关键页面描述

**信号详情页 (SIGNAL_ACTIVE)**

```
┌─────────────────────────────────────┐
│  🔮 Signal #sig_a1b2c3d4            │
│                                     │
│  PG Soft · Lucky Dragon · Slot      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  预测: BIG WIN 🟢           │   │
│  │  置信度: 87%                │   │
│  │                             │   │
│  │  因子分解:                   │   │
│  │  历史回报率       ██████░ 92%│   │
│  │  近期活跃度       ████░░ 65%│   │
│  │  玩家趋势         █████░░ 78%│   │
│  └─────────────────────────────┘   │
│                                     │
│  ⏱ 剩余: 23:45:12                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━      │
│  ████████████░░░░░░░░░░░ 48%       │
│                                     │
│  📊 结果将在倒计时结束后更新         │
└─────────────────────────────────────┘
```

**报告页 (REPORT_GENERATED)**

```
┌─────────────────────────────────────┐
│  📋 信号报告                        │
│  2026-05-07                         │
│                                     │
│  总结                               │
│  信号: 5 | 匹配: 4/5 (80%)         │
│  Credits: 消耗 5 | 余额 12         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ #1  PG · Lucky Dragon      │   │
│  │ 预测: BIG WIN ✓ 实际: WIN  │   │
│  │ 置信度: 87%                 │   │
│  ├─────────────────────────────┤   │
│  │ #2  JILI · Gold Rush       │   │
│  │ 预测: LOSS ✓ 实际: LOSS    │   │
│  │ 置信度: 72%                 │   │
│  ├─────────────────────────────┤   │
│  │ #3  SPADE · Dragon Pearl   │   │
│  │ 预测: SMALL WIN ✗ 实际:LOSS│   │
│  │ 置信度: 65%                 │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 11. 后台管理字段

### 11.1 绑定管理

```yaml
binding_records:
  - field: bindingId
    type: string
    admin_ops: [search, filter]
  - field: userId
    type: string
    admin_ops: [search, filter]
  - field: provider
    type: string
    admin_ops: [filter]
  - field: platformUserId
    type: string
    admin_ops: [view]
  - field: authorizationStatus
    type: enum [AUTHORIZED, EXPIRED, REVOKED, PENDING]
    admin_ops: [filter, manual_update]
  - field: bindTime
    type: datetime
    admin_ops: [sort]
  - field: lastVerifiedAt
    type: datetime
    admin_ops: [view]
  - field: unbindTime
    type: datetime?
    admin_ops: [view]
  - field: unbindReason
    type: string?
    admin_ops: [view]
```

### 11.2 信号管理

```yaml
signal_records:
  - field: signalId
    type: string
    admin_ops: [search]
  - field: userId
    type: string
    admin_ops: [search, filter]
  - field: gameInfo (provider, gameName, gameType)
    type: object
    admin_ops: [filter]
  - field: prediction (outcome, confidence)
    type: object
    admin_ops: [view]
  - field: status (state, activatedAt, expiresAt)
    type: object
    admin_ops: [filter, manual_update]
  - field: result (actualOutcome, match)
    type: object
    admin_ops: [view, manual_correction]
  - field: creditsUsed
    type: number
    admin_ops: [view]
  - field: traceId
    type: string
    admin_ops: [search]    # 关联到执行日志
```

### 11.3 Credits 管理

```yaml
credits_records:
  - field: transactionId
    type: string
    admin_ops: [search]
  - field: userId
    type: string
    admin_ops: [search, filter]
  - field: type
    type: enum [consume, topup, refund, bonus]
    admin_ops: [filter]
  - field: amount
    type: number
    admin_ops: [view, sort]
  - field: balanceBefore
    type: number
    admin_ops: [view]
  - field: balanceAfter
    type: number
    admin_ops: [view]
  - field: purpose
    type: string
    admin_ops: [filter]
  - field: createdAt
    type: datetime
    admin_ops: [sort]
```

### 11.4 风控管理

```yaml
risk_records:
  - field: ruleId
    type: string
    admin_ops: [search]
  - field: ruleName
    type: string
    admin_ops: [filter]
  - field: triggerCondition
    type: string
    admin_ops: [view, edit]
  - field: action
    type: enum [warn, limit, block, review]
    admin_ops: [view, edit]
  - field: triggeredCount
    type: number
    admin_ops: [view, sort]
  - field: lastTriggeredAt
    type: datetime
    admin_ops: [sort]
```

---

## 12. 风控检查点

### 12.1 检查点位置

| # | 检查点 | 位置 | 动作 |
|---|--------|------|------|
| CP1 | URL 频率限制 | URL_RECEIVED → SITE_ANALYZING | 同一用户 ≤ 10 URLs/min |
| CP2 | 绑定频率限制 | ACCOUNT_BINDING_REQUIRED → IN_PROGRESS | 同一用户 ≤ 3 binds/min |
| CP3 | 信号生成频率 | ACCOUNT_ANALYZING → SIGNAL_GENERATING | 同一用户 ≤ 5 signals/min |
| CP4 | Credits 异常消耗 | SIGNAL_GENERATING 前 | 日消耗 ≤ 100，异常触发 review |
| CP5 | 多账号检测 | ACCOUNT_BOUND 后 | 同一 IP 绑定 > 3 账号 → 标记 |
| CP6 | URL 黑名单 | SITE_ANALYZING | 匹配黑名单域名 → 直接 block |
| CP7 | Signal 结果异常 | SIGNAL_EXPIRED 后 | 连续 10 次不匹配 → 标记审核 |

### 12.2 处置动作

| 动作 | 说明 | 对用户可见 |
|------|------|---------|
| `warn` | 记录 warning，不阻止操作 | 否 |
| `limit` | 限制速度，返回"请稍后再试" | 是 |
| `block` | 阻止操作，返回明确错误 | 是 |
| `review` | 标记人工审核，暂缓操作 | 是，显示"审核中" |
| `ban` | 封禁用户（管理员手动操作） | 是 |

### 12.3 频率限制规则

```yaml
rules:
  - name: "URL 提交频率"
    windowMs: 60000        # 1 分钟窗口
    maxActions: 10
    action: limit
    errorMessage: "操作太频繁，请稍后再试"

  - name: "绑定频率"
    windowMs: 60000
    maxActions: 3
    action: limit

  - name: "信号生成频率"
    windowMs: 60000
    maxActions: 5
    action: limit

  - name: "日 Credits 消耗上限"
    windowMs: 86400000     # 24 小时
    maxActions: 100
    action: review
```

---

## 13. Credits 消耗规则

### 13.1 消耗标准

| 操作 | Credits | 说明 | 会员 | 备注 |
|------|---------|------|------|------|
| 站点识别 | 0 | 免费 | 免费 | 不消耗 |
| 账号绑定 | 0 | 免费 | 免费 | 不消耗 |
| Signal 生成 | 动态计算（见 13.2） | 按赔率和下注额动态扣点 | 免费 | 会员无限 |
| 报告生成 | 0 | 附赠 | 免费 | 信号生成时自动附赠 |
| 重新追踪 | 0 | 免费 | 免费 | 30 分钟内免费 |

### 13.2 Signal Credits 动态扣点公式（AI-Server VIP 逻辑）

Credits 消耗不是固定值，而是根据信号的赔率和建议下注额动态计算的。公式如下：

```
creditsConsume = ((rate-1) * bet * conversionRate / exchangeRate).toFixed(4)
```

#### 字段详解

| 字段 | 含义 | 数据来源 | 示例 | 作用 |
|------|------|---------|------|------|
| `rate` | 本次信号的赔率倍数（odds multiplier） | 预测引擎输出 | `1.8`, `2.1` | `(rate - 1)` 是净收益倍数。赔率越高，预期净收益越高，扣点越多 |
| `bet` | 本次建议下注金额（站点币种口径） | 预测引擎输出 | `100.00` | 与净收益倍数相乘得到"预期净收益金额（站点币）"。下注越大，扣点越多 |
| `conversionRate` | 点数折算比例 | `level_config.signal_config.rate` | `0.2`, `0.25` | 把"预期净收益"按比例折成"应扣点数价值"。可理解为"按预期收益的多少比例收点数" |
| `exchangeRate` | 站点币种到点数基准的汇率 | 币种配置表 | `1.0`, `0.85` | 在分母。把站点币金额换算为点数单位。汇率越大，同样金额折出来的点数越少 |
| `.toFixed(4)` | 结果保留 4 位小数 | — | — | 统一精度，避免扣减时精度漂移。点数存储通常为 `decimal(19,4)` |

#### 计算示例

```yaml
# 场景: PG Soft · Lucky Dragon · 赔率 1.8 · 建议下注 100
rate: 1.8
bet: 100
conversionRate: 0.2    # level_config.signal_config.rate
exchangeRate: 1.0      # 站点币种与点数 1:1

creditsConsume = ((1.8 - 1) * 100 * 0.2 / 1.0).toFixed(4)
               = (0.8 * 100 * 0.2 / 1.0).toFixed(4)
               = (16 / 1.0).toFixed(4)
               = 16.0000

# 结果: 该信号消耗 16 Credits
```

```yaml
# 场景: 高赔率 + 高汇率站点
rate: 3.5
bet: 200
conversionRate: 0.25
exchangeRate: 0.85     # 站点币种比点数价值低

creditsConsume = ((3.5 - 1) * 200 * 0.25 / 0.85).toFixed(4)
               = (2.5 * 200 * 0.25 / 0.85).toFixed(4)
               = (125 / 0.85).toFixed(4)
               = 147.0588

# 结果: 该信号消耗 147.0588 Credits
```

#### 扣点变化规律

| 变量 | 变化 | 扣点影响 | 业务含义 |
|------|------|---------|---------|
| `rate` (赔率) | ↑ 高 | ↑ 扣点多 | 高赔率信号更值钱 |
| `bet` (建议下注) | ↑ 大 | ↑ 扣点多 | 大注信号消耗更多资源 |
| `conversionRate` | ↑ 高 | ↑ 扣点多 | 平台可调节点数收益率的杠杆 |
| `exchangeRate` | ↑ 高 | ↓ 扣点少 | 贬值币种站点实际扣点更低，公平性调节 |

#### 配置来源

`conversionRate` 和 `exchangeRate` 来自服务端配置，不硬编码：

```yaml
# level_config.signal_config (服务端配置)
signal_config:
  rate: 0.2              # conversionRate, 可调
  rate_vip_adjust: 0.05   # VIP 等级额外折扣

# 币种配置 (currency_config)
currencies:
  - code: "CNY"
    exchangeRate: 1.0
  - code: "VND"
    exchangeRate: 0.85
  - code: "THB"
    exchangeRate: 0.95
```

### 13.3 会员订阅

| 等级 | 价格 | Signal 限额 | 扣点折扣 | 其他权益 |
|------|------|------------|---------|---------|
| Free | 免费 | 5 signals/天 | 全额 | 基础报告 |
| Basic | $9.9/月 | 50 signals/天 | 9 折 | 详细报告 + 因子分解 |
| Pro | $19.9/月 | 无限 | 8 折 | 高级报告 + 实时提醒 + 多平台 |
| Unlimited | $49.9/月 | 无限 | 免费 | 全部功能 + 优先支持 + API 访问 |

会员折扣应用于公式最终值：

```
# Pro 会员: conversionRate 从 0.2 降为 0.16 (8折)
creditsConsume = ((1.8 - 1) * 100 * 0.16 / 1.0).toFixed(4)
               = 12.8000  # 原价 16 → 会员价 12.8
```

### 13.4 Credits 事务保证

```yaml
credits_consume:
  - 必须与 SIGNAL_GENERATING 在同一事务中
  - Signal 生成失败时自动退款（全退）
  - 记录 balanceBefore 和 balanceAfter
  - 记录扣点明细（rate, bet, conversionRate, exchangeRate 等原始因子）
  - 禁止余额为负（不允许透支）
  - 扣点结果 decimal(19,4) 精度，.toFixed(4) 截断
  
audit:
  - 每次扣点记录必须可追溯至具体 signalId
  - 扣点因子(rate/bet/conversionRate/exchangeRate)必须在 event 中落盘
  - 退款记录与原扣点记录关联
```

---

## 14. Signal 生命周期

### 14.1 状态图

```
SIGNAL_GENERATING → SIGNAL_ACTIVE → SIGNAL_EXPIRED
       │                 │
       ▼                 ▼
  FAILED(生成失败)   FAILED(追踪失败 → UNRESOLVED)
```

### 14.2 阶段说明

| 阶段 | 持续时间 | 行为 | 用户可见 |
|------|---------|------|---------|
| GENERATING | ~2-5 秒 | 调用预测引擎，生成信号 | 加载动画 |
| ACTIVE | 1h / 24h（按游戏类型） | 倒计时，等待游戏结果 | 信号详情页 + 倒计时 |
| EXPIRED | — | 获取实际结果，计算 match | 结果展示 |

### 14.3 倒计时策略

| 游戏类型 | ACTIVE 时长 | 依据 |
|---------|------------|------|
| Slot (老虎机) | 1 小时 | 快速出结果 |
| Fishing (捕鱼) | 1 小时 | 快速局 |
| Sports (体育) | 按比赛时间 | 比赛实际时长 |
| E-Sports (电竞) | 按比赛时间 | 比赛实际时长 |
| Card (纸牌) | 30 分钟 | 短局 |
| Lottery (彩票) | 到开奖时间 | 开奖周期 |

### 14.4 超时处理

```
SIGNAL_EXPIRED 时，结果追踪有 3 种结果:

1. 结果已知 (match: true/false)
   → 正常完成，生成报告

2. 结果未知 (平台数据未更新)
   → 状态标记 UNRESOLVED
   → 系统将在 24h 内重试 3 次
   → 3 次后仍无结果 → 标记 UNRESOLVED_FINAL

3. 平台数据不可用 (API 下线/账号解绑)
   → 标记 UNRESOLVED_NO_DATA
   → 不消耗 Credits（退款）
```

---

## 15. 验收标准

### 15.1 功能验收

| # | 标准 | 验证方式 |
|---|------|---------|
| 1 | 用户输入 URL 后 5 秒内返回站点识别结果 | 计时测试 |
| 2 | 支持的站点可正常进入绑定流程 | 端到端测试 |
| 3 | 不支持的站点返回明确错误 + 支持列表 | 功能测试 |
| 4 | OAuth 绑定流程从三方页面发起 | 安全审查 |
| 5 | 绑定完成后 10 秒内完成账号分析 | 性能测试 |
| 6 | Credits 不足时提示明确且不卡死 | 功能测试 |
| 7 | Signal 在 10 秒内生成完成 | 性能测试 |
| 8 | Signal ACTIVE 状态倒计时准确 | 时间测试 |
| 9 | 倒计时结束后 30 秒内结果更新 | 性能测试 |
| 10 | 报告包含所有信号和统计 | 内容校验 |

### 15.2 异常验收

| # | 场景 | 预期行为 |
|---|------|---------|
| 1 | 无效 URL | 返回 INVALID_URL 错误 |
| 2 | 不支持的站点 | 返回 SITE_UNSUPPORTED + 支持列表 |
| 3 | 用户取消授权 | 返回 ACCOUNT_BINDING_REQUIRED，数据保存 |
| 4 | OAuth token 过期 | 自动刷新或引导重新授权 |
| 5 | Credits 不足 | 提示 + 引导购买 |
| 6 | 信号生成失败 | 退款 + 提示重试 |
| 7 | 追踪超时 | 标记 UNRESOLVED + 自动重试 |
| 8 | 网络中断 | 断网提示 + 恢复后继续 |

### 15.3 非功能验收

| # | 指标 | 目标 | 测量方式 |
|---|------|------|---------|
| 1 | 全流程 P95 耗时 | < 60s | trace duration |
| 2 | Signal 生成 P95 耗时 | < 10s | trace duration |
| 3 | Signal 准确率 | > 75% | 长期统计 |
| 4 | 系统可用性 | > 99.5% | uptime monitor |
| 5 | Credits 消耗一致性 | 100% 事务准确 | audit log |

### 15.4 QA 检查清单

```
前端:
  [ ] URL 输入框格式校验（http 前缀校验）
  [ ] 各状态页面的显示和跳转正确
  [ ] 倒计时实时更新
  [ ] 报告数据渲染正确
  [ ] 手机端适配

后端:
  [ ] 状态机所有 16 状态可到达
  [ ] 所有异常转换可恢复
  [ ] Credits 事务原子性（生成失败 → 退款）
  [ ] 风控频率限制正确触发
  [ ] 事件埋点全部上报

安全:
  [ ] OAuth token 不存储明文
  [ ] API 速率限制有效
  [ ] 跨用户数据隔离
  [ ] 管理后台操作审计

集成:
  [ ] 绑定工作流 → 信号生成 → 追踪 → 报告全链路可用
  [ ] Mock Provider 测试覆盖所有状态
  [ ] 三方平台 API 异常模拟测试
```
