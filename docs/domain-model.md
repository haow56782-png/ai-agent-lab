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

## Domain Rules (Invariants)

1. **Confidence must be 0.0–1.0** — never outside this range
2. **Every prediction must have ≥ 1 factor** — empty factors = invalid
3. **Game + Timeframe combination must be unique** for metrics queries
4. **Prediction timestamp must be in ISO-8601** — standard across all outputs
