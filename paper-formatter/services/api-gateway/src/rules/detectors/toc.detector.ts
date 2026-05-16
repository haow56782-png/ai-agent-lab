import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";

export const TOC_REFRESH_RULE_ID = "TOC_REFRESH_REVIEW";
export const TOC_REFRESH_LABEL = "自动目录刷新";

export function detectTocRefreshReview(ctx: ParsedDocumentContext): RuleDetection[] {
  const headings = ctx.headings || [];
  const tocEntry = (ctx.structureItems || []).find((item: any) => item?.type === "toc");
  if (headings.length < 3 || tocEntry) return [];
  const firstHeading = headings[0];
  const paragraphIndex = Number(firstHeading?.index || 0);
  const snippet = String(firstHeading?.text || "目录内容需要人工复核").trim().slice(0, 180);

  return [{
    ruleId: TOC_REFRESH_RULE_ID,
    label: TOC_REFRESH_LABEL,
    group: "目录 & 域",
    severity: "P2",
    confidence: 0.72,
    page: Math.max(1, Math.floor(paragraphIndex / 8) + 1),
    snippet,
    evidence: {
      paragraphIndex,
      contextBefore: ctx.paragraphs[Math.max(0, paragraphIndex - 1)]?.text?.slice(0, 80),
      contextAfter: ctx.paragraphs[paragraphIndex + 1]?.text?.slice(0, 80),
    },
    suggestion: {
      type: "restructure",
      before: "目录域可能未更新",
      after: "刷新目录并校对页码",
      explanation: "文档包含多个章节标题，但未检测到明确目录区域，建议刷新目录域并校对页码。",
    },
  }];
}

export const tocRefreshDetector: FormatRuleDetector = {
  ruleId: TOC_REFRESH_RULE_ID,
  label: TOC_REFRESH_LABEL,
  group: "目录 & 域",
  severity: "P2",
  detect: detectTocRefreshReview,
};
