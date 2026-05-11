# remei 商业化 — 06 增值功能（P1·提升客单价）

> 前置依赖：先加载 `00-global-context.md`，确认 `01-05` 已完成
> 本文件 5 个 task | 商业角色：增值能力，提升产品壁垒和客单价

---

## Task 6-1：页眉页脚自动修正

### 痛点
Word 中页眉页脚的操作是最反人类的功能之一。"链接到前一节"、"首页不同"、"奇偶页不同"这些概念本科生完全不懂。改一个页眉经常全文档页眉都乱了。

### 检测规则

```typescript
interface HeaderFooterCheck {
  sections: {
    sectionIndex: number;
    sectionName: string;       // "前置页" | "正文" | "参考文献"
    header: {
      expected: string;        // 学校要求的页眉内容
      actual: string;          // 实际页眉内容
      format: {                // 字体/字号/对齐
        expected: string;
        actual: string;
      };
      headerLine: boolean;     // 是否有页眉线
      linkedToPrevious: boolean;
    };
    footer: {
      // 页码相关，复用 Task 2-4
    };
    oddEvenDifferent: boolean; // 是否奇偶页不同
    firstPageDifferent: boolean; // 首页是否不同
  }[];
}
```

### 检测项

| 检测项 | 说明 |
|--------|------|
| 页眉内容 | 是否与规范一致（如：正文页眉应为论文题目） |
| 页眉格式 | 字体、字号、居中/左右对齐 |
| 页眉线 | 是否需要、粗细、是否为双线 |
| 分节链接 | 各节页眉是否应该独立（前置页无页眉，正文有页眉） |
| 奇偶页 | 是否需要奇偶页不同（部分学校要求） |

### 修复操作
- 断开不应链接的节
- 设置各节页眉内容和格式
- 添加/移除页眉线
- 配置奇偶页和首页不同

### 用户可见信息
```
📝 页眉页脚修复
  前置页：移除页眉（原有"复旦大学"字样）
  正文页眉：设置为论文题目，宋体五号居中
  页眉线：已添加 0.75pt 单线
  参考文献：页眉同正文 ✓
```

---

## Task 6-2：摘要字数检测 + 关键词格式

### 痛点
学校对中英文摘要有明确字数要求，关键词数量和分隔符也有规定。学生经常超字数或者格式不对。

### 检测规则

```typescript
interface AbstractCheck {
  chinese: {
    wordCount: number;
    minRequired: number;       // 学校要求最小字数（如 300）
    maxRequired: number;       // 学校要求最大字数（如 500）
    status: 'ok' | 'too_short' | 'too_long';
    keywords: {
      count: number;
      minRequired: number;     // 如 3
      maxRequired: number;     // 如 5
      separator: string;       // 实际使用的分隔符
      expectedSeparator: string; // 规范要求的分隔符（如"；"）
      status: 'ok' | 'wrong_count' | 'wrong_separator';
    };
    font: { expected: string; actual: string; match: boolean };
    fontSize: { expected: string; actual: string; match: boolean };
  };
  english: {
    wordCount: number;
    minRequired: number;
    maxRequired: number;
    status: 'ok' | 'too_short' | 'too_long';
    keywords: { /* 同上 */ };
    font: { expected: string; actual: string; match: boolean };
  };
}
```

### 用户可见信息
```
📝 摘要检测
  中文摘要：487 字 ✓（要求 300-500 字）
  中文关键词：5 个 ✓ · 分隔符：逗号 → 分号（已修复）
  英文摘要：312 词 ⚠️ 超出上限（要求 200-300 词，多 12 词）
  英文关键词：4 个 ✓
  摘要字体：宋体小四 ✓
```

### 修复能力
- 关键词分隔符：可自动修复
- 摘要字体/字号：可自动修复
- 字数超限：不自动修复，仅提示学生手动删减，标注当前字数和超出量

---

## Task 6-3：交叉引用/书签修复

### 痛点
论文中的"如图 3.1 所示"、"见表 2.3"这些交叉引用经常断裂，显示"错误！未找到引用源"。学生提交前才发现，逐个修复极其痛苦。

### 检测规则

```typescript
interface CrossRefCheck {
  brokenRefs: {
    pageIndex: number;
    text: string;              // "错误！未找到引用源"
    context: string;           // 周围文字，如"如图{错误}所示"
    originalTarget?: string;   // 如果能推断，原本引用的目标
    fixable: boolean;
  }[];
  totalRefs: number;           // 文档中总引用数
  brokenCount: number;
  healthyCount: number;
}
```

### 用户可见信息
```
🔗 交叉引用检测
  总引用：23 个
  正常：21 个 ✓
  断裂：2 个 ❌
    - 第 8 页："如图{错误！未找到引用源}所示" → 可能引用图 3.1
    - 第 15 页："见表{错误！未找到引用源}" → 可能引用表 4.2
  
  [ 🔧 尝试自动修复 ]  [ 标记位置手动检查 ]
```

### 修复能力
- 如果能根据上下文推断目标（如"图 3.1"在文档中存在），自动重建引用
- 如果无法推断，标记位置让用户手动处理
- 修复后提示用户检查引用是否准确

---

## Task 6-4：图表题注检查

### 痛点
图表标题格式不统一，编号不连续，位置不对（图下表上 vs 图上表下），字体字号不符合规范。

### 检测规则

```typescript
interface CaptionCheck {
  figures: {
    index: number;
    pageIndex: number;
    caption: string;           // "图 3.1 公司营收趋势"
    issues: {
      type: 'numbering' | 'format' | 'position' | 'font' | 'missing';
      description: string;
      fixable: boolean;
    }[];
  }[];
  tables: {
    index: number;
    pageIndex: number;
    caption: string;
    issues: { /* 同上 */ }[];
  }[];
  summary: {
    totalFigures: number;
    totalTables: number;
    issueCount: number;
  };
}
```

### 检测项

| 检测项 | 说明 |
|--------|------|
| 编号连续性 | 图 1.1, 图 1.2, 图 2.1... 是否连续 |
| 编号格式 | "图3.1" vs "图 3.1" vs "Figure 3.1" |
| 题注位置 | 图题在图下方，表题在表上方 |
| 题注字体 | 是否符合规范（通常宋体五号） |
| 缺失题注 | 图表是否有对应题注 |

### 用户可见信息
```
📊 图表题注检测
  图：8 张 · 3 个问题
    - 图 2.3 编号缺失 → 建议编号为"图 2.3"
    - 图 3.1 题注字体不符 → 宋体五号（已修复）
    - 图 4.1 题注位于图上方 → 应在图下方（需手动调整）
  表：5 张 · 1 个问题
    - 表 3.2 编号格式不一致 → "Table 3.2" → "表 3.2"（已修复）
```

---

## Task 6-5：参考文献格式检查

### 痛点
参考文献是论文最后阶段最痛的部分。格式要求因学校而异（GB/T 7714、APA、MLA），手动校对几十条引用极其枯燥且容易遗漏。

### 检测规则

```typescript
interface ReferenceCheck {
  format: 'gb_t_7714' | 'apa' | 'mla' | 'unknown';
  requiredFormat: string;      // 学校要求的格式标准
  totalReferences: number;
  issues: {
    refIndex: number;          // 第几条引用
    refText: string;           // 引用原文
    issues: {
      type: 'author_format' | 'year_position' | 'title_format' | 'journal_format' | 'punctuation' | 'order' | 'numbering';
      description: string;
      suggestion: string;      // 修复建议
      fixable: boolean;
    }[];
  }[];
  summary: {
    correctCount: number;
    issueCount: number;
    commonIssue: string;       // 最常见的问题类型
  };
}
```

### 检测项

| 检测项 | 说明 |
|--------|------|
| 编号格式 | [1] vs 1. vs (1) |
| 作者格式 | 姓前名后 / 缩写规则 / et al. 使用 |
| 标点符号 | 全角/半角一致性，句点/逗号使用 |
| 期刊名格式 | 斜体/缩写 |
| 排序 | 引用顺序 vs 字母排序 |
| 缺失字段 | 年份/卷号/页码是否完整 |

### 用户可见信息
```
📚 参考文献检测（GB/T 7714 标准）
  总计：32 条引用
  格式正确：26 条 ✓
  需修正：6 条

  [3] 作者姓名格式不一致 → "张三,李四" → "张三, 李四"
  [8] 缺少出版年份
  [12] 期刊名应斜体
  [15] 编号格式不一致 → "15." → "[15]"
  [22] 标点使用全角逗号 → 应为半角
  [28] 页码格式 → "pp.123-130" → "123-130"

  [ 🔧 自动修复可修复项(4条) ]  [ 标记剩余项手动检查 ]
```

### 修复能力
- 编号格式统一：可自动修复
- 标点符号修正：可自动修复
- 作者格式调整：可自动修复（高置信度时）
- 缺失字段：不自动修复，标记让用户补充
- 排序调整：可自动修复（慎重，需确认后执行）

### 商业价值
参考文献检查可作为"高级版"独立计费功能：
- 基础检测（编号+标点）：包含在基础套餐
- 深度检查（作者格式+期刊名+完整性）：高级版 +4.9 元
