---
name: "VIB Agent Product Domain"
description: "VIB AI Agent 产品领域技能，定义三方游戏账号绑定流程、授权数据边界、PRD 模板和状态机。使用场景：设计或修改账号绑定流程、定义新 PRD、审查授权安全边界。"
category: project-domain
---

# VIB Agent Product Domain Skill

## 概述

本 skill 定义 VIB AI Agent 的产品领域规范，包括三方游戏账号绑定流程、授权安全边界、状态机和 PRD 编写模板。

## 核心文档

| 文档 | 说明 |
|------|------|
| `docs/signal-flow-state-machine.md` | 三方游戏账号绑定流程状态机（核心版） |
| `docs/vib-agent-prd-template.md` | VIB Agent PRD 编写模板 |
| `docs/domain-model.md` | 领域模型 `ThirdPartyAccount` 实体定义 |

## 绑定流程核心原则

1. **不是让用户从下拉列表选平台，而是让 AI 先识别真实站点**
2. **用户授权是必须的前置步骤** — 无授权不读取数据
3. **授权数据有严格边界** — 禁止密码/私钥/支付/提现权限

## 流程速览

```
INIT → URL_INPUT → SITE_RECOGNIZING → SITE_RECOGNIZED → AUTH_CONFIRM_REQUIRED
                  ↘ INVALID_URL        ↘ UNSUPPORTED_SITE  ↘ AUTH_REJECTED
                                            → THIRD_PARTY_AUTHORIZING → ACCOUNT_INFO_FETCHING
                                                                      ↘ AUTH_FAILED
                                                                  → ACCOUNT_BIND_CONFIRM → ACCOUNT_BOUND → AGENT_ANALYZING → SIGNAL_READY
                                                                    ↘ BIND_FAILED        ↘ ACCOUNT_FETCH_FAILED
```

11 个正常状态 + 7 个失败状态，详细定义见状态机文档。

## 授权数据边界

**允许读取:** platformUserId, nickname, avatar, gameAccountId, siteDomain, supportedGames, authorizationStatus, bindTime

**禁止读取:** 密码, 私钥/API Key, 支付权限, 提现权限, PII

## 异常状态

| 异常 | 可恢复 | 恢复路径 |
|------|--------|----------|
| `INVALID_URL` | 是 | 重新输入 |
| `UNSUPPORTED_SITE` | 是 | 重新输入 |
| `AUTH_REJECTED` | 是 | 重新授权 |
| `AUTH_FAILED` | 是 | 重试 |
| `ACCOUNT_FETCH_FAILED` | 是 | 重试 |
| `ACCOUNT_ALREADY_BOUND` | 条件性 | 查看/解绑 |
| `BIND_FAILED` | 是 | 重试 |
