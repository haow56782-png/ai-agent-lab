import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";

export const PAGE_SECTION_RULE_ID = "PAGE_SECTION_REVIEW";
export const PAGE_SECTION_LABEL = "正文阿拉伯 1 起";

function hasSectionBreakIssue(ctx: ParsedDocumentContext): { paragraphIndex: number; snippet: string; reason: string } | null {
  const levelOneHeadings = (ctx.headings || []).filter((heading: any) => Number(heading?.level || 0) === 1);
  if ((ctx.sections || []).length === 0) {
    return {
      paragraphIndex: 0,
      snippet: "未检测到页面分节信息",
      reason: "文档没有解析出明确的分节信息，页码与正文起始位置需要人工复核。",
    };
  }
  if (levelOneHeadings.length < 2) return null;
  const problematicHeading = levelOneHeadings.slice(1).find((heading: any) => {
    const paragraph = ctx.paragraphs[Number(heading?.index || 0)];
    return !paragraph?.page_break_before;
  });
  if (!problematicHeading) return null;
  return {
    paragraphIndex: Number(problematicHeading.index || 0),
    snippet: String(problematicHeading.text || "章节起始位置需要人工复核").trim().slice(0, 180),
    reason: "检测到新的一级标题，但没有明显的分页/分节标记，正文页码与章节起始位置可能错位。",
  };
}

export function detectPageSectionReview(ctx: ParsedDocumentContext): RuleDetection[] {
  const issue = hasSectionBreakIssue(ctx);
  if (!issue) return [];
  return [{
    ruleId: PAGE_SECTION_RULE_ID,
    label: PAGE_SECTION_LABEL,
    group: "分节 & 页码",
    severity: "P2",
    confidence: 0.74,
    page: Math.max(1, Math.floor(issue.paragraphIndex / 8) + 1),
    snippet: issue.snippet,
    evidence: {
      paragraphIndex: issue.paragraphIndex,
      contextBefore: ctx.paragraphs[Math.max(0, issue.paragraphIndex - 1)]?.text?.slice(0, 80),
      contextAfter: ctx.paragraphs[issue.paragraphIndex + 1]?.text?.slice(0, 80),
    },
    suggestion: {
      type: "restructure",
      before: issue.snippet,
      after: "按章节起始位置重新检查分节与页码起算",
      explanation: issue.reason,
    },
  }];
}

export const pageSectionDetector: FormatRuleDetector = {
  ruleId: PAGE_SECTION_RULE_ID,
  label: PAGE_SECTION_LABEL,
  group: "分节 & 页码",
  severity: "P2",
  detect: detectPageSectionReview,
};
