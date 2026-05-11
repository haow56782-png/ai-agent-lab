.PHONY: dev dev-api dev-db dev-down test up status

# Full stack
dev:
	docker-compose up -d

# One-click start: Docker backend + frontend client
up:
	docker compose up -d
	@echo "Waiting for services..."
	@sleep 3
	cd services/client && npx vite --host 0.0.0.0

dev-down:
	docker-compose down

# Local development (API only, no Docker)
dev-api:
	cd services/api-gateway && npm run dev

# Start infrastructure only (Postgres + Redis + MinIO)
dev-db:
	docker-compose up -d postgres redis minio

# Install all dependencies
install:
	cd services/api-gateway && npm install

# Run tests
test:
	cd services/api-gateway && npm test

# Build all
build:
	cd services/api-gateway && npm run build

# Client
# Check service status
status:
	docker compose ps
	@echo "---"
	@echo "API: $$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health || echo "down")"
	@echo "Client: $$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 || echo "down")"

dev-client:
	cd services/client && npm run dev

build-client:
	cd services/client && npm run build

typecheck-client:
	cd services/client && npx tsc --noEmit
