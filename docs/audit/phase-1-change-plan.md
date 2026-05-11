# Phase 1 Change Plan

## 1. Phase 1 目标

Phase 1 只落地数据契约层，不做三栏 UI 重构，不接真实后端，不接真实 Claude API。

目标：

```text
Finding Schema
legacyFindingAdapter
Finding Store
Finding Selectors
Finding Status Machine
Rule Resolver
Phase 1 自检脚本
最小测试
```

Phase 1 的核心不是“把页面改漂亮”，而是先把 finding-centric 的数据主线钉死：Finding 是业务事实，Page 只是定位容器，UI 只能读 selector。

---

## 2. Phase 1 必须新增 / 修改文件

| 文件 | 操作 | 目的 | 依赖 |
|---|---|---|---|
| `src/core/finding/schema.ts` | 新增 / 修改 | 定义 Finding 标准类型 | shared FindingContract、Phase 0 审计 |
| `src/core/finding/adapter.ts` | 新增 / 修改 | 旧对象转 Finding | schema.ts |
| `src/core/finding/store.ts` | 新增 / 修改 | Finding Store | schema.ts、status-machine.ts |
| `src/core/finding/selectors.ts` | 新增 / 修改 | focusFindingId 派生视图状态 | store.ts、rule-resolver.ts |
| `src/core/finding/status-machine.ts` | 新增 / 修改 | Finding 状态流 | schema.ts |
| `src/core/rule/rule-resolver.ts` | 新增 / 修改 | ruleId → rulePath | schema.ts |
| `tests/finding/*` | 新增 / 修改 | 测试 | core/finding、core/rule |
| `scripts/check-paradigm.sh` | 新增 / 修改 | 范式 grep 自检 | shell、rg |
| `scripts/check-invariants.ts` | 新增 / 修改 | 不变式检查 | tsx、schema/selectors |
| `scripts/verify-phase-1.sh` | 新增 / 修改 | 综合验收 | npm scripts、自检脚本 |

---

## 3. Phase 1 禁止修改文件

| 文件 / 目录 | 禁止原因 |
|---|---|
| `paper-formatter/services/client/src/components/review-workbench/*` | Phase 1 不做三栏 UI 重构，避免 UI 视觉调整干扰数据契约冻结 |
| `paper-formatter/services/client/src/components/fix-runtime/*` | Step4Fix 播放态归 Phase 2，不在 Phase 1 改动画和动作流 |
| `paper-formatter/services/api-gateway/*` | Phase 1 不接真实 Fastify 后端，不改路由和数据库写入 |
| `paper-formatter/services/client/src/api/client.ts` | Phase 1 不接真实后端，不扩 API client |
| `paper-formatter/services/client/src/screens/Step5Output.tsx` | Phase 1 不做下载豁免完整流程 |
| `paper-formatter/services/client/src/screens/Step6Download.tsx` | Phase 1 不做下载页改造 |
| `paper-formatter/services/client/src/index.css` | Phase 1 不做视觉样式重构 |
| `paper-formatter/services/client/playwright.config.ts` | Phase 1 只补最小测试，不调整浏览器/CI 环境 |

---

## 4. Phase 1 不做事项

Phase 1 不做：

- 不重构三栏 UI。
- 不接真实 Claude API。
- 不接后端 Fastify。
- 不接 Prisma。
- 不做下载豁免完整流程。
- 不做 Phase 2-4。
- 不设计完整 L1/L2/L3 规则集。
- 不修改 A4 视觉、钢笔动画、旁白交互。
- 不引入 page-centric 的新 store。

---

## 5. Phase 1 任务拆分

### P1.1 Finding Schema

输出：

```text
src/core/finding/schema.ts
```

必须包含：

- `findingId`
- `documentId`
- `documentVersion`
- `ruleId`
- `rulePath`
- `severity`
- `confidence`
- `status`
- `anchor`
- `span`
- `evidence_snapshot`
- `rule_snapshot`
- `suggestion_snapshot`
- `createdAt`
- `updatedAt`

验收：

- schema 不包含 `currentPage`。
- schema 不包含 `activeRuleId`。
- schema 不创建 Finding 的同义模型。

### P1.2 Adapter

输出：

```text
src/core/finding/adapter.ts
```

必须包含：

- `normalizeLegacyIssueToFinding()`
- `normalizeLegacyAnnotationToFinding()`
- `normalizeRepairActionToFinding()`

要求：

- adapter 不读取 UI state。
- adapter 不读取 currentPage。
- adapter 转换失败必须返回明确错误。
- 当前不存在的 legacy 对象也要保留函数入口。

### P1.3 Store

输出：

```text
src/core/finding/store.ts
```

要求：

- Finding 是业务主对象。
- 不得以 currentPage 作为主索引。
- 必须支持 `byId / allIds`。
- 必须支持 `focusFindingId`。
- 写入入口必须集中，不允许 UI 直接 mutate Finding。

### P1.4 Selectors

输出：

```text
src/core/finding/selectors.ts
```

要求：

- currentPage 只能由 `focusFinding.anchor.pageIndex` 派生。
- rulePath 只能由 `focusFinding.ruleId` 反查。
- highlight span 只能由 `focusFinding.anchor / span` 派生。
- selector 必须是纯函数，不允许写 store。

### P1.5 Status Machine

输出：

```text
src/core/finding/status-machine.ts
```

要求支持：

- `pending`
- `accepted`
- `ignored`
- `self_edited`
- `rejudging`
- `resolved`
- `failed`
- `conflicted`

状态流约束：

- `accepted / ignored / self_edited` 必须来自用户动作或审计命令。
- `resolved / failed / conflicted` 必须来自系统复核或后续任务结果。
- 不允许 UI 组件直接写 status 字符串。

### P1.6 Rule Resolver

输出：

```text
src/core/rule/rule-resolver.ts
```

要求：

- 通过 ruleId 反查 rulePath。
- 不得通过 currentPage 推断 rulePath。
- 找不到 ruleId 时返回明确 fallback 结果和 warning。

### P1.7 Tests

输出：

```text
tests/finding/*
```

必须覆盖：

- Finding Schema
- Adapter
- Store
- Selectors
- Status Machine
- Rule Resolver

最低测试要求：

- 同一页多个 Finding 不互相覆盖。
- 同一 label 多个 Finding 不串状态。
- currentPage 派生自 focusFinding，不可独立写入。
- rulePath 由 ruleId 反查，不由 page 推断。

### P1.8 Self Check Scripts

输出：

```text
scripts/check-paradigm.sh
scripts/check-invariants.ts
scripts/verify-phase-1.sh
```

脚本职责：

- `check-paradigm.sh`：grep 禁止项，例如 UI 直接消费 legacy object、currentPage 作为主状态、rulePath 从 page 推断。
- `check-invariants.ts`：加载 schema/store/selectors 测试 finding-centric 不变式。
- `verify-phase-1.sh`：按顺序执行类型检查、测试、自检，并生成报告。

---

## 6. Phase 1 验收命令

必须按顺序执行：

```bash
npm run typecheck
npm test
bash scripts/check-paradigm.sh
tsx scripts/check-invariants.ts
bash scripts/verify-phase-1.sh
```

如果当前 package.json 中没有 `typecheck` 或 `test`，Phase 1 必须先补齐脚本别名，再执行验收。

---

## 7. Phase 1 完成标准

Phase 1 完成需要满足：

- 类型检查通过。
- 单元测试通过。
- 范式 grep 无 ERROR。
- 不变式检查通过。
- 综合验收脚本通过。
- 产出 `phase-1-self-check-report.md`。
- `phase-tracking.md` 已勾选完成。
- `src/core/finding/*` 不引用 UI 组件。
- `src/core/rule/rule-resolver.ts` 不引用页面状态。

---

## 8. Phase 1 冻结产物

Phase 1 完成后冻结：

```text
src/core/finding/schema.ts
src/core/finding/adapter.ts
src/core/finding/store.ts
src/core/finding/selectors.ts
src/core/finding/status-machine.ts
src/core/rule/rule-resolver.ts
tests/finding/*
scripts/check-paradigm.sh
scripts/check-invariants.ts
scripts/verify-phase-1.sh
docs/audit/legacy-to-finding-migration-map.md
phase-1-self-check-report.md
```

Phase 2 不得修改 Phase 1 冻结产物。

如 Phase 2 发现必须修改冻结产物，必须先新建 `docs/audit/phase-1-freeze-exception.md`，写清：

- 为什么 Phase 1 冻结产物不足。
- 哪个 invariant 被现实需求挑战。
- 是否需要回滚 Phase 1 设计。
- 修改后的新增验收门。

