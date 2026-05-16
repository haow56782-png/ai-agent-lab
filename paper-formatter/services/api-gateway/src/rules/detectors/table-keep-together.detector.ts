import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";

export const TABLE_KEEP_TOGETHER_RULE_ID = "TABLE_KEEP_TOGETHER";
export const TABLE_KEEP_TOGETHER_LABEL = "表 keep-together";

function estimateTableRisk(table: any): boolean {
  const rows = Number(table?.rows || 0);
  const cols = Number(table?.cols || 0);
  const maxCellLength = Math.max(
    0,
    ...((table?.data || []).flatMap((row: any) => (row?.cells || []).map((cell: any) => String(cell || "").trim().length))),
  );
  return rows >= 8 || cols >= 6 || maxCellLength >= 48;
}

export function detectTableKeepTogether(ctx: ParsedDocumentContext): RuleDetection[] {
  const tables = ctx.tables || [];
  const riskyTable = tables.find((table: any) => estimateTableRisk(table));
  if (!riskyTable) return [];
  const snippet = ((riskyTable.data || [])[0]?.cells || []).filter(Boolean).join(" / ").slice(0, 180) || "表格跨页与题注位置需要人工复核。";
  const paragraphIndex = Number(riskyTable.index || 0);

  return [{
    ruleId: TABLE_KEEP_TOGETHER_RULE_ID,
    label: TABLE_KEEP_TOGETHER_LABEL,
    group: "图表 & 题注",
    severity: "P2",
    confidence: 0.74,
    page: Math.max(1, Math.floor(paragraphIndex / 2) + 1),
    snippet,
    evidence: {
      objectName: `table-${paragraphIndex + 1}`,
    },
    suggestion: {
      type: "manual_review",
      before: "表格可能跨页或题注分离",
      after: "保持题注与表格主体连续，并人工确认跨页位置",
      explanation: "该表格行列较多或单元格内容较长，可能出现 keep-together 风险，建议人工复核跨页与题注连续性。",
    },
  }];
}

export const tableKeepTogetherDetector: FormatRuleDetector = {
  ruleId: TABLE_KEEP_TOGETHER_RULE_ID,
  label: TABLE_KEEP_TOGETHER_LABEL,
  group: "图表 & 题注",
  severity: "P2",
  detect: detectTableKeepTogether,
};
