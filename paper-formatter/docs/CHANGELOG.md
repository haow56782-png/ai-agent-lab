# 更新日志

本文件记录项目内需要追踪的安装、依赖、部署和主链路交互更新。更新记录按日期倒叙排列，最新日期放在最上方；同一天内较新的事项也放在前面，便于回溯线上版本与本地变更。

## 2026-05-30

### Added

- 新增 admin 后台“规则卷宗 · 主链路记录台”页面，用于集中查看论文排版 Step3→Step6 的规则记录、证据、写回状态与 parser 回归闭环。
- 将 admin 后台升级为 Postgres 风格数据库操作台，覆盖 `audit_records`、`document_profiles`、`documents`、`findings`、`jobs`、`rule_snapshots`、`school_profiles`、`school_rule_sets`、`school_rules`、`share_reports` 表卡片、SQL 查询栏、表切换和结果预览。
- 将 admin 后台重构为生产可落地的 5 大功能域控制台：F1 文档管理、F2 规则配置、F3 任务执行、F4 交付分享、F5 审计治理，并按真实接口能力展示 CRUD 可用性、只读/不可变约束和待接入原因。
- 新增 `/api/v1/admin/overview`、`/api/v1/admin/domains/:domainId/records`、`/api/v1/admin/audit-records`，后台页改为真实 API 数据源，不再依赖前端静态 Demo 数据。
- 将本地 Vite `/api` 默认代理调整到 `http://localhost:4001`，避免后台页命中新旧 API 端口不一致导致的假断链。
- 新增后台页面 UI 回归测试，覆盖独立入口、主链路阶段、学科规则结构化标记和 detector → formatter → parser 回归文案。
- 新增 Python `Markdown==3.9` 依赖，覆盖 `services/docx-parser` 与 `services/formatter` 的 requirements。
- 新增 [python-markdown-install.md](./python-markdown-install.md)，记录 `python3 -m pip install markdown` 安装、验证与后续维护要求。

### Verified

- 已执行 `npm run build`、`npm test`、`npx playwright test tests/admin-rule-ledger.spec.ts`。
- 已执行 `services/api-gateway` 的 `admin-routes.test.ts`，覆盖 admin overview、domain records、unknown domain 404、audit read-only records。
- 已在本机 `http://127.0.0.1:4001/api/v1/admin/overview`、`/domains/tasks/records`、`/audit-records` 验证真实数据库返回。
- 已重启本地 `5173` 前端，并验证 `http://127.0.0.1:5173/api/v1/admin/overview` 可正确透传到 4001 API。
- 已执行本次改动文件的 eslint 检查：`npx eslint src/App.tsx src/screens/AdminRuleLedger.tsx tests/admin-rule-ledger.spec.ts`。
- 已执行 `python3 -m pip install markdown`，本机安装版本为 `3.9`。
- 已确认 PyPI 当前可用版本包含 `3.9`。
