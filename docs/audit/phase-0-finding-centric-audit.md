# Phase 0 Finding-Centric 架构审计

> 本 Phase 只做架构审计与迁移计划，不修改业务代码。

## 0. 审计边界

### 已执行的强制上下文读取

- `docs/agent-os/protocols/agent-capability-protocol-v0.1.md`
- `docs/agent-os/architecture/vib-agent-os-v0.1.md`
- `.claude/skills/context-engineering-skill/SKILL.md`
- `.claude/skills/verification-gate-skill/SKILL.md`

### Phase 0 prompt 文件状态

用户要求读取以下文件：

- `phase-0-prompts/01-audit-spec.md`
- `phase-0-prompts/02-output-template.md`
- `phase-0-prompts/03-no-code-change-rule.md`

审计时在 `/Users/linda/ai-agent-lab`、`/Users/linda/Downloads` 及 `/Users/linda` 范围内搜索，未找到 `phase-0-prompts` 目录或以上三个文件。因此本次审计以用户消息中的 Phase 0 目标、核心原则、禁止修改业务代码约束作为执行规范。

### 审计范围

- Finding 合同与 shared-types
- API DTO parser、findings 路由、findings repository
- Step3/Step4 数据源接入
- Step4Diff finding-centric 工作台状态流
- Step4Fix 修复播放状态流
- RulePane / Canvas / FindingPane 三栏联动
- Step5/Step6 下载守门

## 1. 总体结论

当前工程已经完成了 finding-centric 的“合同层”和“部分 UI 工作台层”建设，但 Step4Diff 仍处于“canonical finding + legacy review controller 并存”的过渡态。

最关键的问题不是没有 `finding_id`，而是业务动作仍有一部分绕过 `finding_id`，继续依赖 `page`、`activeRuleId`、`ruleActions`、`ReviewItem.label`。这会造成三类风险：

- 当前页、当前卡片、当前规则出现语义错位。
- 接受/拒绝状态按 label 或 legacy item 写入时发生碰撞。
- Step5/Step6 下载入口只看 job completed，不看 finding 处理状态，存在绕过确认的风险。

## 2. Finding-Centric 原则符合度

| 原则 | 结论 | 证据与问题 |
|---|---|---|
| Finding 是业务事实 | 部分符合 | `FindingContract`、`/findings` API、Step4Diff 的 `canonicalFindings` 已存在；但 `useDiffReviewController` 仍以 `ReviewItem` 和 label 管理动作状态。 |
| Page 只是定位容器 | 不完全符合 | reviewStore 的 `selectCurrentPage` 是派生值；但 Step4Diff controller 仍独立维护 `page` 并持久化。 |
| currentPage 不得作为业务主状态 | 不符合 | `useDiffReviewController` 存在 `page`、`selectPage`、`handlePaperScroll`、localStorage page。Step4Fix runtime 也维护 `currentPage`，目前偏视觉播放态，但需要明确不能进入业务守门。 |
| rulePath 不得通过当前页推断 | 部分符合 | RulePane 使用 focused finding 的 `ruleBreadcrumb`；但 breadcrumb 来自 UI adapter 拼装，不是由 `finding.ruleId` 反查规则 registry。 |
| focusFindingId 只派生 UI 渲染状态 | 部分符合 | `reviewStore` 做到了 SSOT；但 Step4Diff controller 同时维护 `activeRuleId`，存在第二焦点。 |
| 左侧规则地图必须由 finding.ruleId 反查 | 不符合 | `RulePane` 依赖 `finding.ruleBreadcrumb`；Step4Diff 生成 breadcrumb 时依赖学校名、cat、label。 |
| 右侧修复卡片必须由 finding 驱动 | 部分符合 | `FindingPane` 接收 `Finding[]`；但 Step4Diff 仍由 `ReviewItem[]` 反建 finding，fallback synthetic finding 仍存在。 |
| 中间文档画布只负责定位、高亮、证据展示 | 部分符合 | `Canvas` 主要负责定位与高亮；但同段多 finding 只渲染 primary finding，有证据丢失风险。 |
| 本 Phase 禁止修改业务代码 | 符合 | 本 Phase 只新增 `docs/audit/*` 审计文档。 |
| 必须输出迁移地图和 Phase 1 改造计划 | 符合 | 已输出 `legacy-to-finding-migration-map.md` 与 `phase-1-change-plan.md`。 |

## 3. 层级审计

### 3.1 Shared Types 与 Finding 合同

相关文件：

- `paper-formatter/packages/shared-types/src/finding-contract.ts`

已符合项：

- `FindingContract` 已使用 `finding_id`、`document_id`、`rule_id`、`evidence_spans`、`status`、`audit_trail`。
- `FindingDocumentQuery`、`FindingSyncCommand`、`P1ExemptionCommand` 已收敛到 shared-types。
- query/command 已开始区分 canonical document 与 legacy job document。

风险：

- UI 侧仍扩展出 `id`、`uiId`、`pageNo`、`ruleBreadcrumb` 等 adapter 字段，容易把 adapter id 和规范 `finding_id` 混用。
- `ruleBreadcrumb` 不属于 contract 主事实，Phase 1 应变成 selector/lookup 结果，而不是持久业务字段。

### 3.2 Backend Findings API

相关文件：

- `paper-formatter/services/api-gateway/src/routes/findings.ts`
- `paper-formatter/services/api-gateway/src/repositories/findings.ts`
- `paper-formatter/services/api-gateway/src/dto/finding-document-requests.ts`

已符合项：

- `/findings` 查询拒绝 page 参数，按 `document_id`、`job_id`、`status`、`severity`、`rule_id`、`rule_group` 过滤。
- accept/reject/self-edit 以 `findingId` 为路由参数。
- P1 豁免以 canonical document 和 finding_id 列表记录 audit。
- repository 按 `document_id` 和 finding payload 写入，排序使用 evidence span page 作为展示排序，不作为业务主状态。

风险：

- 下载接口没有做 finding-aware guard。`writeJobDownload` 只检查 job completed 和 outputPath，不检查 P0/P1 pending、P1 exemption、finding audit。
- Finding 生成阶段仍可能从 warnItems/ruleDetails 生成，规则路径没有统一 registry 反查层。

### 3.3 Frontend API Client

相关文件：

- `paper-formatter/services/client/src/api/client.ts`

已符合项：

- `listFindings` 使用 `canonicalDocumentId` 参数。
- `syncFindings`、`acceptFinding`、`rejectFinding`、`selfEditFinding`、`exemptP1Findings` API 已以 finding/document 命名。

风险：

- API client 已经较清晰，主要风险来自调用方仍存在 legacy controller 状态。

### 3.4 Review Store 与三栏联动

相关文件：

- `paper-formatter/services/client/src/stores/reviewStore.ts`
- `paper-formatter/services/client/src/hooks/useFindingObserver.ts`
- `paper-formatter/services/client/src/components/review-workbench/Canvas.tsx`
- `paper-formatter/services/client/src/components/review-workbench/FindingPane.tsx`
- `paper-formatter/services/client/src/components/review-workbench/RulePane.tsx`

已符合项：

- `focusFindingId` 是 reviewStore 的唯一焦点字段。
- `setFocus(id, source)` 是统一写入口，并带 `scrollSource` 锁。
- `selectCurrentPage` 从 focused finding 派生。
- Canvas 使用 IntersectionObserver，不用 scroll 手算可视占比。
- FindingPane 响应 focus 并使用 `nearest` 滚动卡片。
- URL hash 持久化 `#finding=...` 已存在。

风险：

- `Finding` 类型同时有 `finding_id`、`id`、`uiId`，需要收敛命名边界，避免业务逻辑误用 adapter id。
- Canvas 同段多 finding 仅渲染第一条，会让部分 finding 无锚点、无高亮、无法独立聚焦。
- RulePane 依赖 `ruleBreadcrumb`，不是由 `finding.ruleId` 反查规则路径。

### 3.5 Step4Diff 业务控制器

相关文件：

- `paper-formatter/services/client/src/screens/Step4Diff.tsx`
- `paper-formatter/services/client/src/screens/step4-diff/useDiffReviewController.ts`

已符合项：

- Step4Diff 已能接入真实后端 `finding_id` / `document_id`。
- review workbench 的 accept/reject/self-edit 最终会调用 finding API。
- P0/P1 下载守门在 Step4Diff 页面层有判断。

核心问题：

- `useDiffReviewController` 仍维护 `page`、`activeRuleId`、`previewRuleId`、`ruleActions`。
- `ruleActions` 以 `item.label` 为 key，存在同 label 多 finding 状态碰撞。
- controller localStorage 持久化 page 和 activeRuleId，形成 `focusFindingId` 之外的第二状态源。
- Step4Diff 通过 effect 在 `focusFindingId` 和 `activeRuleId` 间桥接，属于过渡方案，不是最终 finding-centric 架构。

### 3.6 Step4Fix 修复播放

相关文件：

- `paper-formatter/services/client/src/components/FixTimeline.tsx`
- `paper-formatter/services/client/src/components/fix-runtime/types.ts`
- `paper-formatter/services/client/src/components/fix-runtime/useFixRuntimePlayback.ts`
- `paper-formatter/services/client/src/components/fix-runtime/useFixRuntimeActionPlayback.ts`
- `paper-formatter/services/client/src/components/fix-runtime/useFixRuntimePageSync.ts`
- `paper-formatter/services/client/src/components/fix-runtime/useFixRuntimeAttentionEffects.ts`

已符合项：

- runtime hooks 已拆分，页面/动作/attention effects 已有清晰边界。
- `currentPage` 当前更像视觉播放状态，用于 A4 展示、剩余时间、动作流同步。

风险：

- 修复播放基于 `FixAction.locator.page` 和 mock paperContent，而不是由 `FindingContract` 或 finding-linked fix task 生成。
- 左侧规则卡片从 `block.ruleRefs` 或 activeFrame rule 派生，不是 `finding.ruleId` 反查。
- 如果用户把 Step4Fix 视为业务确认依据，则当前 action/page-centric 模型会偏离 finding-centric 主线。

### 3.7 Step5/Step6 下载守门

相关文件：

- `paper-formatter/services/client/src/screens/Step5Output.tsx`
- `paper-formatter/services/api-gateway/src/services/job-queries.ts`

核心问题：

- Step5 下载按钮只检查 `state.jobStatus === 'completed'`。
- 后端 `writeJobDownload` 只检查 job completed 和 outputPath。
- 下载守门没有复用 Step4Diff 的 P0/P1 pending + exemption 判断。

结论：

下载守门必须从页面级判断升级为 client/server 共同的 finding guard。否则 Step5/Step6 可以绕过第 5 步确认页的真实状态。

## 4. P0 问题清单

| ID | 问题 | 影响 | 建议归属 |
|---|---|---|---|
| P0-1 | Step4Diff controller 仍以 page/activeRuleId/ruleActions 驱动业务状态 | 三栏联动语义错乱，状态双源 | Phase 1 |
| P0-2 | `ruleActions` 以 label 为 key | 同 label 多 finding 状态碰撞 | Phase 1 |
| P0-3 | Step5/后端下载不检查 finding guard | 用户可绕过待确认项直接下载 | Phase 1 |
| P0-4 | RulePane 不通过 `ruleId` 反查规则路径 | 规则地图可能与 finding 事实脱钩 | Phase 1 |
| P0-5 | Canvas 同段多 finding 只显示 primary | 部分 finding 缺证据锚点 | Phase 1 |

## 5. P1 问题清单

| ID | 问题 | 影响 | 建议归属 |
|---|---|---|---|
| P1-1 | UI Finding 同时暴露 `finding_id`、`id`、`uiId` | 命名边界不清，后续易回归 | Phase 1/2 |
| P1-2 | Step4Fix 仍 action/page-centric | 修复播放与确认结果可能不同源 | Phase 2 |
| P1-3 | Synthetic finding fallback 仍是主页面可见路径 | Demo 和真实路径边界不清 | Phase 2 |
| P1-4 | Finding status 分散在 API、reviewStore、legacy controller | audit trail 与 UI 状态可能不一致 | Phase 1 |

## 6. Phase 0 结论

本工程已具备 finding-centric 的底座，但还没有完成产品动线层的收敛。Phase 1 不应该继续增加视觉交互，而应先删除/替换 legacy controller 的业务职责，把 Step4Diff、Step5 下载守门、RulePane 规则映射统一收敛到 `finding_id`。

## 7. Phase 1 是否可以开始

结论：可以开始，但必须按“数据契约层 Phase 1”开始，不允许直接进入三栏 UI 重构、真实后端接入、下载豁免完整流程或 Claude API 接入。

可以开始的原因：

- Phase 0 已确认 finding-centric 的核心偏差点：旧对象、page、ruleActions、ruleBreadcrumb、repairAction 与下载守门之间仍存在多条业务主线。
- 当前问题已经可以被拆成数据契约层任务：Finding Schema、legacy adapter、Finding Store、selectors、status machine、rule resolver、自检脚本。
- Phase 1 的边界足够小，可以通过类型检查、单元测试、范式 grep、不变式脚本验证，不依赖真实后端或完整 UI 行为。
- 迁移路径已经明确：Legacy issue / annotation / repairAction → legacyFindingAdapter → Standard Finding → Finding Store → Selectors → UI Consumer。

开始 Phase 1 的前置约束：

- Phase 1 只允许修改 `docs/audit/phase-1-change-plan.md` 中列出的数据契约、规则解析、测试和自检脚本相关文件。
- Phase 1 禁止修改三栏 UI、真实 API client、Fastify 路由、Prisma、下载页和视觉样式。
- Phase 1 的完成标准必须以 `phase-1-self-check-report.md` 和 `phase-tracking.md` 为准，不以“页面看起来正常”为准。
- 如果执行中发现必须改 UI 或后端，必须停止并升级为 Phase 2/Phase 3 计划，不得混入 Phase 1。

Go / No-Go：

| 项目 | 结论 | 原因 |
|---|---|---|
| 是否允许启动 Phase 1 | Go | 审计已识别明确 P0 风险，且可通过数据契约层最小闭环解决 |
| 是否允许做三栏 UI 重构 | No-Go | UI 消费层必须等 Finding Schema / Store / Selectors 冻结后再接 |
| 是否允许接真实后端 | No-Go | Phase 1 不接 Fastify / Prisma，先冻结前端与核心契约 |
| 是否允许做下载豁免完整流程 | No-Go | 下载守门依赖 Finding Status Machine 和 guard，不应提前进入完整链路 |
| 是否允许写自检脚本和最小测试 | Go | 这是 Phase 1 的验证核心，必须优先落地 |
