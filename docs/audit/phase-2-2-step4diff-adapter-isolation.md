# Phase 2.2 Step4Diff Adapter Isolation

## Scope

This pass removes the remaining Step4Diff compatibility fields from the finding-centric path:

- `Finding` no longer exposes `uiId` or `id`.
- `ReviewItem` is now the canonical UI model and requires `findingId`.
- Fallback rule-derived items are isolated as `LegacyReviewItem`.
- Paper anchors now use `findingId` instead of `reviewId`.
- Current and legacy Step4 diff panels use `findingId` for refs, test ids, and focus keys.

## Result

| Area | Result |
|---|---|
| Store type | `Finding` extends `FindingContract` plus view-only placement fields, without `uiId/id`. |
| Step4Diff adapter | Raw fallback review items are canonicalized before paper pages and findings are built. |
| Paper anchors | `PaperReviewAnchor.findingId` replaces `reviewId`. |
| Current review workbench | Right-side card test ids use `finding.finding_id`. |
| Legacy Step4 diff files | Old review panel/paper stream now key focus references through `findingId`. |

## Verification

- `npm run typecheck`
- `npm test`
- `npm run build`
- Targeted grep for `uiId`, `reviewId`, `setActiveRuleId(item.id)`, and `finding.id` returned no active matches in the Step4Diff focus path.

## Deferred

- Renaming `ReviewItem.id` itself is deferred because it remains a harmless alias equal to `findingId` and several legacy view helpers still use `id` for React keys. The invariant is now explicit: in canonical `ReviewItem`, `id === findingId === finding_id`.
- Full deletion of unused legacy components is deferred until the next cleanup pass, after confirming behavior tests no longer depend on old test ids.
