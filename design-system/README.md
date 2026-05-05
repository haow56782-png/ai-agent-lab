# VIB AI Design System

基于 Figma 设计稿 **"AI Agent 游戏预测"** 精确还原的设计系统。

## 来源

> ✅ 通过 Figma API 从原始设计稿 `ShtkcPpmxmu6ThHTc2nn3s` 提取的数据
> - 提取 104 个颜色值（按使用频率排序）
> - 提取 85 个文字样式
> - 提取 20+ 渐变和圆角规则
> - 提取 7 个页面、50+ 屏幕帧的设计结构

## 内容

| 文件 | 说明 |
|------|------|
| `brand.md` | 品牌规范围（VIB AI 品牌、色彩体系、字体、间距、圆角） |
| `tokens/colors.css` | 色彩 Token（原始色板 + 语义 Token + 深色/浅色模式） |
| `tokens/typography.css` | 字体 Token（HarmonyOS Sans SC + Inter） |
| `tokens/spacing.css` | 间距 Token（Mobile H5 布局参数） |
| `preview.html` | 可视化预览页面（深色/浅色切换） |
| `pages/mobile-h5.md` | 移动端 H5 指南 |
| `pages/admin-dashboard.md` | 后台仪表盘指南 |
| `pages/data-collection-annotation.md` | **大模型对话 / 采集 / 标注** 完整指南 |

## Figma 页面

| 页面 | 内容 |
|------|------|
| H5 | 首页/登录/Agent/对话/数据/资产（8 个 Section） |
| app ui | 数据贡献中心/采集/AI对话/订阅（15 个 Section） |
| 资源库 | 图标/按钮/UI 元素/表单/颜色指引/文字样式 |
| app 历史版本 | **大模型对话/采集/快判/语音采集**（50+ 帧） |
| 订阅迭代设计 | 订阅页/邀请/3D 元素迭代 |

## 设计摘要

- **品牌**：VIB AI — AI Agent 游戏预测平台
- **主色**：#4E41FF（紫蓝色）
- **强调色**：金色渐变 #FFDE6C → #F7981D
- **默认主题**：深色模式（背景 #0E0E0E，卡片 #1D1D1F）
- **设计稿**：Mobile H5，402px 宽度
- **字体**：HarmonyOS Sans SC（中文）、Inter（英文/数字）
- **圆角**：8px~30px，按钮统一 30px 大圆角
