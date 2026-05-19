# Paper Formatter API — Dockerfile for Railway deployment.
# Builds and runs the Express API gateway from repo root context.
FROM node:22-alpine AS build

WORKDIR /app
COPY paper-formatter/services/api-gateway/package*.json paper-formatter/services/api-gateway/tsconfig*.json ./paper-formatter/services/api-gateway/
COPY paper-formatter/packages/ ./paper-formatter/packages/
RUN npm ci --prefix paper-formatter/services/api-gateway

COPY paper-formatter/services/api-gateway/src/ ./paper-formatter/services/api-gateway/src/
RUN npm run build --prefix paper-formatter/services/api-gateway

# ── Runtime image ──
FROM node:22-alpine
RUN apk add --no-cache python3 py3-pip && \
    pip3 install --break-system-packages python-docx==1.1.2 olefile==0.47

WORKDIR /app
COPY paper-formatter/services/api-gateway/package*.json ./paper-formatter/services/api-gateway/
RUN npm ci --prefix paper-formatter/services/api-gateway --omit=dev && rm -rf ~/.npm

COPY --from=build /app/paper-formatter/services/api-gateway/dist/services/api-gateway/src/ ./paper-formatter/services/api-gateway/dist/
COPY --from=build /app/paper-formatter/services/api-gateway/src/parser/parse.py ./paper-formatter/services/api-gateway/parser/parse.py
COPY --from=build /app/paper-formatter/services/api-gateway/src/parser/detect_school.py ./paper-formatter/services/api-gateway/parser/detect_school.py
COPY --from=build /app/paper-formatter/services/api-gateway/src/fixtures/canonical-school-registry.json ./paper-formatter/services/api-gateway/fixtures/canonical-school-registry.json
COPY --from=build /app/paper-formatter/services/api-gateway/src/fixtures/canonical-school-registry.json ./paper-formatter/services/api-gateway/dist/fixtures/canonical-school-registry.json

ENV PORT=4000
ENV DOCX_PARSER_SCRIPT=/app/paper-formatter/services/api-gateway/parser/parse.py
ENV DETECT_SCHOOL_SCRIPT=/app/paper-formatter/services/api-gateway/parser/detect_school.py

EXPOSE 4000
CMD ["node", "paper-formatter/services/api-gateway/dist/services/api-gateway/src/index.js"]
