# Phase 2.1 Step4Diff Focus Migration

## Scope

This pass audits and migrates the Step4Diff focus entrypoint toward the finding-centric rule:

- `focusFindingId` is the only focus SSOT.
- UI panes write focus only through `reviewActions.setFocus(finding_id, source)`.
- Page is derived from the focused finding and is not stored as business state.
- Review item ids are canonicalized to standard `finding_id` before paper pages, canvas anchors, and cards are hydrated.

## Findings

| Area | Before | Phase 2.1 result |
|---|---|---|
| Step4Diff source | Real backend findings already expose `finding_id`; fallback rule warnings generated UI ids first. | Step4Diff now canonicalizes all `ReviewItem.id` values to `finding_id` before building pages and findings. |
| Canvas anchor bridge | Paper anchors used `reviewId = item.id`; fallback mode meant this could be a UI adapter id. | Because `item.id` is now canonical before `buildPaperPages`, anchors are keyed by `finding_id`. |
| Review cards | Business actions used `finding.finding_id`, but card test ids still used `finding.uiId`. | Card test ids now use `finding.finding_id`. |
| Store | `reviewStore` already uses `focusFindingId` and validates focus writes against `finding.finding_id`. | No store changes were needed. |

## Files Changed

- `paper-formatter/services/client/src/screens/Step4Diff.tsx`
- `paper-formatter/services/client/src/components/review-workbench/FindingPane.tsx`
- `paper-formatter/services/client/src/screens/step4-diff/types.ts`

## Deferred

- Full removal of `Finding.uiId` / `Finding.id` adapter aliases is deferred to a broader type cleanup because current UI types still expose compatibility fields.
- Old `screens/step4-diff/DiffReviewPanel.tsx` and `DiffPaperStream.tsx` still contain legacy review-item semantics, but they are not imported by current `Step4Diff.tsx`.
- Download guard and Step5/backend download behavior remain out of scope for this pass.
