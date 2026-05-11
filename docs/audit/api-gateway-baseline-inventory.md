# API Gateway Baseline Inventory

Source scope: `paper-formatter/services/api-gateway`

This inventory is read-only. It does not modify API code, client UI, formatter code, `.claude` skills, deploy files, git index, or commits.

## 1. Baseline Summary

The API Gateway baseline is an Express + TypeScript service with:

- HTTP entrypoint and middleware: `src/index.ts`, `src/middleware/*`
- Runtime config and infrastructure adapters: `src/config.ts`, `src/db.ts`, `src/redis.ts`, `src/storage.ts`
- DTO parsers: `src/dto/*`
- Domain repositories: `src/repositories/*`
- HTTP route edges: `src/routes/*`
- Job service split: `src/services/job-orchestrator.ts`, `src/services/job-queries.ts`
- Parser bridge scripts: `src/parser/*.py`
- Database schema bootstrap: `src/schemas/init.sql`
- Vitest coverage for routes, DTOs, parser bridge, and job flows.

Generated/local directories detected under the API Gateway folder:

- `node_modules/` — local dependency install, should not be committed.
- `dist/` — build output, should not be committed.
- `.DS_Store` and `src/.DS_Store` — macOS local metadata, should not be committed.

## 2. Recommended Commit Batch

These files look like the coherent API Gateway backend baseline and are reasonable commit candidates after final owner review.

| Status | Path | Recommendation | Reason |
|---|---|---|---|
| ?? | `paper-formatter/services/api-gateway/.env.example` | commit | Non-secret environment template for local backend startup. |
| ?? | `paper-formatter/services/api-gateway/AGENTS.md` | commit | Service-local context file; currently contains only scoped memory context. |
| ?? | `paper-formatter/services/api-gateway/Dockerfile` | commit | Backend container baseline for API + Python parser runtime. |
| ?? | `paper-formatter/services/api-gateway/package.json` | commit | Backend package, scripts, runtime deps, and test/build commands. |
| ?? | `paper-formatter/services/api-gateway/package-lock.json` | commit | Lockfile should travel with backend `package.json`. |
| ?? | `paper-formatter/services/api-gateway/tsconfig.json` | commit | Backend TypeScript compiler baseline. |
| ?? | `paper-formatter/services/api-gateway/src/config.ts` | commit | Runtime model/provider/permission config surface. |
| ?? | `paper-formatter/services/api-gateway/src/index.ts` | commit | Express app entrypoint, route registration, health endpoints, startup/shutdown. |
| ?? | `paper-formatter/services/api-gateway/src/middleware/error-handler.ts` | commit | Shared API error contract. |
| ?? | `paper-formatter/services/api-gateway/src/middleware/request-logger.ts` | commit | Request logging middleware. |
| ?? | `paper-formatter/services/api-gateway/src/redis.ts` | commit | Optional Redis cache adapter. |
| ?? | `paper-formatter/services/api-gateway/src/storage.ts` | commit | Storage adapter used by documents/jobs/download flows. |
| ?? | `paper-formatter/services/api-gateway/src/schemas/init.sql` | commit | SQL schema baseline. |
| ?? | `paper-formatter/services/api-gateway/src/dto/document-requests.ts` | commit | Profile/share document command parser boundary. |
| ?? | `paper-formatter/services/api-gateway/src/dto/finding-document-requests.ts` | commit | Finding query/sync/P1 exemption request parser boundary. |
| ?? | `paper-formatter/services/api-gateway/src/dto/job-document-requests.ts` | commit | Job command parser boundary. |
| ?? | `paper-formatter/services/api-gateway/src/dto/request-fields.ts` | commit | Shared DTO field helpers. |
| ?? | `paper-formatter/services/api-gateway/src/repositories/documents.ts` | commit | Document persistence boundary with canonical document identity. |
| ?? | `paper-formatter/services/api-gateway/src/repositories/findings.ts` | commit | Finding persistence and audit repository. |
| ?? | `paper-formatter/services/api-gateway/src/repositories/jobs.ts` | commit | Job persistence repository. |
| ?? | `paper-formatter/services/api-gateway/src/repositories/share.ts` | commit | Share report repository. |
| ?? | `paper-formatter/services/api-gateway/src/routes/analytics.ts` | commit | Analytics HTTP edge. |
| ?? | `paper-formatter/services/api-gateway/src/routes/documents.ts` | commit | Upload/document HTTP edge. |
| ?? | `paper-formatter/services/api-gateway/src/routes/feedback.ts` | commit | Feedback HTTP edge. |
| ?? | `paper-formatter/services/api-gateway/src/routes/findings.ts` | commit | Finding HTTP edge. |
| ?? | `paper-formatter/services/api-gateway/src/routes/jobs.ts` | commit | Job HTTP edge delegating to orchestrator/query services. |
| ?? | `paper-formatter/services/api-gateway/src/routes/share.ts` | commit | Share HTTP/page routes. |
| ?? | `paper-formatter/services/api-gateway/src/services/job-orchestrator.ts` | commit | Job creation and async processing service split from legacy monolith. |
| ?? | `paper-formatter/services/api-gateway/tests/documents-routes.test.ts` | commit | Documents route regression coverage. |
| ?? | `paper-formatter/services/api-gateway/tests/finding-document-requests-dto.test.ts` | commit | Finding DTO parser coverage. |
| ?? | `paper-formatter/services/api-gateway/tests/findings-routes.test.ts` | commit | Findings route regression coverage. |
| ?? | `paper-formatter/services/api-gateway/tests/job-document-requests-dto.test.ts` | commit | Job DTO parser coverage. |
| ?? | `paper-formatter/services/api-gateway/tests/jobs-routes.test.ts` | commit | Jobs route request-boundary coverage. |
| ?? | `paper-formatter/services/api-gateway/tests/parser.test.ts` | commit | Python parser integration and frontend contract coverage. |
| ?? | `paper-formatter/services/api-gateway/tests/profile-share-document-requests-dto.test.ts` | commit | Profile/share DTO parser coverage. |

## 3. Inspect Before Commit

These files are backend-related, but should be reviewed before being included in the same baseline commit.

| Status | Path | Recommendation | Reason |
|---|---|---|---|
| M | `paper-formatter/services/api-gateway/src/db.ts` | inspect | Adds UUID extension, `canonical_document_id`, findings/audit tables, indexes, and migration updates. High-impact schema change; validate against existing databases before commit. |
| M | `paper-formatter/services/api-gateway/src/routes/profiles.ts` | inspect | Moves profile detect/auto-create request parsing into DTOs. Good direction, but touches existing route behavior and cache keys. |
| D | `paper-formatter/services/api-gateway/src/services/jobs.ts` | inspect | Deletes legacy job monolith. Commit only after confirming all imports now use `job-orchestrator.ts` and `job-queries.ts`. |
| ?? | `paper-formatter/services/api-gateway/src/parser/parse.py` | inspect | Parser bridge affects real DOCX behavior. Include only if parser output has been validated. |
| ?? | `paper-formatter/services/api-gateway/src/repositories/share.ts` | inspect | Commit candidate, but share flow is adjacent to core backend baseline and may be separated if scope needs tightening. |
| ?? | `paper-formatter/services/api-gateway/src/routes/share.ts` | inspect | Commit candidate, but share page rendering is adjacent to core API baseline and may be separated if scope needs tightening. |
| ?? | `paper-formatter/services/api-gateway/tests/jobs-download-guard.test.ts` | inspect | Download guard work was explicitly paused. Keep out of baseline unless user re-authorizes download guard scope. |

## 4. Defer / Keep Out Of This Baseline

These should not be part of the API Gateway baseline commit without a separate decision.

| Status | Path | Recommendation | Reason |
|---|---|---|---|
| local | `paper-formatter/services/api-gateway/node_modules/` | ignore | Installed dependencies, generated locally by package manager. |
| local | `paper-formatter/services/api-gateway/dist/` | ignore | Build output. |
| local | `paper-formatter/services/api-gateway/.DS_Store` | ignore | macOS metadata. |
| local | `paper-formatter/services/api-gateway/src/.DS_Store` | ignore | macOS metadata. |

## 5. Suggested Commit Strategy

Recommended split if preparing clean commits:

1. API Gateway scaffold and infrastructure:
   - `.env.example`, `Dockerfile`, `package.json`, `package-lock.json`, `tsconfig.json`
   - `src/index.ts`, `src/config.ts`, middleware, Redis, storage

2. Backend domain/data baseline:
   - `src/db.ts` after schema review
   - `src/schemas/init.sql`
   - repositories and DTO parsers

3. Job service split:
   - deletion of `src/services/jobs.ts`
   - `src/services/job-orchestrator.ts`
   - `src/services/job-queries.ts` if included in the active diff set
   - `src/routes/jobs.ts`
   - related job tests

4. API routes and integration coverage:
   - documents/profiles/findings/analytics/feedback/share routes
   - route and DTO tests

5. Hold back unless re-authorized:
   - `tests/jobs-download-guard.test.ts`
   - any backend download guard service changes

## 6. Verification Notes

No tests or builds were run for this inventory because the task asked for read-only audit and no code changes. The previous observed API commands in this workspace were:

- `npm run build` under `paper-formatter/services/api-gateway`
- `npm test -- --reporter=dot` under `paper-formatter/services/api-gateway`

Before committing the API Gateway baseline, rerun those commands in a clean scope after deciding whether paused download guard files are included or deferred.
