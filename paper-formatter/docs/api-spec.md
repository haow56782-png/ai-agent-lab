# API 规范 — Paper Formatter

## 1. 基础信息

- Base URL: `/api/v1`
- 当前本地默认端口: `4000`
- 文件上传使用 `multipart/form-data`
- 长任务使用 Job 模式: 创建任务 → 轮询状态 → 获取差异/下载
- 当前 Demo/内测阶段未强制认证；生产环境应在 Nginx/API Gateway 层补齐认证、限流与审计。

### Health

```http
GET /api/v1/health
GET /health
```

Response:

```json
{
  "status": "ok",
  "service": "paper-formatter-api",
  "freeFixLimit": 15,
  "defaultExecutionModel": "DeepSeek v4",
  "defaultModelProvider": "deepseek",
  "defaultExecutionPermissionMode": "default"
}
```

## 2. Document Identity

系统同时保留两类文档标识，命名边界必须清晰:

| 字段 | 含义 | 使用场景 |
|---|---|---|
| `docId` | 兼容旧链路的 legacy document id，形如 `doc_xxxxxxxx` | Job 创建、Profile 检测、历史路由兼容 |
| `canonicalDocumentId` / `document_id` | 规范文档 UUID | Finding 查询、Finding 同步、下载守门 |

规则:

- Job DTO 使用 `docId` 入参，服务内部命名为 `legacyDocId`。
- Finding DTO 使用 `document_id` 入参，服务内部命名为 `canonicalDocumentId`。
- 不得用 `page` 作为 Finding 业务查询条件；页面只能由 finding evidence/anchor 派生。

## 3. Documents

### 上传文档

```http
POST /api/v1/documents
Content-Type: multipart/form-data
```

Request:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `file` | file | 是 | `.docx` 或 `.pdf`，最大 100MB |

说明:

- 旧版 OLE2 `.doc` 文件会被拒绝，即使扩展名伪装成 `.docx`。
- 文件会写入 MinIO `uploads` bucket，并在 Postgres `documents` 表登记。

Response `201`:

```json
{
  "docId": "doc_abc12345",
  "canonicalDocumentId": "11111111-1111-4111-8111-111111111111",
  "filename": "thesis.docx",
  "size": 2458000,
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "fileType": "docx",
  "createdAt": "2026-05-08T10:00:00Z"
}
```

### 读取文档元信息

```http
GET /api/v1/documents/{docId}
```

`docId` 可传 legacy `docId` 或 canonical UUID。

### 读取存储文件

```http
GET /api/v1/documents/storage?bucket=paper-outputs&path=...
```

允许 bucket:

- `paper-uploads`
- `paper-outputs`
- `paper-reports`

## 4. Profiles

### 搜索规则包

```http
POST /api/v1/profiles/search
```

Request:

```json
{
  "schoolId": "nankai",
  "faculty": "计算机学院",
  "major": "计算机科学与技术"
}
```

Response:

```json
{
  "profiles": [
    {
      "profileId": "nankai",
      "schoolName": "nankai",
      "version": "vAuto",
      "ruleCount": 15,
      "sourceType": "seed"
    }
  ]
}
```

### 列出规则包

```http
GET /api/v1/profiles?q=南开
```

### 读取规则包详情

```http
GET /api/v1/profiles/{profileId}
```

### 检测学校

```http
POST /api/v1/profiles/detect
```

Request:

```json
{
  "docId": "doc_abc12345"
}
```

Response:

```json
{
  "detected": true,
  "name": "南开大学",
  "confidence": 0.92,
  "matchedText": "南开大学本科毕业论文",
  "existingSchoolId": "nankai"
}
```

### 自动创建学校规则包

```http
POST /api/v1/profiles/auto-create
```

Request:

```json
{
  "name": "南开大学",
  "docId": "doc_abc12345"
}
```

### 从模板导入规则包

```http
POST /api/v1/profiles/import-template
Content-Type: multipart/form-data
```

当前实现返回 `501 NOT_IMPLEMENTED`，接口占位保留。

## 5. Jobs

### 创建解析任务

```http
POST /api/v1/jobs/analyze
```

Request:

```json
{
  "docId": "doc_abc12345",
  "profileId": "nankai"
}
```

Response `202`:

```json
{
  "jobId": "job_abc12345",
  "status": "queued",
  "estimatedSeconds": 15
}
```

### 创建格式化任务

```http
POST /api/v1/jobs/format
```

Request:

```json
{
  "docId": "doc_abc12345",
  "jobId": "job_analyze_id",
  "profileId": "nankai"
}
```

### 创建修复任务

```http
POST /api/v1/jobs/fix
```

Request:

```json
{
  "docId": "doc_abc12345",
  "jobId": "job_analyze_id",
  "profileId": "nankai",
  "fixTypes": ["margin", "body_style", "heading"],
  "selectedFixes": ["finding_001", "finding_002"]
}
```

支持的 `fixTypes` 由服务端 `SUPPORTED_FIX_TYPES` 定义，包括页边距、正文样式、标题、页码、封面、目录、页眉页脚、摘要、交叉引用、题注、参考文献、表格、图片、标点等。

### 查询任务

```http
GET /api/v1/jobs/{jobId}
```

Response:

```json
{
  "jobId": "job_abc12345",
  "type": "analyze",
  "status": "completed",
  "progress": 100,
  "stage": "completed",
  "docId": "doc_abc12345",
  "profileId": "nankai",
  "result": {
    "items": [],
    "log": [],
    "rules": {},
    "ruleDetails": [],
    "findings": [],
    "parsedTexts": [],
    "rawHeadings": []
  },
  "createdAt": "2026-05-08T10:00:00Z",
  "completedAt": "2026-05-08T10:00:15Z",
  "estimatedSeconds": 15
}
```

### 查询修复进度

```http
GET /api/v1/jobs/{jobId}/fix-status
```

Response:

```json
{
  "status": "running",
  "completedSteps": [],
  "currentStep": "正文样式已统一",
  "progress": 45,
  "stage": "fixing",
  "events": [],
  "artifacts": [],
  "freeFixLimit": 15
}
```

### 获取差异预览

```http
GET /api/v1/jobs/{jobId}/diff
```

任务必须已完成。若 MinIO `reports` bucket 中存在 `diffPath`，返回真实 diff JSON；否则返回服务端生成的兜底 diff。

### 下载定稿或报告

```http
GET /api/v1/jobs/{jobId}/download
GET /api/v1/jobs/{jobId}/download?type=report
```

下载前会执行 finding guard:

- Job 必须 completed。
- P0 finding 必须全部处置。
- P1 finding 必须处置或存在明确豁免记录。
- P2 不阻断下载，但仍会保留在确认/报告中。

阻断时返回 `403 VALIDATION_ERROR`，并包含待处理 finding id 信息。

## 6. Findings

Finding 是论文审查的业务事实。页面只是定位容器，不是业务主状态。

### 查询 Findings

```http
GET /api/v1/findings?document_id={canonicalDocumentId}
GET /api/v1/findings?job_id={jobId}
GET /api/v1/findings?status=pending&severity=P1&rule_id=RULE-L2-XXX
```

禁止:

```http
GET /api/v1/findings?page=3
```

该请求会返回 `400 VALIDATION_ERROR`。

### 同步 Findings

```http
POST /api/v1/findings/sync
```

Request:

```json
{
  "document_id": "11111111-1111-4111-8111-111111111111",
  "job_id": "job_abc12345",
  "findings": [
    {
      "finding_id": "09e836f4-4f63-4e90-89e8-36f409e836f4",
      "document_id": "11111111-1111-4111-8111-111111111111",
      "document_version": 1,
      "rule_id": "RULE-L2-REFERENCE_DOI",
      "rule_group": "reference",
      "severity": "P1",
      "status": "pending",
      "evidence_spans": [{ "page": 7, "text": "参考文献条目" }],
      "audit_trail": [],
      "created_at": "2026-05-08T10:00:00Z",
      "updated_at": "2026-05-08T10:00:00Z"
    }
  ]
}
```

Response:

```json
{
  "upserted_count": 1,
  "finding_ids": ["09e836f4-4f63-4e90-89e8-36f409e836f4"]
}
```

### 处置 Finding

```http
POST /api/v1/findings/{findingId}/accept
POST /api/v1/findings/{findingId}/reject
POST /api/v1/findings/{findingId}/self-edit
```

Accept / Reject request:

```json
{
  "actor_id": "user_001",
  "actor_role": "Author",
  "reason": "我确认这处不需要修改"
}
```

Self-edit request:

```json
{
  "actor_id": "user_001",
  "new_text": "用户自行修改后的文本",
  "affected_spans": [{ "page": 3, "char_start": 10, "char_end": 20 }]
}
```

### P1 豁免

```http
POST /api/v1/findings/exempt-p1
```

Request:

```json
{
  "document_id": "11111111-1111-4111-8111-111111111111",
  "exempted_finding_ids": ["finding_p1_001"],
  "actor_id": "user_001",
  "actor_role": "Author",
  "reason": "我已理解该 P1 风险，学校模板允许此处保留，确认继续下载。",
  "acknowledged": true
}
```

要求:

- `actor_role` 只能是 `Author` 或 `Admin`。
- `reason` 至少 20 个字符。
- 必须 `acknowledged: true`。

## 7. Share / Analytics / Feedback

### 创建分享报告

```http
POST /api/v1/share/report
```

Request:

```json
{
  "fileId": "doc_abc12345",
  "checkResultId": "job_abc12345"
}
```

Response 包含 `shareId`、`shareUrl`、`ogImageUrl`、`posterUrl` 和报告摘要。

### 读取分享报告 JSON

```http
GET /api/v1/share/report/{shareId}
```

### 打开分享页面

```http
GET /share/report/{shareId}
GET /share/assets/{kind}/{shareId}.svg
```

### 记录埋点

```http
POST /api/v1/analytics/track
```

### 提交反馈

```http
POST /api/v1/feedbacks
```

Request:

```json
{
  "jobId": "job_abc12345",
  "type": "rule_miss",
  "detail": {
    "ruleId": "RULE-L2-REFERENCE_DOI",
    "expected": "补齐 DOI",
    "actual": "缺 DOI"
  }
}
```

## 8. 错误格式

统一错误响应:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "可读错误描述",
    "details": [
      { "field": "docId", "reason": "required" }
    ]
  }
}
```

| HTTP | Code | 说明 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 请求参数校验失败 |
| 403 | `VALIDATION_ERROR` | 下载守门、P1 豁免权限或确认失败 |
| 404 | `NOT_FOUND` | 资源不存在 |
| 413 | `FILE_TOO_LARGE` | 文件过大 |
| 422 | `UNSUPPORTED_FORMAT` | 文件格式不支持 |
| 500 | `INTERNAL_ERROR` | 服务端错误 |
