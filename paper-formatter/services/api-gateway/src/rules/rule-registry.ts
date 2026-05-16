import { captionPositionDetector } from "./detectors/caption-position.detector.js";
import { detectCaptionPositionV2, FIGURE_CAPTION_POSITION_V2_RULE_ID } from "./detectors/caption-position-v2.detector.js";
import { bodyStyleDetector, headingSpacingDetector } from "./detectors/body-style.detector.js";
import { footerPageNumberDetector } from "./detectors/footer-page-number.detector.js";
import { figureDirectoryDetector } from "./detectors/figure-directory.detector.js";
import { floatingObjectOverlapDetector } from "./detectors/floating-object-overlap.detector.js";
import { footnoteStyleDetector } from "./detectors/footnote-style.detector.js";
import { headingHierarchyDetector } from "./detectors/heading-hierarchy.detector.js";
import { pageSectionDetector } from "./detectors/page-section.detector.js";
import { pageMarginDetector } from "./detectors/page-layout.detector.js";
import { referenceMissingDoiDetector } from "./detectors/reference-doi.detector.js";
import { detectTableContinuation, TABLE_CONTINUATION_RULE_ID, TABLE_CONTINUATION_LABEL } from "./detectors/table-continuation.detector.js";
import { tableKeepTogetherDetector } from "./detectors/table-keep-together.detector.js";
import { tocRefreshDetector } from "./detectors/toc.detector.js";
import { subSupScriptDetector } from "./detectors/sub-sup-script.detector.js";
import { captionNumberingContinuityDetector } from "./detectors/caption-numbering-continuity.detector.js";
import type { ParsedDocumentContext, RuleDetection } from "./rule-types.js";

export const FORMAT_RULE_DETECTORS = [
  floatingObjectOverlapDetector,
  pageMarginDetector,
  bodyStyleDetector,
  headingSpacingDetector,
  footerPageNumberDetector,
  tableKeepTogetherDetector,
  {
    ruleId: FIGURE_CAPTION_POSITION_V2_RULE_ID,
    label: "图题/表题对象锚点校验",
    group: "图表 & 题注",
    severity: "P2",
    detect(ctx: ParsedDocumentContext) {
      if (ctx.objectGraph) {
        return detectCaptionPositionV2(ctx.objectGraph);
      }
      return captionPositionDetector.detect(ctx);
    },
  },
  {
    ruleId: TABLE_CONTINUATION_RULE_ID,
    label: TABLE_CONTINUATION_LABEL,
    group: "图表 & 题注",
    severity: "P2",
    detect(ctx: ParsedDocumentContext) {
      return ctx.objectGraph ? detectTableContinuation(ctx.objectGraph) : [];
    },
  },
  footnoteStyleDetector,
  referenceMissingDoiDetector,
  tocRefreshDetector,
  figureDirectoryDetector,
  headingHierarchyDetector,
  pageSectionDetector,
  subSupScriptDetector,
  captionNumberingContinuityDetector,
];

export function runFormatRuleDetectors(ctx: ParsedDocumentContext): RuleDetection[] {
  return FORMAT_RULE_DETECTORS.flatMap((detector) => detector.detect(ctx));
}
