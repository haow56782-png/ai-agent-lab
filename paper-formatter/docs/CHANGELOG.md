# 更新日志

本文件记录项目内需要追踪的安装、依赖、部署和主链路交互更新。每次更新后都应追加一条记录，便于回溯线上版本与本地变更。

## 2026-05-30

### Added

- 新增 Python `Markdown==3.9` 依赖，覆盖 `services/docx-parser` 与 `services/formatter` 的 requirements。
- 新增 [python-markdown-install.md](./python-markdown-install.md)，记录 `python3 -m pip install markdown` 安装、验证与后续维护要求。

### Verified

- 已执行 `python3 -m pip install markdown`，本机安装版本为 `3.9`。
- 已确认 PyPI 当前可用版本包含 `3.9`。

