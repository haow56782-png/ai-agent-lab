# PR #1 DOCX Object Probe Summary

## Samples
- cafa-probe-figure-caption.docx.docx: paragraphs=145, tables=2, drawings=2, captions=2
- cafa-probe-watermark-layer.docx.docx: paragraphs=242, tables=3, drawings=7, captions=4
- 2. 北京师范大学学位论文word版参考模板（一）.docx: paragraphs=537, tables=10, drawings=18, captions=17

## Key Findings
- w:tblHeader actual rate: 0/15 tables.
- w:tblLook distribution: none:2, w:firstColumn=1:13, w:firstRow=1:13, w:lastColumn=0:13, w:lastRow=0:13, w:noHBand=0:13, w:noVBand=1:13, w:val=04A0:13.
- caption style distribution: 2:2, af:15, afa:2, Caption:2, TableofFigures:2.
- continuation caption candidates: 0.
- w:drawing wrapMode distribution: inline:17, wrapNone:10.

## PR #2 IR Schema Correction Proposal
- TableObject should include startParagraphIndex, endParagraphIndex, rowCount, columnCount, hasTblHeaderInFirstRow, tblLookAttributes, firstRowText, and headerRowTextHash because these fields are present in the probe outputs and are required by continuation voting.
- FigureObject should include anchorParagraphIndex, isInline, wrapMode, and relationshipId because the probe outputs expose drawing placement and wrapping independently from paragraph text.
- CaptionNode should include paragraphIndex, text, styleName, matchedPattern, and numberToken because caption detection evidence comes from paragraph text plus paragraph style.
- Adjacent table evidence should include paragraphsBetween and captionsBetween because continuation voting needs the gap between neighboring table objects.

## Q4/Q5/Q6 Recommendations
- Q4 continuation threshold: keep default score >=3 as confirmed edge, score=2 as warning, score<=1 as no edge. Evidence: 0/15 tables have w:tblHeader, so structural signals are not guaranteed on every table.
- Q5 continues edge direction: keep continuation table -> main table. Evidence: adjacentTablePairs are emitted as prev/curr pairs, so a current table can point backward to the earlier table without mutating the main table node.
- Q6 invariant violation handling: inject warnings into ObjectGraph rather than throwing. Evidence: real samples include varying style/wrap/table metadata, and PR #1 is a read-only probe intended to preserve downstream fallback.
