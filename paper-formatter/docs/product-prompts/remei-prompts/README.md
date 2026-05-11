# remei 迭代优化 — Prompt 文件索引

> 共 6 个文件，按编号顺序加载执行

```
remei-prompts/
├── 00-global-context.md              # 全局上下文（每次必须先加载）
│   └── 角色 / 系统背景 / 技术约束 / 状态色 / 执行纪律 / 禁止事项
│
├── 01-core-experience-P0.md          # P0 核心体验闭环
│   ├── Task 1-1  全局进度状态 + 人话提示
│   ├── Task 1-2  默认变更清单模式
│   └── Task 1-3  操作撤销机制
│
├── 02-cognitive-noise-reduction-P1A.md  # P1-A 认知降噪
│   ├── Task 2-1  步骤标签学生语言化 + 等待反馈
│   ├── Task 2-2  通过项默认折叠 + 过滤 Tab
│   ├── Task 2-3  规则按文档位置分类
│   └── Task 2-4  错误状态与边界场景兜底
│
├── 03-delivery-confidence-P1B.md      # P1-B 交付信心与操作效率
│   ├── Task 3-1  导出前确认摘要页
│   ├── Task 3-2  "零篡改"翻译为人话
│   ├── Task 3-3  数字徽标语义化
│   └── Task 3-4  规则搜索 + 批量展开/收起
│
├── 04-preview-linkage-P1C.md          # P1-C 预览区联动与差异高亮
│   ├── Task 4-1  规则报告 ↔ 预览区双向联动
│   ├── Task 4-2  差异高亮系统
│   └── Task 4-3  缩略图导航增强 + 仅变更页重定位
│
└── 05-experience-enhancement-P2.md    # P2 体验增强
    ├── Task 5-1  上传区拖拽优化
    ├── Task 5-2  最近检测历史（localStorage）
    ├── Task 5-3  首次使用信任建设
    └── Task 5-4  快捷导航 + 键盘快捷键
```

---

## CLI 使用方式

### 方式一：逐文件加载（推荐）

每次会话加载 `00` + 一个子文件，避免上下文过长导致漂移：

```bash
# 第一轮：执行 P0
cat 00-global-context.md 01-core-experience-P0.md | claude

# 第二轮：执行 P1-A
cat 00-global-context.md 02-cognitive-noise-reduction-P1A.md | claude

# 第三轮：执行 P1-B
cat 00-global-context.md 03-delivery-confidence-P1B.md | claude

# 第四轮：执行 P1-C
cat 00-global-context.md 04-preview-linkage-P1C.md | claude

# 第五轮：执行 P2
cat 00-global-context.md 05-experience-enhancement-P2.md | claude
```

### 方式二：作为 System Prompt

将 `00-global-context.md` 设为 system prompt，子文件作为 user message 发送。

### 方式三：Cursor / Claude Code 项目

将所有文件放入项目的 `.cursor/prompts/` 或 `CLAUDE.md` 引用路径中。

---

## 覆盖的完整优化项（#1-#15）

| # | 来源 | 对应 Task | 优先级 |
|---|------|-----------|--------|
| 1 | 原清单 | Task 5-1 上传区 + Task 5-3 信任建设 | P2 |
| 2 | 原清单 | Task 1-3 操作撤销 | P0 |
| 3 | 原清单 | Task 3-4 规则搜索 + Task 2-2 批量 | P1 |
| 4 | 原清单 | Task 4-3 缩略图 + Task 5-4 导航 | P1/P2 |
| 5 | 原清单 | **已砍掉**（目标用户只是本科生） | — |
| 6 | 原清单 | **降为 P3**（品牌感/深色模式） | P3 |
| 7 | 新增 | Task 1-1 全局进度 + 人话提示 | P0 |
| 8 | 新增 | Task 2-1 步骤标签学生语言化 | P1 |
| 9 | 新增 | Task 2-2 通过项折叠 + 过滤 Tab | P1 |
| 10 | 新增 | Task 1-2 默认变更清单模式 | P0 |
| 11 | 新增 | Task 3-1 导出确认 + Task 3-2 零篡改翻译 | P1 |
| 12 | 新增 | Task 5-3 首次使用信任 + Task 5-2 历史 | P2 |
| 13 | 新增 | Task 5-2 最近检测历史 | P2 |
| 14 | 新增 | Task 2-3 规则按位置分类 | P1 |
| 15 | 新增 | Task 2-4 错误状态兜底 | P1 |
