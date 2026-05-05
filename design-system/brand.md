# VIB AI Agent — Brand Guidelines

> 基于 Figma 设计稿 `AI Agent 游戏预测` 还原

## Brand Identity

### Brand Name
**VIB AI** — AI Agent Game Prediction Platform

### Tagline
*"AI驱动的游戏预测引擎"*

### Brand Essence
VIB AI 是一个 AI 驱动的游戏预测与数据分析平台，帮助用户通过智能体（Agent）获取游戏预测、数据分析和策略建议。

**Core attributes:**
- **Intelligent** — AI 驱动的深度分析
- **Gaming-Focused** — 专注游戏预测领域
- **Real-time** — 实时数据反馈与预测
- **Trustworthy** — 专业数据分析与可视化

---

## 色彩体系

### 品牌色 (Primary)
| Token | Value | Usage |
|-------|-------|-------|
| `--vib-primary` | **#4E41FF** | 主色调：按钮、链接、强调 |
| `--vib-primary-hover` | #3A2EE8 | 悬停态 |
| `--vib-primary-soft` | rgba(78, 65, 255, 0.1) | 背景/轻量强调 |
| `--vib-primary-gradient` | linear-gradient(135deg, #4E41FF, #7366FF) | 渐变使用 |

### 强调色 (Accent / Gold)
| Token | Value | Usage |
|-------|-------|-------|
| `--vib-gold` | **#F3CE86** | 数据强调、收益显示 |
| `--vib-gold-gradient` | **linear-gradient(135deg, #FFDE6C, #F7981D)** | 金色渐变：VIP、收益、勋章 |
| `--vib-orange-gradient` | **linear-gradient(135deg, #F88527, #FFDE6C)** | 橙色渐变：警告、热门 |

### AI 智能色 (Cyan/Purple)
| Token | Value | Usage |
|-------|-------|-------|
| `--vib-ai-gradient` | **radial-gradient(#6245F7, #6345F7)** | AI Agent 卡片、Magic 功能 |
| `--vib-ai-blue` | **radial-gradient(#72B1FF, #73B2FF)** | 智能提示、AI 标识 |

### 语义色 (Semantic)
| Token | Value | Usage |
|-------|-------|-------|
| `--vib-success` | **#86F3A8** | 成功、在线、正收益 |
| `--vib-error` | **#E93055** | 错误、离线、亏损 |
| `--vib-warning` | #F3CE86 | 警告、待处理 |
| `--vib-info` | #72B1FF | 信息提示 |

### 中性色 (Neutral)
| Token | Value | Usage |
|-------|-------|-------|
| `--vib-bg-primary` | **#0E0E0E** | 页面背景（深色模式） |
| `--vib-bg-secondary` | **#121212** | 次级背景 |
| `--vib-bg-card` | **#1D1D1F** | 卡片背景 |
| `--vib-bg-card-alt` | **#262626** | 卡片备选背景 |
| `--vib-bg-elevated` | **#2B2B2B** | 浮层背景 |
| `--vib-text-primary` | **#FFFFFF** | 主文字 |
| `--vib-text-secondary` | **#838383** | 次要文字 |
| `--vib-text-tertiary` | **#6E6E6E** | 辅助文字 |
| `--vib-border` | **#3C3C3C** | 边框/分割线 |
| `--vib-border-light` | #2A2A2A | 轻量边框 |
| `--vib-divider` | #24292E | 分割线颜色 |

---

## 字体规范

### Font Stack
| Role | Font | Fallback |
|------|------|----------|
| 中文 | **HarmonyOS Sans SC** | PingFang SC, Noto Sans SC, sans-serif |
| 英文 | **Inter** | SF Pro Text, -apple-system, sans-serif |
| 数字 | **Inter** / HarmonyOS Sans SC | SF Compact Display |
| 等宽 | JetBrains Mono | SF Mono |

### Type Scale (Mobile H5)

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Hero / Display | **128px** | 700 | 1.17 | Grok 大标题、品牌展示 |
| H1 | **36px** | 700 | 1.17 | 页面大标题 |
| H2 | **32px** | 700 | 1.25 | 区块标题 |
| H3 | **24px** | 700 | 1.17 | 卡片标题 |
| H4 | **20px** | 700 | 1.2 | 列表项标题 |
| Body Large | **18px** | 500 | 1.33 | 重要正文 |
| Body | **16px** | 400 | 1.5 | 正文 |
| Body Small | **14px** | 400 | 1.43 | 次要正文 |
| Caption | **12px** | 400 | 1.33 | 标注、辅助文字 |
| Tiny | **10px** | 400 | 1.2 | 角标、小标签 |
| Micro | **9px** | 400 | 1.17 | 最小文字 |

---

## 间距 & 圆角

### Spacing
- 基准：4px
- 页面边距：16px / 20px
- 卡片间距：12px
- 元素间距：8px / 12px / 16px

### Border Radius
| Level | Value | Usage |
|-------|-------|-------|
| xs | **8px** | 小元素标签 |
| sm | **12px** | 标准卡片 |
| md | **16px** | 大卡片 |
| lg | **20px** | Modal、底部弹窗 |
| xl | **30px** | 按钮、徽标 |
| 2xl | **50px** | 特殊形状 |
| full | **999px** | 圆形元素 |

---

## 深色模式（默认）

VIB AI 采用 **深色模式优先** 的设计策略，浅色模式为备选。

深色模式的层级关系：
```
背景 (0E0E0E)
  └─ 卡片 (1D1D1F)
       └─ 卡片内强调 (262626)
            └─ 悬浮/选中 (2B2B2B)
```

---

## 视觉效果

### 噪点背景
首页使用噪点纹理背景，增强游戏感和科技感。

### 渐变风格
- 金色渐变：VIP 内容、收益、等级
- 紫色渐变：AI Agent 卡片、智能体头像
- 蓝色渐变：信息卡片、数据可视化

### 发光效果
- 金色发光：高亮数据、收益数字
- 紫色发光：AI 标识、Agent 状态
