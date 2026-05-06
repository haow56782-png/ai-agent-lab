---
name: "vib-agent-product-skill"
description: "VIB AI Agent 产品领域技能，定义三方游戏账号绑定流程、授权数据边界、PRD 模板和状态机。使用场景：设计或修改账号绑定流程、定义新 PRD、审查授权安全边界。"
category: domain
version: "0.1.0"
owner: "platform-team"

inputs:
  - name: url
    type: string
    required: true
    description: "三方游戏平台的 URL，用于站点识别"
  - name: userId
    type: string
    required: true
    description: "执行操作的用户 ID"
  - name: userMembership
    type: string
    required: false
    description: "用户会员等级（free/premium/vip）"
  - name: creditsBalance
    type: number
    required: false
    description: "用户当前 Credits 余额"

outputs:
  - name: binding_result
    type: object
    description: "账号绑定结果（含 accountId、provider、绑定时长）"
    alwaysPresent: true
  - name: signal_result
    type: object
    description: "信号生成结果（含 signalId、rate、expiresAt、match）"
    alwaysPresent: false
  - name: error
    type: object
    description: "错误信息（含 errorCode、recoverable、message）"
    alwaysPresent: false

tools:
  - name: read
    purpose: "读取站点信息和账号数据"
    required: true
  - name: execute
    purpose: "执行绑定和信号生成操作"
    required: false

memory:
  required:
    - "binding_state (当前绑定流程的状态和已收集的账号数据)"
    - "signal_history (用户历史的信号记录，用于去重和参考)"
  ttl: "会话级别 — 绑定流程完成后清除中间状态"

workflow:
  steps:
    - "Site Recognition — 识别 URL 对应的游戏平台"
    - "OAuth Binding — 用户授权第三方账号"
    - "Account Analysis — 分析账号数据（game list, recent activity）"
    - "Credits Check — 验证余额是否充足"
    - "Signal Generation — 生成预测信号"
    - "Signal Expiration — 等待结果对比"
    - "Report Generation — 输出完整报告"
  states:
    - "INIT → URL_RECEIVED → SITE_ANALYZING → SITE_SUPPORTED"
    - "→ ACCOUNT_BINDING_REQUIRED → ACCOUNT_BINDING_IN_PROGRESS → ACCOUNT_BOUND"
    - "→ ACCOUNT_ANALYZING → CREDITS_REQUIRED → SIGNAL_GENERATING"
    - "→ SIGNAL_ACTIVE → SIGNAL_EXPIRED → REPORT_GENERATED"
    - "→ SITE_UNSUPPORTED → FAILED"

verification:
  - id: "gate-site-supported"
    description: "确认目标站点在支持列表中"
    type: existence
    severity: critical
  - id: "gate-credits-sufficient"
    description: "确认 Credits 余额满足扣点需求"
    type: invariant
    severity: critical
  - id: "gate-signal-match"
    description: "信号过期后有 match 结果对比"
    type: invariant
    severity: major

failure_modes:
  - when: "URL 格式校验失败"
    code: "INVALID_URL"
    recoverable: true
    recovery: "提示用户重新输入"
  - when: "站点不在支持列表"
    code: "UNSUPPORTED_SITE"
    recoverable: true
    recovery: "列出支持的站点供用户选择"
  - when: "OAuth 超时"
    code: "OAUTH_TIMEOUT"
    recoverable: true
    recovery: "指数退避重试（1s → 4s → 9s）"
  - when: "OAuth 被用户拒绝"
    code: "AUTH_REJECTED"
    recoverable: true
    recovery: "提示用户授权是必需的步骤"
  - when: "Credits 余额不足"
    code: "CREDITS_INSUFFICIENT"
    recoverable: true
    recovery: "进入 CREDITS_REQUIRED 状态，引导充值"
  - when: "信号生成失败"
    code: "SIGNAL_GENERATION_FAILED"
    recoverable: false
    recovery: "记录错误上下文，通知用户稍后重试"

fallback:
  strategy: degrade
  plan: "站点识别服务不可用时使用正则匹配域名（pgsoft.com → PG Soft）；OAuth 服务不可用时提示用户稍后重试而非跳过绑定"

handoff:
  - to: "verification-gate"
    when: "绑定或信号生成完成"
    payload: "输出数据和 gate 配置"
  - to: "failure-analysis"
    when: "进入不可恢复错误状态"
    payload: "错误上下文和 trace ID"

cost_tracking:
  estimatedTokens: 3000
  estimatedTimeMs: 10000
  recordFields:
    - field: "statesCompleted"
      description: "完成的状态数"
    - field: "creditsConsumed"
      description: "消耗的 Credits"
    - field: "errorsEncountered"
      description: "遇到的错误数"
---

# vib-agent-product-skill — VIB Agent Product Domain

## 1. Purpose

本 skill 定义 VIB AI Agent 的产品领域规范，包括三方游戏账号绑定流程、授权安全边界、状态机和 PRD 编写模板。

## 2. References

| 文档 | 说明 |
|------|------|
| `docs/signal-flow-state-machine.md` | 三方游戏账号绑定流程状态机（核心版） |
| `docs/vib-agent-prd-template.md` | VIB Agent PRD 编写模板 |
| `docs/domain-model.md` | 领域模型 `ThirdPartyAccount` 实体定义 |

## 3. Core Principles

1. **不是让用户从下拉列表选平台，而是让 AI 先识别真实站点**
2. **用户授权是必须的前置步骤** — 无授权不读取数据
3. **授权数据有严格边界** — 禁止密码/私钥/支付/提现权限

## 4. Workflow

```
INIT → URL_INPUT → SITE_RECOGNIZING → SITE_RECOGNIZED → AUTH_CONFIRM_REQUIRED
                  ↘ INVALID_URL        ↘ UNSUPPORTED_SITE  ↘ AUTH_REJECTED
                                            → THIRD_PARTY_AUTHORIZING → ACCOUNT_INFO_FETCHING
                                                                      ↘ AUTH_FAILED
                                                                  → ACCOUNT_BIND_CONFIRM → ACCOUNT_BOUND → AGENT_ANALYZING → SIGNAL_READY
                                                                    ↘ BIND_FAILED        ↘ ACCOUNT_FETCH_FAILED
```

11 个正常状态 + 7 个失败状态，详细定义见状态机文档。

## 5. Data Boundaries

**允许读取:** platformUserId, nickname, avatar, gameAccountId, siteDomain, supportedGames, authorizationStatus, bindTime

**禁止读取:** 密码, 私钥/API Key, 支付权限, 提现权限, PII

## 6. Failure Modes

| 异常 | 可恢复 | 恢复路径 |
|------|--------|----------|
| `INVALID_URL` | 是 | 重新输入 |
| `UNSUPPORTED_SITE` | 是 | 重新输入 |
| `OAUTH_TIMEOUT` | 是 | 指数退避重试（1s → 4s → 9s） |
| `AUTH_REJECTED` | 是 | 重新授权 |
| `AUTH_FAILED` | 是 | 重试 |
| `ACCOUNT_FETCH_FAILED` | 是 | 重试 |
| `ACCOUNT_ALREADY_BOUND` | 条件性 | 查看/解绑 |
| `BIND_FAILED` | 是 | 重试 |
| `CREDITS_INSUFFICIENT` | 是 | 进入 CREDITS_REQUIRED 状态，引导充值 |
| `SIGNAL_GENERATION_FAILED` | 否 | 记录错误上下文，通知用户稍后重试 |

## 7. Inputs

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 是 | 三方游戏平台 URL，用于站点识别 |
| `userId` | string | 是 | 执行操作的用户 ID |
| `userMembership` | string | 否 | 会员等级（free / premium / vip） |
| `creditsBalance` | number | 否 | 当前 Credits 余额 |

## 8. Outputs

| 输出 | 类型 | 说明 |
|------|------|------|
| `binding_result` | object | 账号绑定结果（accountId, provider, bindTime） |
| `signal_result` | object | 信号生成结果（signalId, rate, expiresAt, match） |
| `error` | object | 错误信息（errorCode, recoverable, message） |

## 9. When to Use

| 场景 | 说明 |
|------|------|
| 用户提供三方游戏平台 URL | 启动绑定→信号全流程 |
| 设计或修改绑定流程 | 参考状态机和数据边界 |
| 审查授权安全边界 | 确认数据访问范围合规 |

## 10. Verification

- [ ] 目标站点在支持列表中（gate-site-supported）
- [ ] Credits 余额满足扣点需求（gate-credits-sufficient）
- [ ] 信号过期后有 match 结果对比（gate-signal-match）

## 11. Forbidden Behaviors

| 行为 | 后果 |
|------|------|
| 跳过站点支持检查直接绑定 | 在不支持的站点上执行绑定操作 |
| 不扣 Credits 直接生成信号 | 绕过 Credits 消耗规则 |
| 授权失败后无重试机制 | 用户无法从可恢复错误中恢复 |
| 读取密码或私钥 | 违反授权数据边界 |
| 信号过期后不等待 match 结果 | 无法评估信号准确率 |

## 12. Output Template

```yaml
changed_files: []
verification_result:
  total: N
  passed: N
  failed: N
  gates:
    - id: "gate-site-supported"
      status: "passed | failed"
      evidence: "站点识别结果"
```

## 13. VIB Example

### 场景：PG Soft URL → 报告生成

输入 `https://www.pgsoft.com/games/lucky-dragon`：
1. 识别为 PG Soft（支持列表中）
2. OAuth 授权三方账号
3. 分析账号游戏数据
4. Credits 扣点（((rate-1) * bet * conversionRate / exchangeRate).toFixed(4)）
5. 生成信号，进入 SIGNAL_ACTIVE 倒计时
6. 信号过期，对比 match 结果
7. 输出完整报告

## 14. Fallback Strategy

| 场景 | 策略 | 行为 |
|------|------|------|
| 站点识别服务不可用 | degrade | 使用正则匹配域名（pgsoft.com → PG Soft, jili.com → Jili） |
| OAuth 服务不可用 | degrade | 提示用户稍后重试，不跳过绑定 |
| 信号生成服务不可用 | abort | 记录错误上下文，保留已有绑定结果 |

## 15. Handoff Protocol

| 接收方 | 触发条件 | 传递内容 |
|--------|---------|---------|
| verification-gate | 绑定或信号生成完成 | 输出数据 + gate 配置 |
| failure-analysis | 不可恢复错误 | 错误上下文 + trace ID |
