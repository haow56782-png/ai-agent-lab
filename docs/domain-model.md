# VIB AI Agent — Domain Model

## Core Entities

```
┌──────────────┐       ┌──────────────────┐
│    Game      │       │   Prediction      │
│──────────────│       │──────────────────│
│ id: string   │──┐    │ id: string       │
│ name: string │  └──→ │ gameId: string   │
│ provider: enum│      │ outcome: string  │
│ type: enum   │       │ confidence: float│
│ metadata: map│       │ factors: string[]│
└──────────────┘       │ timestamp: DateTime│
                       │ mode: enum       │
                       └──────────────────┘
                              ↑
┌──────────────┐              │
│   Metrics    │              │
│──────────────│              │
│ gameId: string│             │
│ timeframe: enum│            │
│ activeUsers: int│           │
│ totalPreds: int│            │
│ avgAccuracy: float│         │
│ status: enum  │             │
└──────────────┘             │
                              │
┌──────────────┐              │
│  Task (eval) │              │
│──────────────│              │
│ id: string   │              │
│ name: string │              │
│ input: map   │              │
│ criteria: map│              │
│ tags: string[]│             │
└──────────────┘              │
```

## Domain Enums

### GameType
```
SLOT | FISHING | SPORTS | ESPORTS | CARD | LOTTERY
```

### GameProvider (当前关注)
```
PG_SOFT | JILI | SPADE_GAMING | HABANERO | CQ9 | GEMINI
```

### PredictionMode
```
QUICK   → Fast inference, no context
DETAILED → Full analysis with factor breakdown
```

### Timeframe
```
H1 | H24 | D7 | D30
```

### MetricStatus
```
ACTIVE | PAUSED | DATA_PENDING | ERROR
```

### AuthorizationStatus
```
AUTHORIZED → 已授权，可正常读取数据
EXPIRED    → 授权过期，需要重新授权
REVOKED    → 用户取消授权，VIB AI 不再可访问
PENDING    → 授权流程中，尚未完成
```

### AuthorizationMethod
```
OAUTH  → OAuth 2.0 标准授权（推荐）
COOKIE → Cookie/Session 授权（兼容旧平台）
API_KEY → API Key 授权（部分平台支持）
```

## Core Entities

### ThirdPartyAccount

三方游戏平台账号绑定实体，记录用户授权信息和游戏账号基础数据。

```
┌──────────────────────────┐
│  ThirdPartyAccount       │
│──────────────────────────│
│ bindingId: string        │ ← 唯一绑定标识
│ platformUserId: string   │ ← 三方平台用户 ID
│ nickname: string         │ ← 用户昵称
│ avatar: string           │ ← 头像 URL
│ gameAccountId: string    │ ← 游戏账号 ID
│ siteDomain: string       │ ← 站点域名
│ provider: GameProvider   │ ← 平台类型
│ supportedGames: string[] │ ← 该账号支持的游戏列表
│ authorizationStatus: enum│ ← AUTHORIZED/EXPIRED/REVOKED/PENDING
│ authorizationMethod: enum│ ← OAUTH/COOKIE/API_KEY
│ bindTime: string         │ ← ISO-8601 绑定时间
│ lastVerifiedAt: string   │ ← 最近授权验证时间
│ createdAt: string        │ ← ISO-8601
│ updatedAt: string        │ ← ISO-8601
└──────────────────────────┘
```

## 绑定流程状态

绑定流程使用有限状态机管理，详细定义见 `signal-flow-state-machine.md`。

核心流程：**用户输入 URL → AI 识别站点 → 用户授权 → 获取账号信息 → 绑定完成 → Agent 就绪**

```
INIT → URL_INPUT → SITE_RECOGNIZING → SITE_RECOGNIZED → AUTH_CONFIRM_REQUIRED
                  ↘ INVALID_URL        ↘ UNSUPPORTED_SITE  ↘ AUTH_REJECTED
                                            → THIRD_PARTY_AUTHORIZING → ACCOUNT_INFO_FETCHING
                                                                      ↘ AUTH_FAILED
                                                                  → ACCOUNT_BIND_CONFIRM → ACCOUNT_BOUND → AGENT_ANALYZING → SIGNAL_READY
                                                                    ↘ BIND_FAILED        ↘ ACCOUNT_FETCH_FAILED
                                                                  → ACCOUNT_ALREADY_BOUND（跨阶段检测）
```

## Domain Rules (Invariants)

1. **Confidence must be 0.0–1.0** — never outside this range
2. **Every prediction must have ≥ 1 factor** — empty factors = invalid
3. **Game + Timeframe combination must be unique** for metrics queries
4. **Prediction timestamp must be in ISO-8601** — standard across all outputs
5. **ThirdPartyAccount must NEVER store passwords or private keys** — security invariant
6. **Authorization must be explicitly confirmed by the user** — no silent binding
7. **Each ThirdPartyAccount.siteDomain + gameAccountId must be unique** — prevent duplicate bindings
