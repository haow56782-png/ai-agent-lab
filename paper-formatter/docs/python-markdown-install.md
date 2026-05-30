# Python Markdown 安装说明

本文档记录项目内 Python `markdown` 依赖的安装方式和维护约定。

## 安装命令

本地快速安装：

```bash
python3 -m pip install markdown
```

按项目依赖文件安装：

```bash
python3 -m pip install -r services/docx-parser/requirements.txt
python3 -m pip install -r services/formatter/requirements.txt
```

当前固定版本：

```text
Markdown==3.9
```

## 验证

```bash
python3 -c "import markdown; print(markdown.__version__)"
```

预期输出：

```text
3.9
```

## 更新要求

每次调整 Python 依赖、安装方式、部署脚本或文档生成链路时，都必须同步更新 [CHANGELOG.md](./CHANGELOG.md)。

更新日志至少包含：

- 日期
- 变更类型：`Added`、`Changed`、`Fixed`、`Deploy`
- 影响范围
- 验证方式

