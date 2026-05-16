# PR #2 IR Schema Correction Proposal

## Evidence Inputs
- Samples: 3
- Tables: 15
- Drawings: 27
- Caption candidates: 23

## Proposed L2 Fields
- TableObject: objectId, startParagraphIndex, endParagraphIndex, rowCount, columnCount, hasTblHeaderInFirstRow, tblLookAttributes, firstRowText, headerRowTextHash.
- FigureObject: objectId, anchorParagraphIndex, isInline, wrapMode, relationshipId.
- CaptionNode: nodeId, paragraphIndex, text, styleName, matchedPattern, numberToken.
- TableAdjacencyEvidence: prevTableId, currTableId, paragraphsBetween, captionsBetween.

## Deferred Until PR #2
- Do not define final ObjectGraph edge schema in PR #1.
- Do not lock continuation voting thresholds until the owner approves Q4.
- Do not replace existing flat parser outputs.
