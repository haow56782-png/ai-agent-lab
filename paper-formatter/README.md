# Paper Formatter · 论文排版修复系统

Paper Formatter 是一个 AI Agent 驱动的论文排版修复系统，面向“已经写好的论文”。它会读取 Word/PDF 文档，识别学校规则与 GB/T 7713.1 基线，生成可追溯的发现项，并在安全边界内执行自动修复，最后交给用户逐项确认后下载定稿。

> 产品底线：系统只修改排版与格式属性，不静默改正文语义；所有自动修复都必须能回到 finding、规则依据和证据位置。

## 核心流程

```text
上传论文
  → 识别学校 / 选择规则包
  → 解析文档结构并生成 finding
  → 自动修复可安全写回的格式问题
  → 人工确认所有修改
  → 下载定稿或检测报告
```

## 当前能力

| 模块 | 当前状态 |
|---|---|
| Word 排版修复 | 支持 `.docx` 上传、解析、规则检测、格式写回与下载 |
| PDF 格式检测 | 支持 `.pdf` 类型入口，定位为格式检测报告，不直接修改 PDF |
| 学校规则 | 支持 canonical school profile、别名识别、官方/待补规则标识 |
| Finding 架构 | Step3/Step4/Step5 以 `finding_id` 串联检测、修复、确认 |
| 规则引擎 | format detectors、canonical rule map、rule snapshots、优先级排序 |
| DOCX 对象图 | 支持图/表/caption/续表的 object graph 探针与回归基础 |
| 下载守门 | Step6 基于任务类型、修复状态、确认状态判断下载按钮可用性 |
| 视觉回归 | Step5 视觉基线与 Step4/Step5 行为测试逐步接入 CI |

## 修复现场截图

Step4 用来呈现“系统正在逐项修复论文”的现场感：论文纸面居中，当前 finding 高亮，右侧展示证据、修复动作和写回状态，所有修改最终进入确认页复核。

![Step4 论文修复现场](docs/assets/step4-repair-workbench.png)

## 服务结构

```text
paper-formatter/
├── services/
│   ├── client/              # React + Vite 前端工作台
│   ├── api-gateway/         # Express API、任务编排、规则检测、下载守门
│   └── docx-parser/         # Python DOCX 解析与格式化入口
├── packages/
│   └── shared-types/        # 前后端共享类型、DTO、Finding guard
├── docs/
│   ├── api-spec.md          # API 契约
│   ├── system-architecture.md
│   ├── data-model.md
│   └── deployment.md
├── deploy/                  # Nginx / systemd / 部署脚本
└── .github/workflows/       # CI、行为测试、视觉基线
```

## 架构原则

1. **Finding-centric**：Finding 是业务事实，Page 只是定位容器。
2. **规则优先**：学校规则优先于 GB 基线；冲突必须显式 warning，不静默覆盖。
3. **证据可追溯**：每个修复项都要能追到规则、对象锚点、证据快照和建议动作。
4. **安全写回**：格式化器只修改格式属性；content-level integrity checker 校验正文风险。
5. **确认后下载**：最终文档必须经过确认页和下载守门，不允许绕过修复/确认状态。

## 本地开发

### API Gateway

```bash
cd services/api-gateway
npm install
npm run dev
```

默认 API 地址：

```text
http://localhost:4000/api/v1
```

### Client

```bash
cd services/client
npm install
npm run dev
```

默认前端地址：

```text
http://localhost:5173
```

## 关键接口

| 接口 | 职责 |
|---|---|
| `POST /api/v1/documents` | 上传 Word/PDF 文档，返回 `docId` 与 `canonicalDocumentId` |
| `POST /api/v1/profiles/detect` | 根据文档识别学校规则包 |
| `GET /api/v1/profiles/:schoolId` | 读取学校规则详情与完整规则集 |
| `POST /api/v1/jobs/analyze` | 创建解析/体检任务，生成 findings |
| `GET /api/v1/jobs/:jobId` | 查询 analyze job 状态与结果 |
| `POST /api/v1/jobs/fix` | 创建自动修复任务 |
| `GET /api/v1/jobs/:jobId/fix-status` | 查询修复进度、产物与 finding 状态 |
| `GET /api/v1/jobs/:jobId/diff` | 读取修复前后差异确认数据 |
| `POST /api/v1/jobs/format` | 创建最终格式化/导出任务 |

更多契约见 [docs/api-spec.md](docs/api-spec.md)。

## 更新日志

依赖、安装方式、部署和主链路交互更新统一记录在 [docs/CHANGELOG.md](docs/CHANGELOG.md)。每次更新后都需要追加日期、影响范围和验证方式。

## 规则与 Finding

规则系统正在从 JSONB 缓存形态收敛为标准表结构：

- `school_rule_sets`：学校规则包
- `school_rules`：可展示、可检测、可映射的 canonical 规则
- `rule_snapshots`：每次 analyze job 使用的规则快照
- `findings`：检测、修复、确认的业务主对象

前端展示遵循论文元子集语义：页面版心、封面、摘要、目录、标题层级、正文段落、图、图题、表、表题、续表、参考文献、页眉页脚、页码、附录、致谢等。

## 验证命令

```bash
# API 类型与单元测试
cd services/api-gateway
npm run build
npm test

# Client 类型检查与行为测试
cd services/client
npm run typecheck
npm run test:behavior -- --reporter=line

# 视觉基线
cd services/client
npm run test:visual
```

## 运行时默认项

- 默认模型提供方：`deepseek`
- 默认执行模型：`DeepSeek v4`
- 默认执行权限模式：`default`

这些默认项由 API Gateway health/config 暴露，便于部署和排查。

## 部署说明

目标生产部署：

- Ubuntu 22.04 轻量服务器
- Nginx + Certbot HTTPS
- Client 静态资源由 Nginx 托管
- API Gateway 作为后端服务运行
- PostgreSQL 存储文档元数据、规则集与 findings
- MinIO 存储原稿、修复稿和导出产物
- Redis 用于异步任务和轮询优化

详见 [docs/deployment.md](docs/deployment.md) 与 `deploy/`。

## 当前重点

- 完整学校规则落表与 canonical ruleId 覆盖率
- Step4 修复现场从“动画演示”收敛为真实修复工作台
- Step5 确认页的下载 gate、持久化与视觉基线稳定性
- DOCX object graph 驱动的图题、表题、续表识别回归
- 真实学校样本规则采集、审批、回归 fixture 自动生成
