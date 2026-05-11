# Production Deployment Notes

这套物料面向你当前的轻量机思路：

- Ubuntu 22.04
- Nginx 托管前端 `dist`
- Docker Compose 承载 `api-gateway + formatter + postgres + minio + redis`
- Certbot 负责 HTTPS

## 1. 前端发布

在仓库目录执行：

```bash
cd services/client
npm ci
npm run build
```

构建产物默认在：

```bash
services/client/dist
```

Nginx 模板已经按这个路径准备：

```bash
/opt/paper-formatter/services/client/dist
```

如果你的仓库不放在 `/opt/paper-formatter`，记得同步修改 Nginx `root`。

## 2. 后端与基础设施

1. 复制环境变量模板：

```bash
cp .env.production.example .env.production
```

2. 填好以下敏感值：

- `POSTGRES_PASSWORD`
- `MINIO_ROOT_PASSWORD`
- `SERVER_NAME`

3. 用生产 compose 启动：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## 3. Nginx

模板文件：

```bash
deploy/nginx/paper-formatter.conf
```

它负责三件事：

1. `/` 返回前端静态文件
2. `/api/` 反代到 `127.0.0.1:4000`
3. `/share/` 和 `/health` 也走 API Gateway

## 4. HTTPS

在 Nginx 配置能正常跑通后，再执行 Certbot，例如：

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 5. 开机自启

如果你希望整套 Docker Compose 在机器重启后自动恢复，可以用：

```bash
deploy/systemd/paper-formatter-compose.service
```

把里面的 `WorkingDirectory` 改成你的真实路径，再放到：

```bash
/etc/systemd/system/paper-formatter-compose.service
```

然后执行：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now paper-formatter-compose
```

## 6. 这台 2C4G 机器上的建议

- 前端不要再单独起 Vite 预览，直接交给 Nginx
- `api-gateway` 只绑定 `127.0.0.1:4000`
- MinIO 控制台只绑定 `127.0.0.1:9001`
- Postgres 和 Redis 不暴露公网端口
- 先单机跑，后续再考虑拆分对象存储或数据库

## 7. 上线前检查

- `docker compose ... ps` 所有服务 `healthy` 或 `running`
- `curl http://127.0.0.1:4000/health`
- 浏览器访问域名，前端可打开
- 上传 `.docx` 后，能走完解析与修复链路
- MinIO 与 Postgres 的卷目录已纳入备份
