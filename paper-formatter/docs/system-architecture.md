# Paper Formatter 系统架构

## 1. 产品定位

Paper Formatter 的核心任务是：**把学生已经写好的论文，按学校规则与国标基线透明地检查、确认、修复并导出定稿**。

产品不是普通 PDF/Word 阅读器，而是 AI Agent 驱动的“发现 → 建议 → 修复 → 确认 → 下载”工作台。

核心原则:

1. **Finding 是业务事实**，Page 只是定位容器。
2. **DOCX 是主要编辑载体**，PDF 仅作为输入/参考能力逐步增强。
3. **规则和证据优先**，AI/ML 只能辅助识别，不应静默改正文语义。
4. **下载必须受 Finding Guard 约束**，不能绕过 P0/P1 风险。
5. **所有长任务必须可解释**，前端展示真实阶段、产物和用户可介入路径。

## 2. 当前实现架构

```text
┌────────────────────────────────────────────────────────────┐
│                    Client · React/Vite                     │
│  Step1 上传 · Step2 学校 · Step3 解析 · Step4 修复/差异 · Step5 确认 │
│  finding-centric workbench · Step5 visual baseline CI      │
└───────────────────────────┬────────────────────────────────┘
                            │ REST / JSON / multipart
                            ▼
┌────────────────────────────────────────────────────────────┐
│                 API Gateway · Express/TypeScript           │
│  routes: documents / profiles / jobs / findings / share    │
│  DTO parsers: job-document / finding-document / share       │
│  services: job-orchestrator / job-queries                  │
└──────────────┬─────────────┬──────────────┬────────────────┘
               │             │              │
               ▼             ▼              ▼
┌──────────────────┐ ┌────────────────┐ ┌──────────────────┐
│ PostgreSQL        │ │ MinIO           │ │ Redis             │
│ documents/jobs    │ │ uploads/outputs │ │ cache / detect    │
│ findings/audit    │ │ reports         │ │ optional runtime  │
└──────────────────┘ └────────────────┘ └──────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────────┐
│             Python Parser / Formatter Boundary             │
│  api-gateway parser: DOCX structure extraction             │
│  formatter service: DOCX formatting and diff output         │
└────────────────────────────────────────────────────────────┘
```

## 3. 前端分层

| 层 | 责任 | 代表文件 |
|---|---|---|
| App Flow | 步骤流、文档身份、全局 AppState | `services/client/src/App.tsx` |
| Step Screens | 每一步页面编排，不承载深业务模型 | `screens/Step*.tsx` |
| Review Workbench | 三栏 finding-centric 联动 | `components/review-workbench/*` |
| Runtime Views | 修复阶段纸面、动作流、规则旁白 | `components/fix-runtime/*` |
| Stores/Hooks | `focusFindingId`、观察器、播放状态 | `stores/reviewStore.ts`, `hooks/useFindingObserver.ts` |
| Core Finding | Phase1 finding schema/selectors/status machine | `src/core/finding/*` |

### Finding-Centric UI 规则

- 唯一焦点状态是 `focusFindingId`。
- 当前页必须由 focused finding 的 evidence/anchor 派生。
- 左栏规则路径由 `finding.rule_id` 反查，不能从页面推断。
- 右栏卡片、中央画布、URL hash 订阅同一个 finding id。
- 已处理 finding 仍可导航，但视觉降级。

## 4. 后端分层

| 层 | 责任 | 代表文件 |
|---|---|---|
| HTTP Edge | 路由、状态码、响应契约 | `src/routes/*` |
| DTO Parser | 入参命名边界和验证 | `src/dto/*` |
| Orchestration | Job 创建、解析、修复编排 | `src/services/job-orchestrator.ts` |
| Query/Download | Public job 状态、diff、download guard | `src/services/job-queries.ts` |
| Repositories | Postgres 读写 | `src/repositories/*` |
| Storage Adapter | MinIO bucket 读写 | `src/storage.ts` |
| Parser Boundary | Python 解析脚本调用 | `src/parser/*` |

### DTO 命名边界

| 领域 | HTTP 字段 | 内部命名 | 说明 |
|---|---|---|---|
| Job | `docId` | `legacyDocId` | 兼容旧文档 id |
| Finding | `document_id` | `canonicalDocumentId` | 规范 UUID 文档 id |
| Share/Profile | `fileId` / `docId` | `legacyDocId` | 与历史流程兼容 |

该边界防止 `docId` 在 Job、Finding、Download Guard 三个领域里语义漂移。

## 5. 数据模型

### Documents

`documents` 同时保存:

- `doc_id`: legacy document id，例如 `doc_abc12345`
- `canonical_document_id`: UUID，Finding 领域使用
- `filename`, `size_bytes`, `sha256`, `file_type`
- `page_count`, `is_scanned_pdf`

### Jobs

Job 是长任务实例，类型包括:

- `analyze`
- `format`
- `fix`

Job 对外公开:

- `jobId`
- `status`
- `progress`
- `stage`
- `result`
- `error`
- `estimatedSeconds`

### Findings

Finding 是论文审查事实，包含:

- `finding_id`
- `document_id`
- `document_version`
- `rule_id`
- `rule_group`
- `severity`: `P0 | P1 | P2`
- `status`
- `evidence_spans`
- `audit_trail`

Finding 状态变化必须写 audit record。

### P1 Exemption

P1 豁免是下载守门的一部分，要求:

- actor 为 `Author` 或 `Admin`
- 显式 `acknowledged`
- 至少 20 字符理由
- 写入 exemption/audit 记录

## 6. 关键流程

### 上传与学校识别

```text
Client uploads file
  → POST /api/v1/documents
  → store MinIO uploads
  → insert documents(doc_id, canonical_document_id)
  → POST /api/v1/profiles/detect
  → Python detect_school.py
  → optional /profiles/auto-create
```

### 解析任务

```text
POST /api/v1/jobs/analyze(docId, profileId)
  → parse job command as legacyDocId
  → load document from Postgres/MinIO
  → run parser/parse.py
  → build ruleDetails + findings
  → update job result
  → findings can be synced/queryable by canonical document_id
```

### 修复任务

```text
POST /api/v1/jobs/fix(jobId, docId, profileId, fixTypes)
  → build source context from analyze job
  → call formatter service / local formatting boundary
  → write outputs/reports to MinIO
  → expose /jobs/{jobId}/fix-status events/artifacts
```

### 确认与下载

```text
Step5 confirmation
  → accept/reject/self-edit findings
  → optional P1 exemption
  → GET /jobs/{jobId}/download
  → canDownloadByFindings guard
  → stream output or report
```

下载守门优先级:

1. 未完成 job 阻断。
2. P0 未处置阻断。
3. P1 未处置且无豁免阻断。
4. P2 不阻断，但保留风险提示。

## 7. 部署架构

当前生产部署目标是轻量服务器单机部署:

```text
Internet
  → Nginx + Certbot HTTPS
    ├─ static client dist
    ├─ /api/*   → 127.0.0.1:4000 api-gateway
    ├─ /share/* → 127.0.0.1:4000 share pages
    └─ /health  → 127.0.0.1:4000 health

Docker Compose
  ├─ api-gateway:4000
  ├─ formatter:5000
  ├─ postgres:5432 internal
  ├─ redis:6379 internal
  └─ minio:9000 internal, console bound to 127.0.0.1
```

相关文件:

- `docker-compose.yml`: 本地开发栈
- `docker-compose.prod.yml`: 生产栈
- `.env.production.example`: 生产环境变量模板
- `deploy/nginx/paper-formatter.conf`: Nginx 模板
- `deploy/systemd/paper-formatter-compose.service`: systemd 启动模板

## 8. CI / Quality Gates

当前已落地的门禁:

- Root CI: TypeScript/Vitest 基础检查。
- Client CI: build、Playwright behavior、Step5 visual baseline。
- API Gateway: Vitest route/DTO/parser tests。
- Formatter: Python compile smoke check。

关键回归测试:

- Step4/Step5 Playwright 行为测试锁定 finding_id、hash、画布锚点、确认页键盘可访问性、刷新恢复、beforeunload。
- Step5 视觉基线锁定确认页 pending/completed 两态。
- API tests 锁定 job/finding/profile-share DTO 和核心 routes。

## 9. Roadmap / Not Yet Current Baseline

以下能力是目标态或后续阶段，不应被文档误读为当前已完整实现:

- PDF 深度解析与 OCR。
- Word 插件。
- 多租户认证/权限模型。
- 队列化 worker 与分布式任务调度。
- .NET/OpenXML 生产级写入引擎。
- 完整 L1/L2/L3 规则库管理后台。
- 真实 AI 模型调用的在线策略和成本管控。

当前基线以“单机可部署、finding-centric 可验证、Step4/Step5 交互闭环”为准。
