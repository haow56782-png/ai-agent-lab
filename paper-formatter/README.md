# AI 论文排版工具 — Paper Formatter

基于深度研究报告设计的后端系统。客户端高保真原型已输出，本仓库为配套后端服务。

## 技术栈

| 层 | 技术 | 职责 |
|----|------|------|
| API Gateway | Node.js / TypeScript | 认证、路由、任务编排 |
| DOCX 解析 | Python (python-docx) | 读取 DOCX 结构、样式、分节 |
| PDF 处理 | Python (PyMuPDF, PaddleOCR) | PDF 解析与 OCR |
| DOCX 格式引擎 | .NET / Open XML SDK | 生产级 DOCX 写入与格式化 |
| 存储 | PostgreSQL + MinIO (S3) | 元数据 + 文档存储 |
| 队列 | Redis / BullMQ | 异步任务 |

## 运行时默认项

- 默认模型提供方：`deepseek`
- 默认执行模型：`DeepSeek v4`
- 默认执行权限模式：`default`

## 项目结构

```
paper-formatter/
├── docs/                    # 架构设计文档
│   ├── system-architecture.md
│   ├── api-spec.md
│   └── data-model.md
├── services/
│   ├── api-gateway/         # TypeScript API 服务
│   ├── docx-parser/         # Python DOCX 解析
│   ├── pdf-processor/       # Python PDF 处理
│   ├── formatter/           # .NET DOCX 格式引擎
│   └── orchestrator/        # TypeScript 任务编排
├── packages/
│   ├── shared-types/        # TypeScript 类型定义
│   └── rule-engine/         # 规则引擎核心
├── docker-compose.yml
└── Makefile
```

## 快速开始

```bash
# 启动所有服务 (开发模式)
docker-compose up -d

# 或本地启动 API 服务
cd services/api-gateway && npm install && npm run dev
```

## API 文档

详见 [docs/api-spec.md](docs/api-spec.md)

## 设计决策

- DOCX 是权威编辑载体，PDF 仅参考
- 规则引擎主导，ML 仅辅助识别
- 异步 Job 模式，客户端轮询
- 三层内容安全门禁 (白名单 + 文本指纹 + 文档比较)
