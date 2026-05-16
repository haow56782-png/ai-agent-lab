import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
import { resolveBodyStyleThresholds } from "../profile-thresholds.js";

export const BODY_STYLE_RULE_ID = "BODY_STYLE_REVIEW";
export const BODY_STYLE_LABEL = "正文字体槽 宋体/Times";
export const HEADING_SPACING_RULE_ID = "HEADING_SPACING_REVIEW";
export const HEADING_SPACING_LABEL = "一级标题 段前24 段后18";

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function createDetection(input: {
  ruleId: string;
  label: string;
  snippet: string;
  explanation: string;
  paragraphIndex?: number;
}): RuleDetection {
  const paragraphIndex = input.paragraphIndex || 0;
  return {
    ruleId: input.ruleId,
    label: input.label,
    group: "样式",
    severity: "P2",
    confidence: 0.77,
    page: Math.max(1, Math.floor(paragraphIndex / 8) + 1),
    snippet: input.snippet,
    evidence: {
      paragraphIndex,
    },
    suggestion: {
      type: "restructure",
      before: input.snippet,
      after: `按模板统一${input.label}`,
      explanation: input.explanation,
    },
  };
}

export function detectBodyStyle(ctx: ParsedDocumentContext): RuleDetection[] {
  const thresholds = resolveBodyStyleThresholds(ctx.profile);
  const paragraphs = (ctx.paragraphs || []).filter((paragraph: any) => cleanText(paragraph?.text).length > 0 && !paragraph?.is_heading);
  if (paragraphs.length === 0) return [];

  const fonts = new Set<string>();
  const sizes = new Set<number>();
  const lineSpacings = new Set<number>();
  const firstLineIndents = new Set<number>();

  for (const paragraph of paragraphs.slice(0, 40)) {
    for (const run of paragraph.runs || []) {
      if (run?.name) fonts.add(String(run.name));
      if (run?.size_pt) sizes.add(Math.round(Number(run.size_pt)));
    }
    if (paragraph?.spacing?.line_spacing) lineSpacings.add(Number(paragraph.spacing.line_spacing));
    if (paragraph?.indent?.first_line_cm) firstLineIndents.add(Number(paragraph.indent.first_line_cm));
  }

  const detections: RuleDetection[] = [];
  const hasDisallowedFont = [...fonts].some((font) => !thresholds.allowedFonts.some((allowed) => String(font).toLowerCase().includes(String(allowed).toLowerCase())));
  const hasLineSpacingDeviation = [...lineSpacings].some((value) => Math.abs(value - thresholds.lineSpacing) > 0.2);
  if (fonts.size > 1 || sizes.size > 1 || lineSpacings.size > 1 || hasDisallowedFont || hasLineSpacingDeviation) {
    detections.push(createDetection({
      ruleId: BODY_STYLE_RULE_ID,
      label: BODY_STYLE_LABEL,
      snippet: cleanText(paragraphs[0]?.text).slice(0, 180) || "正文样式需要人工复核。",
      explanation: `检测到正文样式不够统一：字体 ${[...fonts].slice(0, 3).join("、") || "未知"}，字号 ${[...sizes].slice(0, 3).join("、") || "未知"}pt，行距 ${[...lineSpacings].slice(0, 3).join("、") || "未知"}。规则包允许字体：${thresholds.allowedFonts.join(" / ")}，目标行距：${thresholds.lineSpacing}。`,
      paragraphIndex: paragraphs[0]?.index || 0,
    }));
  } else if (firstLineIndents.size > 1 || [...firstLineIndents].some((value) => Math.abs(value - thresholds.firstLineIndentCm) > 0.2)) {
    detections.push(createDetection({
      ruleId: BODY_STYLE_RULE_ID,
      label: BODY_STYLE_LABEL,
      snippet: cleanText(paragraphs[0]?.text).slice(0, 180) || "正文样式需要人工复核。",
      explanation: `检测到首行缩进不统一，或与规则包目标值 ${thresholds.firstLineIndentCm} cm 差异较大，建议按模板统一正文段落缩进。`,
      paragraphIndex: paragraphs[0]?.index || 0,
    }));
  }

  return detections;
}

export function detectHeadingSpacing(ctx: ParsedDocumentContext): RuleDetection[] {
  const thresholds = resolveBodyStyleThresholds(ctx.profile);
  const levelOneParagraph = (ctx.paragraphs || []).find((paragraph: any) => paragraph?.is_heading && Number(paragraph?.heading_level || 0) === 1);
  if (!levelOneParagraph) return [];
  const before = Number(levelOneParagraph?.spacing?.before_pt || 0);
  const after = Number(levelOneParagraph?.spacing?.after_pt || 0);
  if (Math.abs(before - thresholds.headingBeforePt) <= 6 && Math.abs(after - thresholds.headingAfterPt) <= 6) return [];
  return [createDetection({
    ruleId: HEADING_SPACING_RULE_ID,
    label: HEADING_SPACING_LABEL,
    snippet: cleanText(levelOneParagraph.text).slice(0, 180) || "一级标题段前段后需要人工复核。",
    explanation: `检测到一级标题段前/段后为 ${before}/${after} pt，和规则包目标值 ${thresholds.headingBeforePt}/${thresholds.headingAfterPt} pt 差异较大。`,
    paragraphIndex: levelOneParagraph.index || 0,
  })];
}

export const bodyStyleDetector: FormatRuleDetector = {
  ruleId: BODY_STYLE_RULE_ID,
  label: BODY_STYLE_LABEL,
  group: "样式",
  severity: "P2",
  detect: detectBodyStyle,
};

export const headingSpacingDetector: FormatRuleDetector = {
  ruleId: HEADING_SPACING_RULE_ID,
  label: HEADING_SPACING_LABEL,
  group: "样式",
  severity: "P2",
  detect: detectHeadingSpacing,
};
