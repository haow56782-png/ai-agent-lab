# Paper Formatter Client

论文排版客户端是 `paper-formatter` 的 React + TypeScript + Vite 前端。当前产品动线按“上传论文 → 选择学校 → 格式体检 → 执行修复 → 人工确认 → 下载定稿”组织，其中 Step4/Step5 已按 finding-centric 架构收敛。

## Runtime

```bash
npm ci
npm run dev
```

默认开发地址由 Vite 输出，通常是 `http://127.0.0.1:5173`。后端 API 通过 Vite proxy 接入，生产部署由 Nginx 统一托管前后端。

## Quality Gates

本客户端的最小验收链路：

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:behavior -- --reporter=line
npm run test:visual -- --reporter=line
```

CI 已接入：

- `npm run lint`
- `npx tsc -p tsconfig.app.json --noEmit`
- `npx tsc -p tsconfig.node.json --noEmit`
- `npm run build`
- `npm run test:visual -- --reporter=line`
- `npm run test:behavior -- --reporter=line`

## Architecture Baseline

### Finding-Centric Review

Step4Diff / Step5Output 的确认链路以 finding 为业务事实：

- `finding_id` 是卡片、画布锚点、URL hash、确认状态的统一主键。
- `focusFindingId` 是唯一焦点状态。
- 当前页、规则路径、画布高亮都必须由 focused finding 派生。
- Page 只是定位容器，不允许作为业务主状态。

核心文件：

- `src/core/finding/schema.ts`
- `src/core/finding/store.ts`
- `src/core/finding/selectors.ts`
- `src/core/finding/status-machine.ts`
- `src/core/rule/rule-resolver.ts`
- `src/stores/reviewStore.ts`
- `src/hooks/useFindingObserver.ts`
- `src/components/review-workbench/*`

### Step4 Runtime Repair

Step4Fix 负责展示真实修复过程感。它的状态按 runtime model、polling、playback 拆分，A4 画布、剩余时间、动作流必须同源推进。

核心文件：

- `src/screens/Step4Fix.tsx`
- `src/screens/step4-fix/useFixFlowController.ts`
- `src/screens/step4-fix/useFixPolling.ts`
- `src/screens/step4-fix/useFixPlayback.ts`
- `src/screens/step4-fix/useFixRuntimeModel.ts`
- `src/components/fix-runtime/*`

### Download Guard

Step5 下载不是单纯按钮跳转。下载入口必须经过 finding guard：

- P0 blocking finding 未处理时禁止下载。
- P1 可通过明确豁免路径放行。
- 接受、拒绝、自改状态需要被持久化并可恢复。
- 下载确认必须后置于人工确认页之后。

## Testing Notes

- `tests/step1-upload.spec.ts` 覆盖上传入口单击行为，避免文件选择器需要二次点击。
- `tests/step4-flow.spec.ts` 覆盖 Step4/Step5 的 finding focus、hash 恢复、确认状态、下载守门与键盘可访问性。
- `tests/step5-visual.spec.ts` 固定 Step5 pending/completed 视觉基线。
- `tests/finding/*` 覆盖 Phase 1 finding schema、adapter、store、selectors、status machine、rule resolver 与 download guard。

## Lint Policy

当前 ESLint 是第一阶段 CI 基线：先阻断基础 JS/TS、React Hooks 调用顺序和 React Refresh 问题。历史代码中的 `no-explicit-any`、控制字符正则、无用转义与部分 exhaustive-deps 暂不作为阻断项，后续按模块逐步收紧。
