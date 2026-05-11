# Client Implementation Baseline

本文记录 `paper-formatter/services/client` 当前实现基线、已落地质量门禁和后续演进方向。它是工程交接文档，不替代 API spec 或系统架构文档。

## 1. Product Flow

| Step | Screen | 当前职责 | 架构状态 |
|---|---|---|---|
| 1 | Step1Upload | 上传论文、最近任务、演示入口 | 已补单击上传行为回归 |
| 2 | Step2Profile | 学校规范选择、模板提示、学校详情 | UI 已拆中颗粒组件 |
| 3 | Step3Parse | 解析、结构识别、格式体检前置结果 | 差异确认入口已后置，不再从 Step3 直接进入确认 |
| 4 | Step4Fix | 运行修复任务、展示 A4 修复现场、规则与动作流 | runtime model / polling / playback 已拆分 |
| 5 | Step4Diff / Step5Output | 人工确认 finding、接受/拒绝/自改、下载守门 | finding-centric 主线已接入 |
| 6 | Download | 下载定稿与导出确认 | 受 finding guard 约束 |

## 2. Architecture Baseline

### 2.1 Finding-Centric Review

确认页不是 page-centric 阅读器，而是 finding-centric 审查工作台。

关键约束：

- Finding 是业务事实。
- Page 只是定位容器。
- `focusFindingId` 是唯一焦点状态。
- 当前页、规则路径、画布高亮都由 focused finding 派生。
- URL hash 使用 `#finding=<finding_id>` 恢复焦点。
- 已处理 finding 仍可导航，只做视觉降级。

核心模块：

| 模块 | 职责 |
|---|---|
| `src/core/finding/schema.ts` | 标准 Finding 数据契约 |
| `src/core/finding/adapter.ts` | legacy 对象到 Finding 的迁移适配 |
| `src/core/finding/store.ts` | byId / allIds / focusFindingId 状态 |
| `src/core/finding/selectors.ts` | currentPage、rulePath、highlight 的派生 |
| `src/core/finding/status-machine.ts` | pending / accepted / ignored / self_edited 等状态流 |
| `src/core/rule/rule-resolver.ts` | ruleId 到 rulePath 的反查 |
| `src/stores/reviewStore.ts` | 三栏联动焦点 store |
| `src/hooks/useFindingObserver.ts` | IntersectionObserver finding 可见性同步 |
| `src/components/review-workbench/*` | RulePane / Canvas / FindingPane 三栏视图 |

### 2.2 Step4 Fix Runtime

Step4Fix 的目标是让用户感知“系统正在认真修复我的论文”，不是播放普通 loading。

当前拆分：

| 模块 | 职责 |
|---|---|
| `useFixFlowController.ts` | Step4Fix 顶层编排入口 |
| `useFixPolling.ts` | 后端状态轮询 |
| `useFixPlayback.ts` | 前端播放推进 |
| `useFixRuntimeModel.ts` | A4 页面、动作、剩余时间的同源模型 |
| `components/fix-runtime/*` | 纸张舞台、顶部状态、规则旁白、动作流 |

同源要求：

- A4 当前页、右侧动作流、剩余时间必须来自同一 runtime model。
- 卡片点击要把 A4 页面重新框到可读位置，而不是只改变右侧焦点。
- 修复完成后才进入差异确认，不从 Step3 直接跳差异详情。

### 2.3 Download Guard

下载链路以 finding 状态判断是否可放行。

规则：

- P0 pending / conflicted / failed 阻断下载。
- P1 可以在明确豁免后放行。
- accepted / rejected / self_edited 状态需要本地恢复。
- 下载按钮只在确认页完成后进入导出确认，不绕过人工确认。

## 3. Verification Baseline

当前 client CI 包含：

```bash
npm run lint
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
npm run build
npm run test:visual -- --reporter=line
npm run test:behavior -- --reporter=line
```

本地补充命令：

```bash
npm test
npm run verify:phase1
```

覆盖重点：

- Step1 文件选择器只打开一次。
- Step4Fix 页面、剩余时间、动作数同源推进。
- Step4Diff 卡片、画布锚点、hash 恢复以 `finding_id` 推进。
- Step5 单项接受/拒绝/自改后自动聚焦下一项。
- Step5 键盘可访问性、持久化恢复、beforeunload 保护。
- Step5 pending/completed 视觉基线。

## 4. Current Technical Debt

| 优先级 | 债务 | 说明 |
|---|---|---|
| P0 | Step4/Step5 继续去 legacy adapter | 已隔离但仍需逐步减少 UI 兼容字段 |
| P1 | ESLint hooks 依赖 warning | 当前保留 15 条 warning，后续按模块收紧 |
| P1 | `any` 与正则规则暂未阻断 | 为先接 CI lint 基线暂缓，需后续模块化修复 |
| P1 | Step3 真实解析数据源 | 仍需继续接入真实后端 parsing/job 事件 |
| P2 | 移动端响应式 | 当前核心体验优先桌面工作台 |

## 5. Next Recommended Work

1. 继续 Phase 2：减少 Step4Diff legacy review item adapter，保持 finding_id 贯穿。
2. 收紧 lint：先修 `useFindingObserver`、`FindingPane`、`Step4Diff` 的 hooks warning。
3. 将 Step3 解析过程继续接真实事件流，避免黑盒 loading 回潮。
4. 将 Step5 视觉基线和行为回归保持为每次 UI 改版的固定门禁。
