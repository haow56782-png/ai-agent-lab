import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";

export const CAPTION_NUMBERING_CONTINUITY_RULE_ID = "CAPTION_NUMBERING_CONTINUITY";
export const CAPTION_NUMBERING_CONTINUITY_LABEL = "图表编号连续性检查";

interface CaptionIndexEntry {
  index: number;
  text: string;
  type: "figure_caption" | "table_caption";
  /** Parsed numbering components, e.g. { chapter: 2, sequence: 1 } from "图 2-1" */
  chapter: number | null;
  sequence: number;
  numberingStyle: "chapter_seq" | "global_seq";
}

/**
 * Parse a Chinese caption label into numbering components.
 *
 * Supports these numbering styles:
 *   "图 1-1"  → chapter=1, seq=1
 *   "图 1.1"  → chapter=1, seq=1 (normalised)
 *   "图1-1"   → chapter=1, seq=1 (without space)
 *   "图 5"    → chapter=null, seq=5 (global numbering)
 *   "图3"     → chapter=null, seq=3
 *   "Figure 2-3" → chapter=2, seq=3
 *   "Table 1"    → chapter=null, seq=1
 *   "表 2-4"     → chapter=2, seq=4
 */
function parseCaptionNumber(text: string): {
  chapter: number | null;
  sequence: number;
  numberingStyle: "chapter_seq" | "global_seq";
} | null {
  const cleaned = text.replace(/[\s\u00A0]+/g, " ").trim();

  // Match Chinese: 图 X-Y, 表 X-Y, 图 X.Y, 表 X.Y
  const chapterSeqPattern = /[图圖表]\s*(\d+)[.\-–—](\d+)/;
  const chapterMatch = cleaned.match(chapterSeqPattern);
  if (chapterMatch) {
    return {
      chapter: Number(chapterMatch[1]),
      sequence: Number(chapterMatch[2]),
      numberingStyle: "chapter_seq",
    };
  }

  // Match English: Figure X-Y, Table X-Y, Fig. X-Y
  const enChapterSeq = /(?:Figure|Fig\.?|Table)\s*(\d+)[.\-–—](\d+)/i;
  const enMatch = cleaned.match(enChapterSeq);
  if (enMatch) {
    return {
      chapter: Number(enMatch[1]),
      sequence: Number(enMatch[2]),
      numberingStyle: "chapter_seq",
    };
  }

  // Match global: 图 X, 表 X, Figure X, Table X
  const globalSeqPattern = /[图圖表]\s*(\d+)/;
  const globalMatch = cleaned.match(globalSeqPattern);
  if (globalMatch) {
    return {
      chapter: null,
      sequence: Number(globalMatch[1]),
      numberingStyle: "global_seq",
    };
  }

  const enGlobalSeq = /(?:Figure|Fig\.?|Table)\s*(\d+)/i;
  const enGlobalMatch = cleaned.match(enGlobalSeq);
  if (enGlobalMatch) {
    return {
      chapter: null,
      sequence: Number(enGlobalMatch[1]),
      numberingStyle: "global_seq",
    };
  }

  return null;
}

function buildCaptionIndex(
  structureItems: any[],
): { figures: CaptionIndexEntry[]; tables: CaptionIndexEntry[] } {
  const figures: CaptionIndexEntry[] = [];
  const tables: CaptionIndexEntry[] = [];

  for (const item of structureItems || []) {
    const type = item?.type as string;
    const text = String(item?.text || "").trim();
    if (!text) continue;

    if (type === "figure_caption") {
      const parsed = parseCaptionNumber(text);
      if (parsed) {
        figures.push({ index: item.index ?? 0, text, type: "figure_caption", ...parsed });
      }
    } else if (type === "table_caption") {
      const parsed = parseCaptionNumber(text);
      if (parsed) {
        tables.push({ index: item.index ?? 0, text, type: "table_caption", ...parsed });
      }
    }
  }

  return { figures, tables };
}

/**
 * Check a sequence of captions for gaps or duplicates.
 *
 * For chapter_seq style: groups by chapter, then checks sequence within each chapter.
 * For global_seq style: checks monotonic increase without gaps or duplicates.
 */
function checkContinuity(
  entries: CaptionIndexEntry[],
  captionKind: "figure" | "table",
): RuleDetection[] {
  if (entries.length < 2) return [];

  const detections: RuleDetection[] = [];
  const label = captionKind === "figure" ? "图" : "表";

  // Group by chapter if using chapter_seq numbering
  const byChapter = new Map<number | "global", CaptionIndexEntry[]>();

  for (const entry of entries) {
    const key = entry.numberingStyle === "chapter_seq" && entry.chapter !== null
      ? entry.chapter
      : "global";
    if (!byChapter.has(key)) byChapter.set(key, []);
    byChapter.get(key)!.push(entry);
  }

  for (const [group, groupEntries] of byChapter) {
    if (groupEntries.length < 2) continue;

    // Check for duplicates
    const seen = new Map<number, CaptionIndexEntry>();
    for (const entry of groupEntries) {
      if (seen.has(entry.sequence)) {
        const prev = seen.get(entry.sequence)!;
        detections.push(createNumberingDetection({
          captionKind,
          label,
          issue: "duplicate",
          entry,
          prevEntry: prev,
          groupKey: group,
        }));
      }
      seen.set(entry.sequence, entry);
    }

    // Check for gaps
    const sorted = [...groupEntries].sort((a, b) => a.sequence - b.sequence);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      // Skip if same number (already reported as duplicate)
      if (prev.sequence === curr.sequence) continue;

      if (curr.sequence !== prev.sequence + 1) {
        detections.push(createNumberingDetection({
          captionKind,
          label,
          issue: "gap",
          entry: curr,
          prevEntry: prev,
          groupKey: group,
        }));
      }
    }
  }

  return detections;
}

function createNumberingDetection(input: {
  captionKind: "figure" | "table";
  label: string;
  issue: "gap" | "duplicate";
  entry: CaptionIndexEntry;
  prevEntry: CaptionIndexEntry;
  groupKey: number | "global";
}): RuleDetection {
  const groupLabel = input.groupKey === "global"
    ? "全文"
    : `第${input.groupKey}章`;

  let explanation: string;
  if (input.issue === "gap") {
    explanation = `${groupLabel}中${input.label}题编号不连续：从 "${input.prevEntry.text.slice(0, 40)}" (编号 ${input.prevEntry.sequence}) 跳到 "${input.entry.text.slice(0, 40)}" (编号 ${input.entry.sequence})，中间缺少 ${input.label} ${input.prevEntry.sequence + 1}。请检查是否有删除或遗漏。`;
  } else {
    explanation = `${groupLabel}中${input.label}题编号重复："${input.prevEntry.text.slice(0, 40)}" 和 "${input.entry.text.slice(0, 40)}" 使用了相同的编号 ${input.entry.sequence}。每个${input.label}题应有唯一编号。`;
  }

  return {
    ruleId: CAPTION_NUMBERING_CONTINUITY_RULE_ID,
    label: `${input.captionKind === "figure" ? "图" : "表"}题编号${input.issue === "gap" ? "跳号" : "重复"}`,
    group: "图表 & 题注",
    severity: "P0",
    confidence: 0.95,
    page: Math.max(1, Math.floor(input.entry.index / 8) + 1),
    snippet: input.entry.text.slice(0, 180),
    evidence: {
      paragraphIndex: input.entry.index,
      contextBefore: input.prevEntry.text.slice(0, 80),
      contextAfter: input.entry.text.slice(0, 80),
    },
    suggestion: {
      type: "manual_review",
      before: `${input.prevEntry.text.slice(0, 40)} → ${input.entry.text.slice(0, 40)}`,
      after: input.issue === "gap"
        ? `修正编号连续性：${input.prevEntry.sequence} → ${input.prevEntry.sequence + 1} → ...`
        : `修正编号重复：为 "${input.entry.text.slice(0, 20)}" 分配唯一编号`,
      explanation,
    },
  };
}

/**
 * Detects caption numbering continuity issues (gaps and duplicates)
 * for both figure captions (图题) and table captions (表题).
 *
 * Scans the structure items for figure_caption and table_caption entries,
 * parses their numbering, and checks for gaps or duplicates within each
 * numbering group (per-chapter or global).
 */
export function detectCaptionNumberingContinuity(
  ctx: ParsedDocumentContext,
): RuleDetection[] {
  const structureItems = ctx.structureItems || [];
  if (structureItems.length === 0) return [];

  const { figures, tables } = buildCaptionIndex(structureItems);

  return [
    ...checkContinuity(figures, "figure"),
    ...checkContinuity(tables, "table"),
  ];
}

export const captionNumberingContinuityDetector: FormatRuleDetector = {
  ruleId: CAPTION_NUMBERING_CONTINUITY_RULE_ID,
  label: CAPTION_NUMBERING_CONTINUITY_LABEL,
  group: "图表 & 题注",
  severity: "P0",
  detect: detectCaptionNumberingContinuity,
};
