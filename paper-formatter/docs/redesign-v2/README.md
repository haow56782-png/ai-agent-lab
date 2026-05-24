# Step 3 / 4 / 5 改版稿 · 红笔工坊

设计基线 v2，对应 `paper-formatter/services/client/src/screens/` 下：

- `Step3Parse.tsx`   → `redesign-step3.jsx`（结构 X 光探针）
- `Step4Fix.tsx`     → `redesign-step4.jsx`（红笔工坊）
- `Step5Output.tsx`  → `redesign-step5.jsx`（校对台）

## 核心隐喻

**红笔工坊** —— 可旁观 / 可质询 / 可回退的副导师。

## 三步关键改动

| 步骤 | 关键改动 |
|---|---|
| Step 3 体检 | 左结构骨架树边扫边长 · 中央玻璃罩 + 扫描线 + 放大镜 · 右发现项实时入坞 |
| Step 4 修复 | 左稿纸地图 · 中央红笔标注 · 右 cockpit 三联 · 底部时间线 scrubber · 批准 / 存疑 / 跳过 |
| Step 5 确认 | 逐项 before/after 卡片 · 类别批量批准 · 文本指纹 sha256 证书 · 白名单 / 黑名单 chips |

## 跨屏红线

**证据 → 规则 → 修改** 三联组件在 Step3 dock / Step4 cockpit / Step5 card 复用。
这是参赛 narrative 里最容易讲清楚的“设计 DNA”。

## 如何打开

双击 `index.html`（需联网加载 React + Babel + Google Fonts），或部署到任意静态托管路径。

## 落地到 React 代码的建议路径

1. **Step 4 优先**：当前 `Step4Fix.tsx` 已经在从“动画”收敛为“工作台”，本稿的稿纸地图 + 时间线 scrubber + cockpit 三联可直接对接现有 `useFixFlowController` / `useFixPlayback`。
2. **Step 5 次之**：`Step4Diff` + `Step5Output` 当前是分屏的，可以合并为本稿提议的“校对台”单屏，下载守门 `useStep4DownloadController` 不动。
3. **Step 3 渐进**：`Step3Parse.tsx` 已 40KB，建议作为 v2.1 增量替换，先把右侧 dock 接入。

## 文件清单

```
redesign-v2/
├── index.html              # 入口（design canvas，4 个画板）
├── README.md
├── tokens.css              # 设计 tokens（与 v1 共享）
├── design-canvas.jsx       # 画板容器（与 v1 共享）
├── hifi-shell.jsx          # HF 组件库（Icon / Btn / LogoMark）
├── redesign-brief.jsx      # 改版纲领画板
├── redesign-step3.jsx      # Step 3 体检 · 结构 X 光
├── redesign-step4.jsx      # Step 4 修复 · 红笔工坊
└── redesign-step5.jsx      # Step 5 确认 · 校对台
```
