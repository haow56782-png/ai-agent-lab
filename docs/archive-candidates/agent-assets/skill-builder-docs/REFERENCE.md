---
name: "Skill Builder Reference"
description: "Frontmatter field specification, directory output structure, verification checklist, forbidden behaviors, and handoff protocols for Claude Code Skills. Referenced by Skill Builder when deep specification details are needed."
---

# Skill Builder Reference

> 本文档是 Skill Builder 的规格参考。**什么时候读**：需要 frontmatter 字段精确规格、验证清单、禁止行为列表或 handoff 协议时。**什么时候不用读**：日常技能创建指导在 `SKILL.md` 中，模板在 `TEMPLATES.md` 中。

---

## 1. Frontmatter 字段规格

### `name`（REQUIRED）

- **类型**：String
- **最大长度**：64 字符
- **格式**：人类友好的展示名称
- **用途**：显示在技能列表、UI 中，加载进 Claude system prompt
- **示例**：
  - ✅ "API Documentation Generator"
  - ✅ "React Component Builder"
  - ❌ "skill-1"（不具描述性）
  - ❌ "This is a very long skill name that exceeds sixty-four characters"（超长）

### `description`（REQUIRED）

- **类型**：String
- **最大长度**：1024 字符
- **格式**：纯文本或极简 markdown
- **必须包含**：
  1. **What** — 技能功能
  2. **When** — Claude 应在什么条件下触发
- **示例**：
  - ✅ "Generate OpenAPI 3.0 documentation from Express.js routes. Use when creating API docs, documenting endpoints, or building API specifications."
  - ❌ "A comprehensive guide to API documentation"（缺少 "when"）

### 注意事项

只有 `name` 和 `description` 是 Claude 实际使用的字段。额外字段（`version`、`author`、`tags` 等）会被忽略，不会报错但无实际效果。

---

## 2. 完整目录结构参考

```
.claude/skills/
└── my-skill/
    ├── SKILL.md                 # REQUIRED: 主技能文件
    ├── README.md                # Optional: 给人看的文档
    ├── scripts/                 # Optional: 可执行脚本
    │   ├── setup.sh
    │   ├── validate.js
    │   └── deploy.py
    ├── resources/               # Optional: 支持文件
    │   ├── templates/
    │   ├── examples/
    │   └── schemas/
    └── docs/                    # Optional: 附加文档
        ├── ADVANCED.md
        ├── TROUBLESHOOTING.md
        └── API_REFERENCE.md
```

---

## 3. Verification

### Validation Checklist

**YAML Frontmatter**:
- [ ] 以 `---` 开始和结束
- [ ] 包含 `name` 字段（≤ 64 字符）
- [ ] 包含 `description` 字段（≤ 1024 字符）
- [ ] description 包含 "what" 和 "when"
- [ ] 无 YAML 语法错误（特殊字符已加引号）

**File Structure**:
- [ ] SKILL.md 存在于 skill 目录中
- [ ] 目录直接在 `~/.claude/skills/[name]/` 或 `.claude/skills/[name]/`
- [ ] 使用清晰的描述性目录名
- [ ] 无嵌套子目录

**Progressive Disclosure**:
- [ ] 核心指令在 SKILL.md（~2-5KB）
- [ ] 高级内容在独立 `docs/` 中
- [ ] 大资源在 `resources/` 目录中
- [ ] 层级之间有清晰的导航指引

**Testing**:
- [ ] Skill 出现在 Claude 的技能列表中
- [ ] description 能在相关查询时触发匹配
- [ ] 指令清晰可执行

---

## 4. Forbidden Behaviors

| 行为 | 后果 |
|------|------|
| description 中缺少 "when" 触发条件 | Claude 无法自主匹配使用场景 |
| name 超过 64 字符 | 技能无法被正确加载 |
| 目录名使用特殊字符或嵌套子目录 | Claude Code 不支持嵌套，技能无法被发现 |
| frontmatter 依赖额外字段 | 字段被忽略，可能造成混淆 |
| 将所有内容堆在 SKILL.md 中 | 增大 context penalty，违背渐进式披露原则 |

---

## 5. Handoff Protocol

| 接收方 | 触发条件 | 传递内容 |
|--------|---------|---------|
| verification-quality | 技能创建完成 | 技能目录路径和验证结果 |
| failure-analysis | 技能创建失败 | 错误上下文和失败阶段 |
| context-engineering-skill | 需要高级 prompt 工程 | 技能需求和已有模板 |
