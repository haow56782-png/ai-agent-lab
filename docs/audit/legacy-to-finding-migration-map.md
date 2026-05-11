# Legacy To Finding Migration Map

## 1. 迁移目标

目标是将当前工程中与问题、批注、修复动作相关的旧对象统一映射为标准 Finding。

本文件只定义迁移地图，不执行代码修改。

---

## 2. 旧对象总览

| Legacy 对象 | 文件位置 | 当前职责 | 是否保留 | 目标对象 | 迁移策略 |
|---|---|---|---|---|---|
| issue | 当前工程未发现独立 `issue` 模型；等价语义分散在 `ReviewItem.current`、`Finding.problem`、`RuleHitItem` | 表示被发现的问题或规则命中 | 不保留为业务主对象 | Finding | 若后续接入外部 issue 源，必须通过 `normalizeLegacyIssueToFinding()` 转换后进入 store |
| annotation | `paper-formatter/services/client/src/components/review-workbench/Canvas.tsx`、`paper-formatter/services/client/src/components/fix-runtime/types.ts` | A4 画布上的高亮、页边批注、红笔痕迹 | 仅保留为 UI projection | Finding | annotation 只能由 `finding.anchor`、`finding.span`、`finding.suggestion_snapshot` 派生 |
| comment | `paper-formatter/services/client/src/components/review-workbench/FindingPane.tsx`、`RulePane.tsx` 中的说明文案 | 展示问题说明、建议、规则依据 | 仅保留为展示文案 | Finding | comment 不独立入库，统一映射到 `evidence_snapshot`、`rule_snapshot`、`suggestion_snapshot` |
| repairAction | `paper-formatter/services/client/src/components/fix-runtime/*`、`paper-formatter/services/client/src/mock/fixActions.ts` | 修复阶段的播放动作、钢笔动画、动作流 | Phase 1 不作为主对象保留 | Finding | Phase 1 只定义 `normalizeRepairActionToFinding()`，Phase 2 再处理真实修复动作与 finding 的绑定 |
| fixItem | `paper-formatter/services/client/src/screens/step4-diff/types.ts` 中 `DiffItem`、fix runtime action item | 表示删除、替换、批注、格式提示 | 不保留为业务主对象 | Finding | `DiffItem` 只能作为 Finding suggestion 的 UI 展示结果，不得绕过 Finding Store |
| problemItem | `paper-formatter/services/client/src/screens/step4-diff/types.ts` 中 `ReviewItem`、`buildReviewItems*` 产物 | Step4 右侧确认卡片的旧展示对象 | Phase 1 后仅保留为 legacy 输入 | Finding | 通过 adapter 转成标准 Finding，UI 不再直接消费 `ReviewItem` 做业务判断 |

---

## 3. 字段映射表

| Legacy 字段 | Legacy 对象 | Target Finding 字段 | 转换规则 | 是否必填 | 备注 |
|---|---|---|---|---|---|
| id | issue / annotation / repairAction / fixItem / problemItem | findingId | 优先使用后端 `finding_id`；无后端 id 时使用 documentId + legacy id 生成稳定 id | 是 | 不允许把 UI adapter id 作为业务 id 直接写入 |
| page | problemItem / repairAction / fixItem | anchor.pageIndex | legacy page 通常为 1-based，进入 Finding 时保留为显示页或转换为约定 pageIndex | 否 | page 只能作为定位容器，不能作为业务主状态 |
| pageIndex | annotation / repairAction | anchor.pageIndex | 若已是 0-based，adapter 必须显式标注来源并统一转换 | 否 | 禁止通过 currentPage 反推 finding 所属规则 |
| text | issue / annotation / comment / problemItem | evidence_snapshot.text | 取原始命中文本、当前格式描述或正文片段 | 是 | 无文本时 adapter 应返回错误或空映射原因 |
| message | issue / comment / problemItem | issue.title / issue.description | 短句进入 title，长说明进入 description；若目标 schema 未拆 title/description，则进入 evidence_snapshot.summary | 是 | 不得只保留 UI 文案，必须保留可审计证据 |
| rule | issue / problemItem / repairAction | ruleId | 优先读取 `rule_id`；否则由规则分类 + label 生成稳定 ruleId | 是 | rulePath 必须由 ruleId 反查，不得从 page 推断 |
| severity | issue / problemItem | severity | 映射为 P0 / P1 / P2；无法判断时默认 P2 并记录 adapter warning | 是 | P0/P1 影响下载守门 |
| confidence | issue / annotation / repairAction | confidence | 读取模型置信度；无值时留空或按来源给默认区间 | 否 | 不能用 confidence 代替 status |
| suggestion | issue / repairAction / fixItem / problemItem | suggestion_snapshot | 保存修复建议、改前改后、动作类型 | 否 | 真实修复动作后续 Phase 2 再绑定 |
| status | issue / problemItem / FindingContract | status | 映射为 pending / accepted / ignored / self_edited / rejudging / resolved / failed / conflicted | 是 | 业务状态只允许通过 Finding Status Machine 改变 |

---

## 4. Adapter 设计建议

Phase 1 应新增：

```text
src/core/finding/adapter.ts
```

必须提供：

```ts
normalizeLegacyIssueToFinding()
normalizeLegacyAnnotationToFinding()
normalizeRepairActionToFinding()
```

如当前工程不存在某类旧对象，对应函数可保留但返回明确错误或空映射。

Adapter 的职责：

- 只做 legacy object 到 Finding 的标准化。
- 不读取 React state。
- 不读取 currentPage。
- 不直接调用 UI。
- 不直接调用后端。
- 所有转换失败必须返回结构化原因。

---

## 5. 禁止策略

Phase 1 禁止：

- 直接在 UI 中继续消费 issue / annotation / repairAction。
- 直接把 currentPage 作为 Finding 归属依据。
- 直接通过当前页推断 rulePath。
- 创建 Finding 的新同义模型。
- 用 label、title、message 作为业务状态 key。
- 在 adapter 里写入 accepted / ignored 等用户决策状态。
- 在 selector 里修改 Finding Store。

---

## 6. Phase 1 最小迁移路径

```text
Legacy issue / annotation / repairAction
↓
legacyFindingAdapter
↓
Standard Finding
↓
Finding Store
↓
Selectors
↓
UI Consumer
```

说明：

- UI Consumer 只能读取 selector 结果。
- RulePane 只能通过 focused finding 的 `ruleId` 反查 rulePath。
- Canvas 只能通过 focused finding 的 `anchor` 和 `span` 定位。
- FindingPane 只能通过 Finding Store 的 `status` 展示决策状态。

---

## 7. 迁移优先级

| 优先级 | 旧对象 | 原因 |
|---|---|---|
| P0 | problemItem / ReviewItem | 当前 Step4Diff 右侧确认卡片和状态流仍最容易回退到 label/id/page，是 finding-centric 主线的最大风险 |
| P0 | annotation / Canvas anchor | 中间画布是证据展示核心，必须保证每个 finding 有可定位、可聚焦、可审计的 anchor |
| P0 | rule / ruleBreadcrumb | 左侧规则地图必须由 ruleId 反查，不能继续依赖 UI adapter 拼装路径 |
| P1 | repairAction / fixItem | Step4Fix 当前更像播放态，Phase 1 先冻结转换契约，Phase 2 再绑定真实修复动作 |
| P1 | comment | comment 是展示投影，不应成为业务对象，但需要统一进入 evidence/suggestion 快照 |
| P2 | issue | 当前工程未发现独立 issue 模型，先保留 adapter 入口，等待外部 issue 源接入 |

---

## 8. 不迁移项

| 对象 / 文件 | 不迁移原因 | 后续处理 |
|---|---|---|
| `paper-formatter/services/client/src/components/fix-runtime/PenCursor.tsx` | 纯视觉动效，不承载业务 finding 状态 | 保留为 UI component，Phase 2 如需联动再订阅 selector |
| `paper-formatter/services/client/src/mock/fixActions.ts` | mock 数据，不应成为 Phase 1 标准契约来源 | Phase 2 改为从 finding-linked fix task 生成 |
| `paper-formatter/services/client/src/screens/step4-diff/diffCopy.ts` | 文案层，不承载 finding 事实 | 保留，但文案变量应来自 selector |
| `paper-formatter/services/client/src/screens/step4-diff/diffViewModel.ts` | 当前仍承担 legacy ReviewItem 构造，Phase 1 只把它作为 adapter 输入 | 等 `src/core/finding/adapter.ts` 稳定后逐步收敛 |
| `paper-formatter/services/client/src/components/review-workbench/*.tsx` | Phase 1 不做三栏 UI 重构 | Phase 2/3 再切 UI Consumer 到 selectors |

