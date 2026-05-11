# remei 商业化 — 02 一键修复矩阵（P0·付费层核心）

> 前置依赖：先加载 `00-global-context.md`，确认 `01` 已完成
> 本文件 6 个 task | 商业角色：核心付费功能，每个 task 是一个修复能力模块

---

## 修复流程总设计

用户点击"立即修复"后进入修复工作台。工作台结构：

```
┌─────────────────────────────────────────────────────────┐
│ 步骤条：体检结果 → [修复中] → 确认导出                    │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│    修复进度面板           │    实时预览                   │
│    ──────────            │    ────────                  │
│    ✅ 页边距 · 已修复     │    当前页面渲染               │
│    ✅ 正文字体 · 已修复   │    （修复一项，刷新一次）      │
│    🔄 标题层级 · 修复中   │                              │
│    ⏳ 页码设置 · 等待中   │                              │
│    ⏳ 目录更新 · 等待中   │                              │
│                          │                              │
│    ━━━━━━━━━━ 3/8        │                              │
│                          │                              │
├──────────────────────────┴──────────────────────────────┤
│  [ ⏸ 暂停 ]                    已修复 3 项 · 还剩 5 项   │
└─────────────────────────────────────────────────────────┘
```

**修复顺序**（固定，由系统决定，不让用户选择）：
```
1. 页边距 → 2. 正文样式（字体/字号/行距）→ 3. 标题层级
→ 4. 页码/分节 → 5. 封面/声明页 → 6. 目录生成/更新
```

顺序逻辑：先修结构性的（页边距影响后续所有排版），再修样式，最后生成依赖前序修复结果的内容（目录）。

**付费墙触发**：
- 免费用户执行到第 3 项修复时弹出付费墙
- 付费墙出现在修复进度面板中间位置（不是弹窗，是嵌入式卡片）：
  ```
  ┌──────────────────────────────────┐
  │  🔒 已免费修复 3 项               │
  │                                   │
  │  还有 5 项需要修复                │
  │  解锁全部修复 + 导出              │
  │                                   │
  │  [ 💰 ¥9.9 解锁 ]               │
  │                                   │
  │  已修复的 3 项可免费预览效果       │
  └──────────────────────────────────┘
  ```

---

## Task 2-1：一键修复页边距

### 检测规则
- 上边距、下边距、左边距、右边距、装订线
- 与学校规范逐项对比

### 修复逻辑
```typescript
interface MarginFix {
  type: 'margin';
  before: { top: number; bottom: number; left: number; right: number; gutter: number }; // 单位 mm
  after: { top: number; bottom: number; left: number; right: number; gutter: number };
  scope: 'all_sections' | 'section_specific';
  sectionIndices?: number[]; // 如果不同节有不同要求
}
```

### 用户可见信息
```
📐 页边距修复
  上边距：30mm → 25mm（学校要求）
  左边距：25mm → 30mm（含装订线）
  其余边距：符合要求 ✓
```

### 修复耗时预估
< 1 秒（纯属性修改）

---

## Task 2-2：一键修复正文样式

### 检测规则
- 正文字体（中文宋体/英文 Times New Roman）
- 正文字号（小四 / 12pt）
- 行距（固定值 20pt / 1.25倍 / 1.5倍，各校不同）
- 段前段后间距
- 首行缩进（2 字符）

### 修复逻辑
```typescript
interface StyleFix {
  type: 'body_style';
  fixes: {
    field: 'font_cn' | 'font_en' | 'font_size' | 'line_spacing' | 'para_before' | 'para_after' | 'indent';
    before: string;
    after: string;
    affectedParagraphs: number; // 影响了多少段落
  }[];
}
```

### 用户可见信息
```
🔤 正文样式修复
  中文字体：宋体 ✓
  英文字体：Arial → Times New Roman（影响 47 处）
  字号：小四 ✓
  行距：1.5倍 → 1.25倍（影响全文 128 段）
  首行缩进：修复 12 处未缩进段落
```

### 注意事项
- 只修改"正文"样式段落，不影响标题、题注、页眉等
- 如果文档中存在多种字体混用，列出所有被替换的字体
- 修复前后段落数不变（不删除任何内容）

---

## Task 2-3：一键修复标题层级

### 检测规则
- 一级标题（章标题）：黑体三号 / Heading 1
- 二级标题：黑体四号 / Heading 2
- 三级标题：黑体小四 / Heading 3
- 标题编号格式（第一章 / 1 / 1.1 / 1.1.1）
- 标题前后间距

### 修复逻辑
```typescript
interface HeadingFix {
  type: 'heading';
  fixes: {
    level: 1 | 2 | 3 | 4;
    field: 'style' | 'font' | 'size' | 'numbering' | 'spacing';
    before: string;
    after: string;
    affectedHeadings: number;
  }[];
  headingTree: { level: number; text: string; page: number }[]; // 修复后的标题树
}
```

### 用户可见信息
```
📑 标题层级修复
  一级标题（共 5 章）：黑体三号 ✓
  二级标题（共 18 节）：字号四号 → 黑体四号（修复 18 处）
  三级标题（共 7 节）：未使用标题样式 → 应用 Heading 3（修复 7 处）
  编号格式：已统一为"第X章 / X.X / X.X.X"
```

### 关键提示
修复完成后提示：
```
⚠️ 标题层级修复后，建议在下一步更新目录以确保页码准确。
```

---

## Task 2-4：一键修复页码/分节

### 检测规则
- 前置页（封面/声明/摘要/目录）使用罗马数字或不显示页码
- 正文从第 1 页开始使用阿拉伯数字
- 页码位置（底部居中 / 底部右侧）
- 分节符正确性

### 修复逻辑
```typescript
interface PageNumberFix {
  type: 'page_number';
  fixes: {
    sectionName: string;          // "前置页" | "正文" | "参考文献" | "附录"
    field: 'format' | 'start_number' | 'position' | 'visibility';
    before: string;
    after: string;
  }[];
  sectionsCreated: number;        // 新创建的分节符数量
  sectionsModified: number;       // 修改的分节符数量
}
```

### 用户可见信息
```
📄 页码/分节修复
  新增分节符：2 处（摘要结束处、目录结束处）
  前置页页码：阿拉伯数字 → 罗马数字（I, II, III...）
  正文页码：从第 3 页 → 从第 1 页重新计数
  页码位置：底部居中 ✓
```

### 高风险提示
这是最难手动修复的功能，也是核心差异化。修复前自动创建 checkpoint，修复失败可回滚。

---

## Task 2-5：封面/声明页自动填充

### 检测规则
- 从文档中提取：学校名、学院、专业、学号、姓名、导师、题目、日期
- 与学校封面模板对比字段位置、字体、字号、对齐方式
- 声明页签名日期格式

### 修复逻辑
```typescript
interface CoverFix {
  type: 'cover';
  extractedFields: {
    field: 'school' | 'college' | 'major' | 'studentId' | 'name' | 'supervisor' | 'title' | 'date';
    value: string;
    confidence: number; // 0-1，提取置信度
  }[];
  fixes: {
    field: string;
    issue: 'font' | 'size' | 'alignment' | 'position' | 'underline' | 'missing';
    before: string;
    after: string;
  }[];
}
```

### 用户可见信息
```
📋 封面/声明页修复
  检测到以下信息（请确认）：
  ┌──────────────────────────────┐
  │ 学校：复旦大学        ✓      │
  │ 学院：管理学院        ✓      │
  │ 专业：财务管理        ✓      │
  │ 学号：2213080801      ✓      │
  │ 姓名：XXX             ✓      │
  │ 导师：田翠 讲师       ✓      │
  │ 日期：2026年5月  → 二〇二六年五月  │  ← 可编辑
  └──────────────────────────────┘
  
  [ 信息正确，开始修复 ]  [ 修改信息 ]
```

- 提取置信度 < 0.8 的字段标记为"请确认"并高亮
- 用户可以修改任何字段后再执行修复
- 修复内容：字段位置对齐 + 字体字号 + 下划线样式 + 日期格式

---

## Task 2-6：目录生成/更新

### 检测规则
- 目录是否存在
- 目录层级是否与标题层级一致
- 目录页码是否准确
- 目录格式（字体、字号、缩进、前导符）

### 修复逻辑
```typescript
interface TocFix {
  type: 'toc';
  action: 'create' | 'update' | 'reformat';
  issues: {
    issue: 'missing' | 'outdated' | 'wrong_levels' | 'wrong_format';
    description: string;
  }[];
  resultPreview: {
    level: number;
    text: string;
    pageNumber: number;
  }[]; // 修复后的目录预览
}
```

### 用户可见信息
```
📚 目录更新
  操作：重新生成目录
  层级：显示到三级标题
  格式：宋体小四 + 右对齐页码 + 点线前导符
  
  目录预览：
  第一章 绪论 ..................... 1
    1.1 研究背景 ................. 1
    1.2 研究意义 ................. 3
  第二章 文献综述 ................. 5
    2.1 ...
```

### 执行顺序约束
目录必须在标题层级（Task 2-3）和页码分节（Task 2-4）修复之后执行，否则页码不准确。

### 接口定义（修复统一接口）

```typescript
// 执行修复（统一入口）
POST /api/fix
Body: {
  fileId: string;
  schoolId: string;
  fixTypes: ('margin' | 'body_style' | 'heading' | 'page_number' | 'cover' | 'toc')[];
  coverFieldOverrides?: Record<string, string>; // 用户修改的封面字段
}
Response: {
  taskId: string;
  estimatedSeconds: number;
}

// 轮询修复进度
GET /api/fix/{taskId}/status
Response: {
  status: 'processing' | 'completed' | 'failed';
  completedSteps: {
    type: string;
    status: 'done' | 'skipped' | 'failed';
    summary: string;  // "修复了 47 处英文字体"
    duration: number; // 耗时秒数
  }[];
  currentStep?: string;
  result?: FixResult;
}

interface FixResult {
  fixedFileId: string;    // 修复后的文件 ID
  totalFixed: number;
  fixDetails: (MarginFix | StyleFix | HeadingFix | PageNumberFix | CoverFix | TocFix)[];
  newScore: number;       // 修复后的新得分
  contentHash: string;    // 正文内容指纹（证明未篡改）
  originalHash: string;   // 原稿内容指纹
}
```
