# ── Build stage ──
FROM node:22-alpine AS build

WORKDIR /app/services/api-gateway
COPY services/api-gateway/package*.json services/api-gateway/tsconfig*.json ./
RUN npm ci
COPY services/api-gateway/src/ ./src/
COPY packages/ ../../packages/
RUN npm run build

# ── Runtime image ──
FROM node:22-alpine

# Install Python + deps for DOCX parser subprocess
RUN apk add --no-cache python3 py3-pip && \
    pip3 install --break-system-packages python-docx==1.1.2 olefile==0.47

WORKDIR /app

# Install production node dependencies
COPY services/api-gateway/package*.json ./services/api-gateway/
RUN npm ci --prefix services/api-gateway --omit=dev && rm -rf ~/.npm

# Copy built JS from build stage (output is nested under dist/services/api-gateway/src/)
COPY --from=build /app/services/api-gateway/dist/services/api-gateway/src/ ./services/api-gateway/dist/

# Copy the Python parser scripts
COPY --from=build /app/services/api-gateway/src/parser/parse.py ./services/api-gateway/parser/parse.py
COPY --from=build /app/services/api-gateway/src/parser/detect_school.py ./services/api-gateway/parser/detect_school.py
COPY --from=build /app/services/api-gateway/src/fixtures/canonical-school-registry.json ./services/api-gateway/fixtures/canonical-school-registry.json
COPY --from=build /app/services/api-gateway/src/fixtures/canonical-school-registry.json ./services/api-gateway/dist/fixtures/canonical-school-registry.json

ENV PORT=4000
ENV DOCX_PARSER_SCRIPT=/app/services/api-gateway/parser/parse.py
ENV DETECT_SCHOOL_SCRIPT=/app/services/api-gateway/parser/detect_school.py

EXPOSE 4000
CMD ["node", "services/api-gateway/dist/index.js"]
