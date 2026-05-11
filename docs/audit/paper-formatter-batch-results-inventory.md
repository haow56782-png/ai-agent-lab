# Paper Formatter Batch Results Inventory

## 1. Scope

This inventory covers root-level paper formatter batch artifacts:

- `paper-formatter/batch-results/`
- `paper-formatter/test-batch.sh`
- `paper-formatter/test-client.html`

## 2. Classification

| Path | Type | Finding | Decision |
|---|---|---|---|
| `paper-formatter/batch-results/` | Generated batch output | 4 timestamped runs, 79 files total: 51 JSON files, 24 log files, 4 summary markdown files. | ignore and remove from worktree |
| `paper-formatter/test-batch.sh` | Manual batch smoke-test utility | Useful historical script for local batch DOCX upload/analyze/format checks, but not CI-owned. | archive |
| `paper-formatter/test-client.html` | Manual standalone HTML client | Superseded by the React client and Playwright behavior/visual specs. | archive |

## 3. Batch Summary Snapshot

| Run | Summary |
|---|---|
| `20260509_102048` | Empty summary table, likely an aborted or dry run. |
| `20260509_102134` | 2/2 files passed upload, analyze, and format. |
| `20260509_102207` | 19/19 files passed upload, analyze, and format. |
| `20260509_102251` | 2/2 files passed upload, analyze, and format. |

## 4. Actions Taken

- Added `batch-results/` to `paper-formatter/.gitignore`.
- Removed generated `paper-formatter/batch-results/` from the working tree.
- Moved `test-batch.sh` to `docs/archive-candidates/paper-formatter-batch-test/test-batch.sh`.
- Moved `test-client.html` to `docs/archive-candidates/paper-formatter-batch-test/test-client.html`.

## 5. Follow-Up

If batch DOCX smoke testing is needed again, turn the archived shell script into a supported command under `paper-formatter/scripts/` and update it to the current API contracts before wiring it into CI.
