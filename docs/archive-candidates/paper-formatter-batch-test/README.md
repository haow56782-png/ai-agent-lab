# Paper Formatter Batch Test Archive

This archive preserves early manual test utilities that used to live at the `paper-formatter` root.

## Files

| File | Former location | Status | Notes |
|---|---|---|---|
| `test-batch.sh` | `paper-formatter/test-batch.sh` | archived | Useful reference for manual batch DOCX smoke tests against local API/formatter services. Not wired into CI. |
| `test-client.html` | `paper-formatter/test-client.html` | archived | Early standalone HTML client for upload/analyze/format/download testing. Superseded by the React client and Playwright specs. |

## Handling Decision

- Keep these as archive candidates instead of runtime scripts.
- Do not run them as CI gates without updating endpoints, selectors, and expected API contracts.
- Prefer formal tests under `paper-formatter/services/client/tests/` for active client behavior coverage.
