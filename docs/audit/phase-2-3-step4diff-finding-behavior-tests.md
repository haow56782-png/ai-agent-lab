# Phase 2.3 Step4Diff Finding Behavior Tests

## Scope

This pass adds behavior coverage for the Step4Diff finding-centric focus path.

The test boundary is:

- Review cards expose canonical `finding_id` in `data-testid`.
- Card clicks write `#finding=<finding_id>` and focus the matching card.
- Canvas anchors expose matching `data-finding-id` and drive focus through the same id.
- URL hash restore starts the workbench on the matching `finding_id`.

## Test File

- `paper-formatter/services/client/tests/step4-flow.spec.ts`

## Added Coverage

| Test | Purpose |
|---|---|
| `Step4Diff review cards expose canonical finding_id and write hash focus from card clicks` | Locks card id, focus class, progress, hash, and canvas anchor to the same `finding_id`. |
| `Step4Diff canvas anchors and review cards subscribe to the same finding_id focus` | Locks canvas anchor visibility/focus propagation to the same `finding_id`. |
| `Step4Diff restores focus from URL hash using canonical finding_id` | Locks hash-based restore to the same `finding_id` and derived page. |

## Verification

Passed:

- `npm run typecheck`
- `npm test`
- `npm run build`

Blocked in current sandbox:

- `npx playwright test tests/step4-flow.spec.ts --grep "finding_id|canvas anchors|restores focus" --reporter=line`
- Reason: Vite dev server failed to bind `127.0.0.1:5173` with `listen EPERM`.

## Follow-up

Run the targeted Playwright command in a non-sandbox terminal or CI runner where Chromium and localhost binding are available.
