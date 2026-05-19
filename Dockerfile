# Paper Formatter API — Dockerfile for Railway deployment.
# Builds and runs the Express API gateway.
FROM node:22-alpine AS build

WORKDIR /app
COPY services/api-gateway/package*.json services/api-gateway/tsconfig*.json ./services/api-gateway/
COPY packages/ ./packages/
RUN npm ci --prefix services/api-gateway

COPY services/api-gateway/src/ ./services/api-gateway/src/
RUN npm run build --prefix services/api-gateway

# ── Runtime image ──
FROM node:22-alpine
RUN apk add --no-cache python3 py3-pip && \
    pip3 install --break-system-packages python-docx==1.1.2 olefile==0.47

WORKDIR /app
COPY services/api-gateway/package*.json ./services/api-gateway/
RUN npm ci --prefix services/api-gateway --omit=dev && rm -rf ~/.npm

COPY --from=build /app/services/api-gateway/dist/services/api-gateway/src/ ./services/api-gateway/dist/
COPY --from=build /app/services/api-gateway/src/parser/parse.py ./services/api-gateway/parser/parse.py
COPY --from=build /app/services/api-gateway/src/parser/detect_school.py ./services/api-gateway/parser/detect_school.py
COPY --from=build /app/services/api-gateway/src/fixtures/canonical-school-registry.json ./services/api-gateway/fixtures/canonical-school-registry.json
COPY --from=build /app/services/api-gateway/src/fixtures/canonical-school-registry.json ./services/api-gateway/dist/fixtures/canonical-school-registry.json

ENV PORT=4000
ENV DOCX_PARSER_SCRIPT=/app/services/api-gateway/parser/parse.py
ENV DETECT_SCHOOL_SCRIPT=/app/services/api-gateway/parser/detect_school.py

EXPOSE 4000
CMD ["node", "services/api-gateway/dist/index.js"]
