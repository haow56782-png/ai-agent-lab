import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";

export const REFERENCE_MISSING_DOI_RULE_ID = "REFERENCE_MISSING_DOI";
export const REFERENCE_MISSING_DOI_LABEL = "缺 DOI";

const DOI_PATTERN = /\b(10\.\d{4,9}\/[-._;()/:A-Z0-9]+|doi\.org\/10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i;

export function detectReferenceMissingDoi(ctx: ParsedDocumentContext): RuleDetection[] {
  const referenceEntries = (ctx.structureItems || []).filter((item: any) => item?.type === "reference_entry");
  if (referenceEntries.length === 0) return [];
  const missing = referenceEntries.find((entry: any) => !DOI_PATTERN.test(String(entry?.text || "")));
  if (!missing) return [];
  const paragraphIndex = Number(missing.index || 0);
  const snippet = String(missing.text || "").trim().slice(0, 180);

  return [{
    ruleId: REFERENCE_MISSING_DOI_RULE_ID,
    label: REFERENCE_MISSING_DOI_LABEL,
    group: "参考文献",
    severity: "P2",
    confidence: 0.81,
    page: Math.max(1, Math.floor(paragraphIndex / 8) + 1),
    snippet,
    evidence: {
      paragraphIndex,
      contextBefore: ctx.paragraphs[Math.max(0, paragraphIndex - 1)]?.text?.slice(0, 80),
      contextAfter: ctx.paragraphs[paragraphIndex + 1]?.text?.slice(0, 80),
    },
    suggestion: {
      type: "manual_review",
      before: snippet,
      after: "补齐 DOI 或确认该文献无 DOI",
      explanation: "系统发现参考文献著录中缺少 DOI，建议补齐 DOI，无法确认时保留人工复核。",
    },
  }];
}

export const referenceMissingDoiDetector: FormatRuleDetector = {
  ruleId: REFERENCE_MISSING_DOI_RULE_ID,
  label: REFERENCE_MISSING_DOI_LABEL,
  group: "参考文献",
  severity: "P2",
  detect: detectReferenceMissingDoi,
};
