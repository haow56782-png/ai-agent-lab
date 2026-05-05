# CLD (Claude Code) 安装与配置教程

> **文档版本**：v1.0  
> **更新日期**：2026-05-06  
> **适用平台**：macOS (Apple Silicon)  
> **环境版本**：Node.js v25.9.0 / npm 11.12.1 / Claude Code 2.1.128

---

## 阅读对象

本教程适合以下读者：

| 角色 | 阅读重点 | 前置要求 |
|------|---------|---------|
| **前端/全栈开发者** | 第 2-4 章完整流程 | 熟悉终端操作 |
| **AI 应用开发者** | 第 3、5 章（API 配置 + 架构） | 了解 LLM API 概念 |
| **设计工程师** | 第 4、6 章（实战 + 大纲） | 了解 Figma 基础 |
| **技术管理者** | 第 1、5、6 章（概览 + 架构 + 总结） | 了解 AI 编码工具 |
| **DevOps/SRE** | 第 3.1、5 章（配置 + 安全） | 熟悉 API 密钥管理 |

---

## 1. 概述

### 1.1 什么是 Claude Code

Claude Code 是 Anthropic 官方推出的**终端原生 AI 编程助手**（Agent），直接在命令行中运行，能够：

- 理解整个代码仓库的上下文
- 执行文件读写、Shell 命令、git 操作
- 自主规划并执行多步骤开发任务
- 支持插件扩展生态（如 claude-mem 持久记忆）

与 Web 版 Claude 不同，CLD 运行在**本地终端**，直接操作文件系统，具备完整的**工具调用能力**（读文件、写代码、执行命令），是真正的 AI 软件工程师。

### 1.2 核心解决的问题

```
┌─ 传统开发痛点 ─────────────────────────────────┐
│                                                 │
│  ① 上下文切换成本高                             │
│     IDE + 浏览器 + 文档 + 终端 来回切换          │
│                                                 │
│  ② 重复性编码劳动                               │
│     样板代码、CRUD、配置编写、迁移脚本            │
│                                                 │
│  ③ 知识碎片化                                   │
│     代码改完忘了为什么改，项目历史难以追溯        │
│                                                 │
│  ④ 跨工具协作复杂                               │
│     Figma 设计 → 代码实现 → PR 提交 链路长       │
│                                                 │
└─────────────────────────────────────────────────┘
```

Claude Code 通过**终端 Agent** 模式解决这些问题：

| 痛点 | CLD 的解决方式 |
|------|---------------|
| 上下文切换 | 在终端中直接对话，CLD 自动读取文件、执行命令 |
| 重复劳动 | 自然语言描述需求，CLD 自主完成编码 |
| 知识碎片化 | claude-mem 插件持久化记录决策和发现 |
| 跨工具协作 | CLD 可直接调用 Figma API、git、gh CLI 等 |

### 1.3 架构全景

```
┌─────────────────────────────────────────────────────────────┐
│                   用户终端 (Terminal)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Claude Code REPL / CLI                 │   │
│  │  自然语言 ↔ 工具调用 ↔ 文件系统 ↔ API               │   │
│  └──────────┬──────────────────────────────────────────┘   │
│             │                                               │
│     ┌───────┼───────────────┐                              │
│     │       │               │                              │
│     ▼       ▼               ▼                              │
│  ┌─────┐ ┌─────┐ ┌──────────────────┐                     │
│  │文件  │ │Shell│ │    Anthropic API  │                     │
│  │系统  │ │命令 │ │  (或兼容代理)      │                     │
│  └─────┘ └─────┘ └────────┬─────────┘                     │
│                           │                                │
│                    ┌──────┴──────┐                         │
│                    │  DeepSeek    │  ← 实际后端模型          │
│                    │  v4 Flash    │                         │
│                    └─────────────┘                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              插件生态 (Plugins)                      │   │
│  │  ┌───────────┐ ┌──────────┐ ┌──────────────────┐   │   │
│  │  │claude-mem │ │ MCP Server│ │ 自定义 Skill     │   │   │
│  │  │  持久记忆  │ │  外部工具  │ │  领域能力         │   │   │
│  │  └───────────┘ └──────────┘ └──────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 架构说明

| 层级 | 组件 | 说明 |
|------|------|------|
| **交互层** | REPL / CLI | 终端中的对话界面，支持连续多轮交互 |
| **推理层** | Claude Code Agent | 理解任务 → 规划步骤 → 调用工具 → 迭代完成 |
| **执行层** | 工具调用系统 | 文件读写、Shell 命令、Web 搜索、API 请求等 |
| **后端** | API 网关 → LLM | 通过 Anthropic 协议兼容层接入 DeepSeek v4 Flash |
| **扩展层** | 插件 & MCP | claude-mem 记忆插件、MCP Server 外部工具集成 |

### 1.4 本项目的实际配置

本项目 `ai-agent-lab` 使用的详细配置：

```json
{
  "系统":   "macOS 26.3.1 (Darwin 25.3.0, ARM64)",
  "Shell":  "/bin/zsh",
  "Node":   "v25.9.0 (via Homebrew)",
  "npm":    "11.12.1",
  "CLD":    "2.1.128 (@anthropic-ai/claude-code)",
  "后端":   "DeepSeek v4 Flash (API 兼容 Anthropic 协议)",
  "插件":   "claude-mem@thedotmack v12.6.2",
  "项目":   "VIB AI Agent Platform — 游戏预测平台"
}
```

---

## 2. 安装流程

### 2.1 安装 Homebrew（包管理器）

macOS 推荐通过 Homebrew 管理开发工具。打开终端（Terminal.app 或 iTerm2）执行：

```bash
# 安装 Homebrew（如尚未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装后配置 PATH（Apple Silicon 必须）
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# 验证安装
brew --version
```

> **📸 截图建议**：终端执行 `brew --version` 命令，显示 Homebrew 版本号输出的画面。

### 2.2 安装 Node.js 和 npm

Claude Code 依赖 Node.js 运行环境，通过 Homebrew 安装：

```bash
# 安装 Node.js（含 npm）
brew install node

# 验证版本
node --version    # 应输出 v25.9.0 或更高
npm --version     # 应输出 11.12.1 或更高
```

Apple Silicon Mac 上的 Node.js 安装在 `/opt/homebrew/bin/node`，npm 包全局安装至 `/opt/homebrew/lib/node_modules/`。

> **📸 截图建议**：终端执行 `node --version && npm --version`，同时显示两个版本号的画面。

### 2.3 全局安装 Claude Code

通过 npm 全局安装 `@anthropic-ai/claude-code`：

```bash
npm install -g @anthropic-ai/claude-code
```

安装过程会下载 CLI 二进制文件和依赖。安装完成后，CLD 命令位于 `~/.local/bin/claude`。

> **📸 截图建议**：npm install 命令执行过程及安装完成的输出。

### 2.4 验证安装

确保 `claude` 命令可用：

```bash
# 检查版本
claude --version
# 预期输出：2.1.128 (Claude Code)

# 查看帮助
claude --help
```

如果 `claude` 命令未找到，检查 `~/.local/bin` 是否在 PATH 中。zsh 用户的配置通常如下：

```bash
# ~/.zshrc 或 ~/.zprofile 中应有：
. "$HOME/.local/bin/env"
```

> **📸 截图建议**：单独执行 `claude --version`，清晰展示版本号。

---

## 3. 配置与初始化

### 3.1 API 网关配置

本项目使用 DeepSeek 作为后端模型（兼容 Anthropic API 协议），通过 settings.json 配置：

```bash
# 创建或编辑 Claude Code 全局设置
# 文件路径：~/.claude/settings.json
```

配置文件内容如下：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "ANTHROPIC_MODEL": "Deepseek-v4-flash",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "Deepseek-v4-flash",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "Deepseek-v4-flash",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "Deepseek-v4-flash"
  }
}
```

**关键配置说明**：

| 配置项 | 作用 | 说明 |
|--------|------|------|
| `ANTHROPIC_BASE_URL` | API 端点 | 指向兼容 Anthropic 协议的后端服务 |
| `ANTHROPIC_AUTH_TOKEN` | 认证密钥 | 用于 API 鉴权（请勿提交到 git） |
| `ANTHROPIC_MODEL` | 模型选择 | 指定使用的模型 ID |
| `ANTHROPIC_DEFAULT_*_MODEL` | 模型映射 | 将 Opus/Sonnet/Haiku 映射到同一模型 |

> **📸 截图建议**：VSCode 或文本编辑器打开 settings.json，展示配置内容的画面。

### 3.2 项目初始化

进入项目目录，启动 Claude Code REPL：

```bash
# 进入项目目录
cd /Users/linda/ai-agent-lab

# 启动交互式会话
claude
```

首次启动时，Claude Code 会：
1. 检查当前目录是否已有 `CLAUDE.md` 项目指令
2. 读取项目文件建立上下文
3. 显示欢迎信息并进入对话模式

> **📸 截图建议**：终端执行 `claude` 后 REPL 启动、显示欢迎信息的画面。

### 3.3 安装插件（可选）

以 claude-mem（持久记忆插件）为例：

```bash
# 通过插件市场安装
# 在 settings.json 中配置插件源：
{
  "extraKnownMarketplaces": {
    "thedotmack": {
      "source": {
        "source": "github",
        "repo": "thedotmack/claude-mem"
      }
    }
  }
}
```

插件启用后，Claude 在每次对话中自动加载记忆上下文，包括项目决策、用户偏好、发现记录等。

> **📸 截图建议**：插件安装成功或插件列表显示 claude-mem 已启用的画面。

---

## 4. 使用入门

### 4.1 REPL 交互模式

启动 `claude` 后进入 REPL（Read-Eval-Print-Loop）模式：

```
╭──────────────────────────────────────────╮
│  ❯ claude                                │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Welcome to Claude Code             │  │
│  │                                    │  │
│  │  /help      帮助                   │  │
│  │  /clear     清除对话               │  │
│  │  /config    设置                   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ ❯ 这个项目是做什么的？             │  │
│  │                                    │  │
│  │ ░ 根据 CLAUDE.md，这是一个         │  │
│  │ ░ AI Agent 平台的游戏预测项目...    │  │
│  └────────────────────────────────────┘  │
│                                          │
╰──────────────────────────────────────────╯
```

**常用命令**：

| 命令 | 作用 |
|------|------|
| `/help` | 查看帮助 |
| `/clear` | 清除当前对话 |
| `/config` | 修改设置（主题/模型等） |
| `! <命令>` | 执行 Shell 命令并返回结果 |
| 直接输入 | 自然语言对话/任务指令 |

> **📸 截图建议**：REPL 中一次完整对话交互的画面（用户提问 + AI 回答）。

### 4.2 权限与安全

CLD 工具调用时，会在终端显示权限请求：

```
┌─── Tool Permission ─────────────────────┐
│                                         │
│  Claude wants to run:                   │
│  $ npm install -g @anthropic-ai/claude- │
│    code                                 │
│                                         │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │   Deny   │  │  Allow This Session  │ │
│  └──────────┘  └──────────────────────┘ │
│                                         │
│  [Learn about permissions]              │
└─────────────────────────────────────────┘
```

权限模式可选择：
- **自动**：常用命令自动放行
- **交互**：每次工具调用需确认
- **允许命令**：预先授权特定命令

> **📸 截图建议**：CLD 显示权限弹窗的画面，展示允许/拒绝按钮。

---

## 5. 项目实战：VIB AI Agent Platform

### 5.1 项目概览

本项目是一个 **AI 驱动的游戏预测平台**，包含：

- 品牌识别系统（VIB AI）
- 设计系统（Figma 驱动）
- 移动端 H5 页面
- 管理后台
- 数据采集与标注系统

### 5.2 与 CLD 的深度集成

```
┌─────────────────────────────────────────────────┐
│             ai-agent-lab 工作流                    │
│                                                   │
│  Figma API ──→ 设计 Token ──→ CSS 变量 ──→ UI    │
│      ↑              │              │              │
│      └────── CLD 自动提取 ──────────┘              │
│                                                   │
│  claude-mem 持久化：                              │
│    • 品牌色变更记录                               │
│    • 设计决策上下文                               │
│    • Figma 帧映射关系                             │
│    • 架构决策记录                                 │
└─────────────────────────────────────────────────┘
```

### 5.3 CLAUDE.md 项目指令

每个项目根目录的 `CLAUDE.md` 是 CLD 的行为指南，包含：

- **项目概述**：项目名称、用途
- **设计系统**：Token 文件索引与使用规则
- **Figma 源**：设计文件链接
- **约定规则**：代码风格、命名规范

```markdown
## Token Usage Rules

1. Use `--vib-*` tokens in CSS, never hardcode color values
2. `[data-theme="dark"]` is the default; light mode overrides via `[data-theme="light"]`
3. All button radii = 30px (`--vib-radius-xl`)
4. Primary brand color: `#4E41FF`, gold accent: `#FFDE6C→#F7981D` gradient
```

---

## 6. 总结

### 6.1 安装流程速查

```
Step 1: brew install node          ← 安装运行时
Step 2: npm install -g @anthropic-ai/claude-code  ← 安装 CLD
Step 3: claude --version           ← 验证安装
Step 4: 配置 ~/.claude/settings.json  ← 配置 API
Step 5: cd <project> && claude     ← 启动
```

### 6.2 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| `claude: command not found` | `~/.local/bin` 不在 PATH | 执行 `. "$HOME/.local/bin/env"` |
| API 请求失败 | Base URL 或 Token 错误 | 检查 `settings.json` 配置 |
| 模型响应慢 | 后端模型负载高 | 切换模型或降低请求复杂度 |
| 权限弹窗频繁 | 权限模式为"交互" | 设置允许命令白名单 |

### 6.3 核心优势

- **端到端**：从安装到项目实战，一条龙完成
- **安全可控**：权限分级，每一步操作透明可追溯
- **可扩展**：插件生态 + MCP Server + 自定义 Skill
- **记忆持久**：跨会话保留上下文，不丢失项目历史

---

> **下一阶段**：深入学习 [Claude Code 官方文档](https://docs.anthropic.com/en/docs/claude-code/overview)  
> **问题反馈**：通过 `claude` REPL 中输入 `/feedback` 提交
