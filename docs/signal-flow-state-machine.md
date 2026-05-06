# VIB AI Agent — 三方游戏账号绑定流程状态机

## 概述

本文档定义 VIB AI Agent 与第三方游戏平台的账号绑定流程。用户通过输入游戏站点 URL 启动绑定，系统识别平台信息后经用户授权完成绑定。

核心设计理念：**不是让用户从下拉列表选平台，而是让 AI 先识别真实站点，再以授权方式建立账号数据连接。**

## 设计原则

1. **隐私优先** — 明确禁止读取密码、私钥、支付权限、提现权限
2. **用户授权** — 每次绑定需用户明确确认授权范围
3. **可审计** — 所有绑定操作记录时间戳和授权状态
4. **可回退** — 授权失败、拒绝、不支持的站点都有明确定义的状态
5. **AI 先识别** — 系统自动识别站点，无需用户手动选择平台类型

## 流程状态机（核心版）

```
                    ┌──────────────────────────┐
                    │         INIT              │
                    │    初始状态，等待输入       │
                    └────────────┬─────────────┘
                                 │ 用户输入游戏站点 URL
                                 ▼
                    ┌──────────────────────────┐
                    │       URL_INPUT           │
                    │    输入 + 校验 URL 格式     │
                    └────────────┬─────────────┘
                         ┌──────┴──────┐
                         │             │
                     无效             有效
                         │             │
                         ▼             ▼
               ┌──────────────┐  ┌──────────────────────────┐
               │  INVALID_URL  │  │    SITE_RECOGNIZING       │
               │  返回错误     │  │  系统自动识别站点          │
               └──────────────┘  │  - 请求站点元数据          │
                                 │  - 识别游戏平台             │
                                 │  - 检测是否支持             │
                                 │  - 确定授权方式             │
                                 └────────────┬─────────────┘
                                      ┌──────┴──────┐
                                      │             │
                                  不支持          识别成功
                                      │             │
                                      ▼             ▼
                              ┌──────────────┐  ┌──────────────────────────┐
                              │UNSUPPORTED_   │  │    SITE_RECOGNIZED       │
                              │   SITE        │  │  展示站点识别结果        │
                              │  返回错误     │  │  - 平台名称/LOGO         │
                              └──────────────┘  │  - 游戏名称               │
                                                 │  - 授权方式说明           │
                                                 │  - 支持游戏列表           │
                                                 └────────────┬─────────────┘
                                                               │
                                                               ▼
                                                 ┌──────────────────────────┐
                                                 │  AUTH_CONFIRM_REQUIRED    │
                                                 │  等待用户授权确认         │
                                                 │  - 展示授权范围           │
                                                 │  - 展示安全声明           │
                                                 └────────────┬─────────────┘
                                                      ┌──────┴──────┐
                                                      │             │
                                                   拒绝          确认同意
                                                      │             │
                                                      ▼             ▼
                                              ┌──────────────┐  ┌──────────────────────────┐
                                              │AUTH_REJECTED  │  │ THIRD_PARTY_AUTHORIZING   │
                                              │  返回提示     │  │  执行三方授权             │
                                              └──────────────┘  │  - OAuth 跳转             │
                                                                 │  - 用户登录               │
                                                                 │  - 令牌获取               │
                                                                 └────────────┬─────────────┘
                                                                      ┌──────┴──────┐
                                                                      │             │
                                                                   失败          成功
                                                                      │             │
                                                                      ▼             ▼
                                                              ┌──────────────┐  ┌──────────────────────────┐
                                                              │ AUTH_FAILED   │  │ ACCOUNT_INFO_FETCHING    │
                                                              │  返回错误     │  │  获取三方账号基本信息     │
                                                              └──────────────┘  │  - 请求账号数据           │
                                                                                 │  - 验证数据完整性         │
                                                                                 └────────────┬─────────────┘
                                                                                      ┌──────┴──────┐
                                                                                      │             │
                                                                                   失败          成功
                                                                                      │             │
                                                                                      ▼             ▼
                                                                              ┌──────────────┐  ┌──────────────────────────┐
                                                                              │ACCOUNT_FETCH_│  │  ACCOUNT_BIND_CONFIRM    │
                                                                              │   FAILED     │  │  完成账号绑定            │
                                                                              │  返回错误     │  │  - 写入持久化存储        │
                                                                              └──────────────┘  │  - 记录绑定时间          │
                                                                                                │  - 设置授权状态          │
                                                                                                └────────────┬─────────────┘
                                                                                                     ┌──────┴──────┐
                                                                                                     │             │
                                                                                                  失败          成功
                                                                                                     │             │
                                                                                                     ▼             ▼
                                                                                             ┌──────────────┐  ┌──────────────────────────┐
                                                                                             │  BIND_FAILED  │  │     ACCOUNT_BOUND         │
                                                                                             │  返回错误     │  │  绑定完成，数据就绪      │
                                                                                             └──────────────┘  └────────────┬─────────────┘
                                                                                                                            │
                                                                                                                            ▼
                                                                                                              ┌──────────────────────────┐
                                                                                                              │   AGENT_ANALYZING        │
                                                                                                              │  Agent 分析游戏数据      │
                                                                                                              │  - 加载历史数据          │
                                                                                                              │  - 计算初始基线          │
                                                                                                              │  - 准备预测模型          │
                                                                                                              └────────────┬─────────────┘
                                                                                                                            │
                                                                                                                            ▼
                                                                                                              ┌──────────────────────────┐
                                                                                                              │     SIGNAL_READY         │
                                                                                                              │  Agent 就绪，可提供预测  │
                                                                                                              │  ★ 最终状态              │
                                                                                                              └──────────────────────────┘

       异常路径（跨阶段）:
           任何阶段检测到该账号已绑定 ──→ ACCOUNT_ALREADY_BOUND ──→ 返回提示 + 已有绑定信息
```

## 状态定义

### 正常流程状态

| 状态 | 说明 | 用户可见 | 下一跳 |
|------|------|----------|--------|
| `INIT` | 初始状态，等待用户输入 URL | 输入框 | `URL_INPUT` |
| `URL_INPUT` | 用户输入 URL，系统校验格式 | 输入中 + 实时校验 | `INVALID_URL` / `SITE_RECOGNIZING` |
| `SITE_RECOGNIZING` | 系统正在识别站点，请求元数据 | 加载动画 + 提示"正在识别..." | `UNSUPPORTED_SITE` / `SITE_RECOGNIZED` |
| `SITE_RECOGNIZED` | 识别完成，展示站点信息 | 平台名称、游戏、支持列表 | `AUTH_CONFIRM_REQUIRED` |
| `AUTH_CONFIRM_REQUIRED` | 等待用户确认授权 | 授权范围 + 安全声明 + [确认/拒绝] | `AUTH_REJECTED` / `THIRD_PARTY_AUTHORIZING` |
| `THIRD_PARTY_AUTHORIZING` | 执行三方授权（OAuth/其他） | 跳转中/加载 | `AUTH_FAILED` / `ACCOUNT_INFO_FETCHING` |
| `ACCOUNT_INFO_FETCHING` | 获取三方账号基本信息 | 加载中 | `ACCOUNT_FETCH_FAILED` / `ACCOUNT_BIND_CONFIRM` |
| `ACCOUNT_BIND_CONFIRM` | 写入绑定数据，完成绑定 | — | `BIND_FAILED` / `ACCOUNT_BOUND` |
| `ACCOUNT_BOUND` | 绑定完成，数据可用 | 提示"绑定成功" | `AGENT_ANALYZING` |
| `AGENT_ANALYZING` | Agent 首次分析数据 | 提示"正在分析数据..." | `SIGNAL_READY` |
| `SIGNAL_READY` | ★ 终态 — Agent 就绪可提供预测 | 显示"就绪，开始预测" | — |

### 失败/异常状态

| 状态 | 触发条件 | 可恢复 | 恢复路径 |
|------|----------|--------|----------|
| `INVALID_URL` | URL 格式错误、缺少协议头 | 是 | 重新输入 → `URL_INPUT` |
| `UNSUPPORTED_SITE` | 站点不在支持列表 | 是 | 重新输入 → `URL_INPUT` |
| `AUTH_REJECTED` | 用户明确拒绝授权 | 是 | 重新发起 → `AUTH_CONFIRM_REQUIRED` |
| `AUTH_FAILED` | OAuth 超时、令牌获取失败 | 是 | 重试 → `THIRD_PARTY_AUTHORIZING` |
| `ACCOUNT_FETCH_FAILED` | 三方 API 超时、数据异常 | 是 | 重试 → `ACCOUNT_INFO_FETCHING` |
| `ACCOUNT_ALREADY_BOUND` | 该账号已绑定（跨阶段） | 条件性 | 查看绑定 / 解绑后重试 |
| `BIND_FAILED` | 持久化写入失败 | 是 | 重试 → `ACCOUNT_BIND_CONFIRM` |

## 授权数据边界

### 允许读取

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `platformUserId` | string | 三方平台用户 ID | `"uid_12345"` |
| `nickname` | string | 用户昵称 | `"PlayerOne"` |
| `avatar` | string | 头像 URL | `"https://cdn.game.com/avatars/1.jpg"` |
| `gameAccountId` | string | 游戏账号 ID | `"ga_67890"` |
| `siteDomain` | string | 站点域名 | `"www.pgsoft.com"` |
| `supportedGames` | string[] | 该账号支持的游戏列表 | `["Gem Saviour", "Fortune Tiger"]` |
| `authorizationStatus` | enum | 授权状态 | `AUTHORIZED` / `EXPIRED` / `REVOKED` |
| `bindTime` | DateTime (ISO-8601) | 绑定时间 | `"2026-05-06T10:00:00Z"` |

### 禁止读取

| 数据类型 | 原因 |
|----------|------|
| 密码 | 安全红线，VIB AI 无权也不应触碰 |
| 私钥 / API Key | 防止身份冒充 |
| 支付权限 | 超出预测分析范畴 |
| 提现权限 | 超出预测分析范畴 |
| 个人身份信息 (PII) | 隐私保护，仅保留游戏内身份 |

## 异常处理

| 异常状态 | 触发条件 | 用户提示 | 恢复路径 |
|----------|----------|----------|----------|
| `INVALID_URL` | URL 格式错误、缺少协议头、无法解析的域名 | "请输入有效的游戏站点 URL，例如 https://www.example.com" | 重新输入 URL → `URL_INPUT` |
| `UNSUPPORTED_SITE` | 站点不在支持列表中、无法识别的平台 | "暂不支持该站点，当前支持的游戏平台：PG Soft、JILI、Spade Gaming..." | 重新输入 → `URL_INPUT` |
| `AUTH_REJECTED` | 用户在授权页面点击拒绝 | "已取消授权。VIB AI 需要授权才能读取游戏账号信息" | 重新授权 → `AUTH_CONFIRM_REQUIRED` |
| `AUTH_FAILED` | OAuth 超时、令牌获取失败、三方服务不可用 | "授权失败，请稍后重试。如果持续失败，请联系平台客服" | 重试 → `THIRD_PARTY_AUTHORIZING` |
| `ACCOUNT_FETCH_FAILED` | 网络超时、三方 API 返回错误、数据格式异常 | "获取账号信息失败，请检查网络后重试" | 重试 → `ACCOUNT_INFO_FETCHING` |
| `ACCOUNT_ALREADY_BOUND` | 该三方账号已绑定到当前 VIB AI 实例 | "该账号已绑定，无需重复绑定" | 查看绑定或解绑后重试 |
| `BIND_FAILED` | 本地持久化写入失败（磁盘/IO 错误） | "绑定写入失败，请重试" | 重试 → `ACCOUNT_BIND_CONFIRM` |

## 授权范围声明

授权时必须向用户明确展示以下范围描述：

> **VIB AI Agent 将获取以下权限：**
> - 读取游戏账号基础信息（昵称、头像、账号 ID）
> - 读取游戏历史数据和统计数据
> - 基于数据提供 AI 预测分析
>
> **VIB AI Agent 不会：**
> - 读取或存储您的密码
> - 执行任何支付或提现操作
> - 在您的账号上执行游戏操作
> - 将数据分享给第三方

## 流程示例

### 正常绑定流程

```
用户输入: https://www.pgsoft.com/play?game=gem-saviour
系统 → [SITE_RECOGNIZING] 正在识别站点...
系统 → [SITE_RECOGNIZED] 识别结果:
  ┌─────────────────────────────────────┐
  │  平台: PG Soft                      │
  │  游戏: Gem Saviour                  │
  │  授权方式: OAuth 2.0                │
  │  支持游戏: Gem Saviour, Dragon Hatch│
  ├─────────────────────────────────────┤
  │  VIB AI Agent 将获取:               │
  │  ✓ 账号基础信息 (昵称/头像/ID)      │
  │  ✓ 游戏历史数据                     │
  │  ✗ 不会读取密码/支付/提现           │
  │                                     │
  │    [同意并授权]     [取消]          │
  └─────────────────────────────────────┘
用户 → [AUTH_CONFIRM_REQUIRED] 点击"同意并授权"
系统 → [THIRD_PARTY_AUTHORIZING] OAuth 跳转 → 用户登录 → 授权回调
系统 → [ACCOUNT_INFO_FETCHING] 获取账号信息...
系统 → [ACCOUNT_BIND_CONFIRM] 绑定写入...
系统 → [ACCOUNT_BOUND] ✅ "绑定成功！"
系统 → [AGENT_ANALYZING] "正在分析你的游戏数据..."
系统 → [SIGNAL_READY] ✅ "Gem Saviour 预测就绪，当前置信度 82%"
```

### 异常流程示例

```
用户输入: httpx://invalid-url
系统 → [INVALID_URL]
  "URL 格式无效，请以 http:// 或 https:// 开头"

用户输入: https://unsupported-site.com/game
系统 → [SITE_RECOGNIZING] → [UNSUPPORTED_SITE]
  "暂不支持该站点，当前支持: PG Soft, JILI, Spade Gaming, Habanero, CQ9"

用户 → [AUTH_CONFIRM_REQUIRED] 点击取消
系统 → [AUTH_REJECTED]
  "已取消授权。你可以随时重新绑定"
```

## 与 Domain Model 的映射

| 状态机状态 | 对应 ThirdPartyAccount 字段 |
|------------|---------------------------|
| `SITE_RECOGNIZED` | `provider`, `siteDomain`, `supportedGames` 已填充 |
| `ACCOUNT_BOUND` | 全部字段填充，`authorizationStatus=AUTHORIZED` |
| `AUTH_REJECTED` | `authorizationStatus=REVOKED` |
| `SIGNAL_READY` | `authorizationStatus=AUTHORIZED`, `lastVerifiedAt` 已更新 |
