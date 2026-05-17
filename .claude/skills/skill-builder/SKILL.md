---
name: "Skill Builder"
description: "Create new Claude Code Skills with proper YAML frontmatter, progressive disclosure structure, and complete directory organization. Use when you need to build custom skills for specific workflows, generate skill templates, or understand the Claude Skills specification."
category: development
version: "1.0.0"
owner: platform-team

inputs:
  - name: skillRequirements
    type: string
    required: true
    description: "Description of the skill to create, including functionality and trigger conditions"
  - name: skillType
    type: string
    required: false
    description: "Type of skill to generate (basic/intermediate/advanced)"

outputs:
  - name: skill_directory
    type: object
    description: "Created skill directory with SKILL.md and optional resources/scripts/docs"
    alwaysPresent: true
  - name: skill_file
    type: string
    description: "Path to the created SKILL.md file"
    alwaysPresent: true
  - name: error
    type: object
    description: "Error information (errorCode, message)"
    alwaysPresent: false

tools:
  - name: read
    purpose: "Read existing skill files and templates for reference"
    required: true
  - name: write
    purpose: "Create SKILL.md and supporting skill files"
    required: true
  - name: execute
    purpose: "Run validation scripts to verify skill structure"
    required: false

memory:
  required:
    - "skill_templates (Skill Builder template library for basic/intermediate/advanced skills)"
    - "skill_registry (Known skills in the system for reference)"
  ttl: "会话级别"

workflow:
  steps:
    - "需求收集 — 理解要创建的技能的功能和触发条件"
    - "Frontmatter编写 — 设置name和description字段"
    - "Body编写 — 使用渐进式披露结构组织内容"
    - "目录创建 — 建立SKILL.md和可选子目录结构"
    - "验证 — 检查技能是否被正确识别和加载"
  states:
    - "INIT → REQUIREMENTS_COLLECTED → FRONTMATTER_WRITTEN → BODY_WRITTEN → DIRECTORY_CREATED → VALIDATED"
    - "→ VALIDATION_FAILED → FIX"

verification:
  - id: "gate-frontmatter-valid"
    description: "确认YAML frontmatter包含name和description"
    type: existence
    severity: critical
  - id: "gate-description-complete"
    description: "描述包含'what'和'when'两部分"
    type: invariant
    severity: major
  - id: "gate-directory-top-level"
    description: "技能目录在.claude/skills/下的顶级目录"
    type: existence
    severity: critical

failure_modes:
  - when: "YAML frontmatter解析错误（引号缺失、键值对格式错误）"
    code: "FRONTMATTER_PARSE_ERROR"
    recoverable: true
    recovery: "检查引号使用和键值对格式，特殊字符必须加引号"
  - when: "技能目录名称不符合规范（嵌套子目录）"
    code: "INVALID_DIRECTORY_NAME"
    recoverable: true
    recovery: "使用短横线命名的简短描述性名称，确保是顶级目录"
  - when: "description缺少'when'触发条件"
    code: "INCOMPLETE_DESCRIPTION"
    recoverable: true
    recovery: "在description中添加when触发条件说明"
  - when: "name超过64字符"
    code: "NAME_TOO_LONG"
    recoverable: true
    recovery: "缩短name至64字符以内"

fallback:
  strategy: degrade
  plan: "完整技能目录创建时，提供最小SKILL.md模板（仅有name和description的frontmatter + 基本body）"

handoff:
  - to: "verification-quality"
    when: "技能创建完成"
    payload: "技能目录路径、SKILL.md内容和验证结果"
  - to: "failure-analysis"
    when: "技能创建失败"
    payload: "错误上下文和创建阶段"

cost_tracking:
  estimatedTokens: 4000
  estimatedTimeMs: 15000
  recordFields:
    - field: "sectionsCreated"
      description: "创建的SKILL.md章节数"
    - field: "filesCreated"
      description: "创建的文件数"
    - field: "validationErrors"
      description: "验证发现的错误数"
---

# Skill Builder

## 1. 导航地图（先读此节）

本技能使用渐进式披露结构。首次触发时，你只需要读本节来决定下一步：

| 你的场景 | 应该读 | 原因 |
|---------|--------|------|
| 首次创建 Skill，需要完整指导 | ■ **继续读本文** | §2-§6 涵盖了工作流、原则、规范、故障恢复 |
| 需要模板（basic/intermediate/advanced） | → 读 `docs/TEMPLATES.md` | 三个完整模板 + VIB 实践示例 |
| 需要参考 frontmatter 字段规格 / 输出目录 / 验证清单 / 禁止行为 | → 读 `docs/REFERENCE.md` | 合并了字段规格、输出结构、验证清单、handoff 协议 |
| 需要调试故障 | ■ **继续读 §5 Failure Modes** | 常见错误和恢复路径在本文底部 |

> **核心原则**：SKILL.md 只保留你每次都要读的内容。模板和参考材料在独立文件中，需要时按需加载——这正是本技能教的渐进式披露。

---

## 2. Purpose

### What This Skill Does

创建生产级 Claude Code Skill，包含正确的 YAML frontmatter、渐进式披露结构和完整目录组织。

### Prerequisites

- Claude Code 2.0+ 或 Claude.ai 的 Skills 支持
- Markdown 和 YAML 基础

---

## 3. Core Principles

### Progressive Disclosure Architecture

Claude Code 使用 **3 级渐进式披露系统**，支持 100+ Skill 而不产生 context penalty：

#### Level 1: Frontmatter（名称 + 描述）
**加载时机**：Claude Code 启动时，始终加载
**大小**：每 Skill ~200 字符
**用途**：自主技能匹配

```yaml
---
name: "API Builder"
description: "Creates REST APIs..."
---
```

#### Level 2: SKILL.md Body
**加载时机**：技能被触发/匹配时
**大小**：~2-10KB
**用途**：主要指令和工作流

#### Level 3+: 外部文件
**加载时机**：按需导航
**大小**：可变
**用途**：深度参考、模板、示例
**示例**：`docs/TEMPLATES.md`、`docs/REFERENCE.md`

### Content Best Practices

**Front-load keywords in description**:
```yaml
# ✅ GOOD: Keywords first
description: "Generate TypeScript interfaces from JSON schema. Use when converting schemas, creating types, or building API clients."

# ❌ BAD: Keywords buried
description: "This skill helps developers who need to work with JSON schemas by providing a way to generate TypeScript interfaces."
```

**Include trigger conditions**:
```yaml
# ✅ GOOD: Clear "when" clause
description: "Debug React performance issues using Chrome DevTools. Use when components re-render unnecessarily, investigating slow updates, or optimizing bundle size."

# ❌ BAD: No trigger conditions
description: "Helps with React performance debugging."
```

---

## 4. Workflow

### Quick Start

```bash
# 1. Create skill directory (MUST be at top level!)
mkdir -p ~/.claude/skills/my-skill

# 2. Create SKILL.md with YAML frontmatter
cat > ~/.claude/skills/my-skill/SKILL.md << 'EOF'
---
name: "My Skill"
description: "Brief what and when. Max 1024 chars."
---

# My Skill

## What This Skill Does
[instructions]

## Quick Start
[basic usage]
EOF

# 3. Restart Claude Code to detect
```

### Full Workflow

1. **需求收集** — 确定技能功能和触发条件
2. **Frontmatter 编写** — `name` + `description`
3. **Body 编写** — 渐进式披露结构（核心指令在主文件、模板和参考外移）
4. **目录创建** — `SKILL.md` + 可选 `scripts/` `resources/` `docs/`
5. **验证** — 检查 frontmatter 语法 + 目录位置 + 描述完整性

---

## 5. Data Boundaries

### Directory Structure

**必须**：`~/.claude/skills/[skill-name]/SKILL.md`

```
~/.claude/skills/
└── my-skill/
    ├── SKILL.md          # REQUIRED
    ├── README.md         # Optional: 给人看的
    ├── scripts/          # Optional: 可执行脚本
    ├── resources/        # Optional: 模板/示例/schema
    └── docs/             # Optional: 深度参考/故障指南
```

**重要性**：Skill 目录**必须**直接在 `~/.claude/skills/` 或 `<project>/.claude/skills/` 下，**不能嵌套子目录**。

### Skills Locations

| 类型 | 路径 | 范围 | 版本控制 |
|------|------|------|---------|
| 个人 Skill | `~/.claude/skills/` | 所有项目 | 不提交 git |
| 项目 Skill | `<project>/.claude/skills/` | 仅该项目 | 建议提交 git |

### YAML Frontmatter 格式 — 关键规则

```yaml
---
# ✅ CORRECT: 简单字符串
name: "API Builder"
description: "Creates REST APIs with Express and TypeScript."

# ✅ CORRECT: 特殊字符加引号
name: "JSON:API Builder"
description: "Creates JSON:API compliant endpoints: pagination, filtering, relationships."

# ❌ WRONG: 特殊字符无引号 — YAML 解析错误！
name: API:Builder
---
```

**正确 frontmatter 只包含 `name` 和 `description`**。额外字段（`version`、`author`、`tags`）被忽略。

---

## 6. Failure Modes

| Code | 异常 | 可恢复 | 恢复路径 |
|------|------|--------|----------|
| `FRONTMATTER_PARSE_ERROR` | YAML frontmatter 解析错误（引号缺失、格式错误） | 是 | 检查引号使用，特殊字符加引号 |
| `INVALID_DIRECTORY_NAME` | 目录名称不符合规范（嵌套子目录） | 是 | 短横线命名，确保是顶级目录 |
| `INCOMPLETE_DESCRIPTION` | 缺少 "when" 触发条件 | 是 | 在 description 中添加触发条件 |
| `NAME_TOO_LONG` | name 超过 64 字符 | 是 | 缩短至 64 字符以内 |

### Fallback Strategy

| 场景 | 策略 | 行为 |
|------|------|------|
| YAML frontmatter 解析失败 | degrade | 提供最小 frontmatter 模板 |
| 完整目录创建失败 | degrade | 仅生成 SKILL.md |
| 用户需求模糊 | degrade | 生成基础模板并提示补充 |

---

**Created**: 2025-10-19
**Version**: 1.0.0
**Maintained By**: agentic-flow team
