# remei 迭代优化 — 04 预览区联动与差异高亮（P1-C）

> 前置依赖：先加载 `00-global-context.md`，确认 `01` `02` `03` 已完成
> 本文件包含 3 个 task，聚焦文档对比模式下的体验

---

## Task 4-1：规则报告 ↔ 预览区双向联动

### 问题
右侧报告与左侧预览缺乏关联。点击规则项不跳转，点击差异区不高亮规则。

### 改造内容

**1. 右 → 左联动（点击规则项 → 预览区跳转）**

触发条件：
- 在「文档对比」视图下，点击右侧任意规则项
- 在「变更清单」视图下，点击卡片的"查看原文位置"

行为：
- 如当前在变更清单视图，自动切换到文档对比视图
- 预览区 smooth scroll（300ms ease-out）到目标页面
- 目标区域显示半透明高亮遮罩：`rgba(245, 158, 11, 0.12)` + 2px 圆角边框
- Before 和 After 两栏同步滚动到对应位置
- 高亮持续 3 秒后 fade out（opacity 1→0，500ms）

**2. 左 → 右联动（点击预览区差异标记 → 规则面板高亮）**

触发条件：点击预览区中已标记的差异区域（需 Task 4-2 差异高亮先完成）

行为：
- 右侧面板自动展开目标规则所在分类
- 目标规则项滚入视口
- 规则项左侧出现 3px 主题色边框，持续 3 秒后渐隐

**3. 状态管理**

```typescript
// Zustand store
interface LinkageStore {
  activeRuleId: string | null;
  setActiveRule: (id: string | null) => void;
  activeView: 'changeList' | 'docCompare';
  setActiveView: (view: 'changeList' | 'docCompare') => void;
}
```

- URL hash 同步：`#rule=section-page-1`，支持刷新保持
- 预览区和规则面板都订阅 `activeRuleId`

**4. 接口依赖**

每条规则必须包含定位信息（如 `00-global-context.md` 中尚未定义，在此补充）：

```typescript
interface RuleLocation {
  pageIndex: number;          // 0-based 页码
  selector?: string;          // Before 稿 DOM 选择器
  afterSelector?: string;     // After 稿 DOM 选择器
  bbox?: {                    // 页面内坐标（百分比 0-100）
    x: number;
    y: number;
    w: number;
    h: number;
  };
}
```

如果后端暂不输出 `bbox`，前端降级为仅滚动到 `pageIndex` 对应页面顶部，不做精确区域高亮。

---

## Task 4-2：差异高亮系统

### 问题
Before/After 两栏文本几乎一样时，用户要逐字肉眼扫描。差异标记缺失。

### 改造内容

**1. 三级差异标记**

| 类型 | 触发条件 | Before 栏样式 | After 栏样式 |
|------|---------|--------------|-------------|
| 结构性变更 | 分节/页码/目录/页眉页脚 | 蓝色左边框 3px + 浅蓝底 | 同左 |
| 格式性变更 | 字体/字号/行距/段距/对齐 | 橙色波浪下划线 | 橙色波浪下划线 |
| 内容性变更 | 文字增删（理论上不应有） | 红色删除线 + 浅红底 | 绿色下划线 + 浅绿底 |

CSS 变量使用 `00-global-context.md` 中已定义的状态色。

**2. hover 差异标记**

hover 任何差异标记时：
- 显示 tooltip，说明变更内容
  ```
  行距: 1.5倍 → 1.25倍
  依据: 规范 3.2 条
  ```
- tooltip 最大宽度 280px，出现在标记上方
- 150ms 延迟显示，防止扫视时频繁闪烁

**3. Diff 模式切换**

预览区顶部工具栏（与"变更清单/文档对比"Tab 同行）增加子切换：

```
文档对比模式下：  [ 并排 ]  [ 合并 ]
```

- 并排模式：当前的 Before/After 双栏（保持不变，叠加差异高亮）
- 合并模式（Unified Diff）：
  - 单栏展示 After 稿
  - 被修改的区域：旧值用红色删除线，新值紧跟其后用绿色下划线
  - 适用于差异量小的场景
- 默认：如果变更比例 < 5%，默认合并模式；否则默认并排模式
- 用户手动切换后记住偏好（localStorage）

**4. 差异数据依赖**

```typescript
interface DiffMark {
  id: string;
  type: 'structural' | 'format' | 'content';
  ruleId: string;             // 关联的规则 ID（用于联动）
  pageIndex: number;
  beforeBbox?: BBox;          // Before 栏中的位置
  afterBbox?: BBox;           // After 栏中的位置
  description: string;        // "行距: 1.5倍 → 1.25倍"
  beforeValue?: string;
  afterValue?: string;
}
```

---

## Task 4-3：缩略图导航增强

### 问题
左侧缩略图只显示页码，看不出哪些页有变更。两套导航（按页 vs 按分类）坐标系不同。

### 改造内容

**1. 缩略图状态圆点**

每个缩略图右上角叠加 8px 圆形指示器：
- 该页所有规则通过 → 绿色圆点
- 有复核项 → 橙色圆点
- 有失败项 → 红色圆点（最高优先级覆盖橙色）
- 无关联规则 → 不显示圆点

用户处理规则后，圆点颜色实时更新。

**2. 缩略图 hover 弹出**

hover 缩略图时（200ms 延迟），显示 popover：
```
第 2 页
──────
✓ 行距 · 已修正
⚠ 页码格式 · 待确认
```

- popover 出现在缩略图右侧
- 最多显示 5 条，超出显示"还有 N 条..."
- 点击 popover 中的某条规则 → 触发 Task 4-1 联动

**3. 变更密度条**

每个缩略图下方增加 2px 高的横条：
- 颜色深浅表示该页变更数量（0=透明，1-2=浅色，3+=深色）
- 使用主题色渐变：`opacity: min(changeCount / 5, 1)`

**4. "仅看变更页" 按钮重定位**

从右上角移至预览区顶部工具栏（与 Diff 模式切换同排）：
```
[ 📋 变更清单 ]  [ 📄 文档对比 ]     [ 并排 | 合并 ]  [ ☐ 仅变更页 ]
```

- 改为 checkbox toggle 样式
- 激活时：缩略图中无变更页变为半透明（opacity 0.3），预览区跳过无变更页
