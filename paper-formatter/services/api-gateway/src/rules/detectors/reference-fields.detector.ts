import type {
  FormatRuleDetector,
  ParsedDocumentContext,
  RuleDetection,
  RuleSeverity,
} from "../rule-types.js";

// ============================================================================
// 参考文献字段级校验 detector(P0-c · 企业级)
// ============================================================================
// 覆盖 GB/T 7714 顺序编码制的字段级缺陷,逐字段独立校验:
//   F1 编号格式      —— 条目以 [n] 编号且连续
//   F2 文献类型标识  —— [J]/[M]/[D]/[C]/[R]/[S]/[P]/[N]/[G]/[Z]
//   F3 作者著录      —— 起始为作者(姓名),非直接题名
//   F4 出版年份      —— 含 4 位年份
//   F5 卷期页码      —— 期刊类应含卷(期):页 形态
//   F6 编号-引用对应 —— 正文数字制引用编号不超过文献条目总数
//
// 设计(生产标准,非 demo):
//  - 双路探测:type in {reference_entry, references_header 之外的条目}。
//    兼容解析器既有 reference_entry(P0-d 重构后不再截断正文)。
//  - 不可判定字段一律 manual_review,可机械修正的产 replace,绝不臆测。
//  - group 固定"参考文献"+ ruleId 含 reference → 命中 reference_format 修复引擎。
//  - 每类缺陷限量输出,避免整篇刷屏;编号-引用对应只报一次汇总。
//  - ruleSource: "discipline",参与权重排序。

const DISCIPLINE_SOURCE = "discipline" as const;
const GROUP = "参考文献";

function clean(value: unknown): string {
  return String(value || "")
    .replace(/[\x00-\x08\x0e-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function estimatePage(idx: number): number {
  return Math.max(1, Math.floor(idx / 8) + 1);
}

function makeFinding(input: {
  ruleId: string;
  label: string;
  severity: RuleSeverity;
  confidence: number;
  index: number;
  snippet: string;
  ctx: ParsedDocumentContext;
  type: "replace" | "manual_review";
  before: string;
  after: string;
  explanation: string;
}): RuleDetection {
  const paragraphs = input.ctx.paragraphs || [];
  return {
    ruleId: input.ruleId,
    label: input.label,
    group: GROUP,
    severity: input.severity,
    ruleSource: DISCIPLINE_SOURCE,
    confidence: Number(Math.min(0.95, Math.max(0.5, input.confidence)).toFixed(2)),
    page: estimatePage(input.index),
    snippet: input.snippet.slice(0, 180),
    evidence: {
      paragraphIndex: input.index,
      contextBefore: clean(paragraphs[Math.max(0, input.index - 1)]?.text).slice(0, 80) || undefined,
      contextAfter: clean(paragraphs[input.index + 1]?.text).slice(0, 80) || undefined,
    },
    suggestion: {
      type: input.type,
      before: input.before,
      after: input.after,
      explanation: input.explanation,
    },
  } as RuleDetection;
}

// ── 字段识别正则 ──
const NUMBER_PREFIX = /^\[\s*(\d+)\s*\]/; // [1]
const TYPE_MARKER = /\[([JMDCRSPNGZ])\b/; // [J] 等
const YEAR = /(?:19|20)\d{2}/;
const VOL_ISSUE_PAGES = /\d+\s*[(（]\s*\d+\s*[)）]\s*[:：]\s*\d+/; // 47(3): 12
const PAGES_ONLY = /[:：]\s*\d+\s*[-–~]\s*\d+/; // : 12-25
// 题名直接开头(无作者):以书名号或引号起始,视为缺作者的弱信号
const STARTS_WITH_TITLE = /^[\[\]]*\s*[《“"]/;

interface RefEntry {
  index: number;
  num?: number;
  text: string;
}

function collectReferenceEntries(ctx: ParsedDocumentContext): RefEntry[] {
  const items = (ctx.structureItems || []).filter(
    (it: any) => it?.type === "reference_entry" || it?.type === "reference",
  );
  return items.map((it: any) => {
    const text = clean(it?.text);
    const m = NUMBER_PREFIX.exec(text);
    return {
      index: Number(it?.index || 0),
      num: m ? Number(m[1]) : undefined,
      text,
    };
  });
}

// ── F1 编号格式 + 连续性 ──
export const REF_NUMBERING_RULE_ID = "REFERENCE_NUMBERING";
export const REF_NUMBERING_LABEL = "参考文献编号格式";

function checkNumbering(entries: RefEntry[], ctx: ParsedDocumentContext): RuleDetection[] {
  const out: RuleDetection[] = [];
  const numbered = entries.filter((e) => e.num != null);
  // 半数以上无 [n] 编号 → 体系问题,报一次
  if (entries.length >= 2 && numbered.length < Math.ceil(entries.length / 2)) {
    const first = entries[0];
    out.push(makeFinding({
      ruleId: REF_NUMBERING_RULE_ID, label: REF_NUMBERING_LABEL,
      severity: "P1", confidence: 0.78, index: first.index, snippet: first.text, ctx,
      type: "manual_review",
      before: "参考文献未采用 [n] 数字制编号",
      after: "顺序编码制下,每条文献以 [1][2]… 连续编号。",
      explanation: "GB/T 7714 顺序编码制要求文献以方括号数字连续编号。",
    }));
    return out;
  }
  // 连续性:首个断号
  const sorted = numbered.slice().sort((a, b) => (a.num! - b.num!));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].num !== sorted[i - 1].num! + 1) {
      out.push(makeFinding({
        ruleId: REF_NUMBERING_RULE_ID, label: REF_NUMBERING_LABEL,
        severity: "P1", confidence: 0.76, index: sorted[i].index, snippet: sorted[i].text, ctx,
        type: "manual_review",
        before: `文献编号 [${sorted[i].num}] 与前序 [${sorted[i - 1].num}] 不连续`,
        after: "修正编号使其连续递增。",
        explanation: "文献编号出现断号,可能删除条目后未更新。",
      }));
      break;
    }
  }
  return out;
}

// ── F2 文献类型标识 ──
export const REF_TYPE_MARKER_RULE_ID = "REFERENCE_TYPE_MARKER";
export const REF_TYPE_MARKER_LABEL = "文献类型标识符";

function checkTypeMarker(entries: RefEntry[], ctx: ParsedDocumentContext): RuleDetection[] {
  const out: RuleDetection[] = [];
  if (entries.length === 0) return out;
  const withMarker = entries.filter((e) => TYPE_MARKER.test(e.text)).length;
  if (withMarker >= Math.ceil(entries.length / 2)) return out; // 体系正常
  const missing = entries.find((e) => !TYPE_MARKER.test(e.text)) || entries[0];
  out.push(makeFinding({
    ruleId: REF_TYPE_MARKER_RULE_ID, label: REF_TYPE_MARKER_LABEL,
    severity: "P2", confidence: 0.7, index: missing.index, snippet: missing.text, ctx,
    type: "manual_review",
    before: "文献缺少类型标识符",
    after: "按 GB/T 7714 标注类型([J]期刊/[M]专著/[D]学位论文/[C]会议等)。",
    explanation: "顺序编码制要求标注文献类型标识符。",
  }));
  return out;
}

// ── F3 作者著录 ──
export const REF_AUTHOR_RULE_ID = "REFERENCE_AUTHOR";
export const REF_AUTHOR_LABEL = "作者著录";

function checkAuthor(entries: RefEntry[], ctx: ParsedDocumentContext): RuleDetection[] {
  const out: RuleDetection[] = [];
  for (const e of entries) {
    // 去掉编号前缀后,若直接以题名(书名号/引号)起始 → 疑似缺作者
    const body = e.text.replace(NUMBER_PREFIX, "").trim();
    if (STARTS_WITH_TITLE.test(body)) {
      out.push(makeFinding({
        ruleId: REF_AUTHOR_RULE_ID, label: REF_AUTHOR_LABEL,
        severity: "P2", confidence: 0.62, index: e.index, snippet: e.text, ctx,
        type: "manual_review",
        before: "文献疑似缺少作者,直接以题名开头",
        after: "在题名前补充作者著录(多作者用逗号分隔,3 名以上可加「等」)。",
        explanation: "著录格式应以作者起始,而非直接题名。",
      }));
      if (out.length >= 3) break;
    }
  }
  return out;
}

// ── F4 出版年份 ──
export const REF_YEAR_RULE_ID = "REFERENCE_YEAR";
export const REF_YEAR_LABEL = "出版年份";

function checkYear(entries: RefEntry[], ctx: ParsedDocumentContext): RuleDetection[] {
  const out: RuleDetection[] = [];
  for (const e of entries) {
    if (!YEAR.test(e.text)) {
      out.push(makeFinding({
        ruleId: REF_YEAR_RULE_ID, label: REF_YEAR_LABEL,
        severity: "P2", confidence: 0.68, index: e.index, snippet: e.text, ctx,
        type: "manual_review",
        before: "文献缺少出版年份",
        after: "补充 4 位出版年份。",
        explanation: "每条文献应著录出版年份。",
      }));
      if (out.length >= 3) break;
    }
  }
  return out;
}

// ── F5 卷期页码(仅对期刊类 [J] 校验)──
export const REF_VOL_PAGES_RULE_ID = "REFERENCE_VOL_PAGES";
export const REF_VOL_PAGES_LABEL = "卷期页码";

function checkVolPages(entries: RefEntry[], ctx: ParsedDocumentContext): RuleDetection[] {
  const out: RuleDetection[] = [];
  for (const e of entries) {
    const tm = TYPE_MARKER.exec(e.text);
    if (!tm || tm[1] !== "J") continue; // 仅期刊
    if (!VOL_ISSUE_PAGES.test(e.text) && !PAGES_ONLY.test(e.text)) {
      out.push(makeFinding({
        ruleId: REF_VOL_PAGES_RULE_ID, label: REF_VOL_PAGES_LABEL,
        severity: "P2", confidence: 0.64, index: e.index, snippet: e.text, ctx,
        type: "manual_review",
        before: "期刊文献缺少卷(期)或页码",
        after: "补充卷(期): 起止页,如 47(3): 12-25。",
        explanation: "期刊文献应著录卷、期与起止页码。",
      }));
      if (out.length >= 3) break;
    }
  }
  return out;
}

// ── F6 编号-正文引用对应 ──
export const REF_CITATION_MATCH_RULE_ID = "REFERENCE_CITATION_MATCH";
export const REF_CITATION_MATCH_LABEL = "编号与正文引用对应";

const INTEXT_CITATION = /\[(\d+(?:[,，\-–]\s*\d+)*)\]/g;

function checkCitationMatch(entries: RefEntry[], ctx: ParsedDocumentContext): RuleDetection[] {
  const out: RuleDetection[] = [];
  const maxRefNum = entries.reduce((m, e) => Math.max(m, e.num ?? 0), 0);
  if (maxRefNum === 0) return out;

  const paragraphs = ctx.paragraphs || [];
  // 找出正文里引用编号 > 文献总数的越界引用(只报首个 + 汇总)
  let firstOverflow: { idx: number; cited: number; text: string } | null = null;
  for (let i = 0; i < paragraphs.length; i++) {
    const text = String(paragraphs[i]?.text || "");
    let m: RegExpExecArray | null;
    INTEXT_CITATION.lastIndex = 0;
    while ((m = INTEXT_CITATION.exec(text)) !== null) {
      const nums = m[1].split(/[,，\-–]/).map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
      const over = nums.find((n) => n > maxRefNum);
      if (over != null) {
        firstOverflow = { idx: i, cited: over, text: clean(text) };
        break;
      }
    }
    if (firstOverflow) break;
  }
  if (firstOverflow) {
    out.push(makeFinding({
      ruleId: REF_CITATION_MATCH_RULE_ID, label: REF_CITATION_MATCH_LABEL,
      severity: "P1", confidence: 0.72, index: firstOverflow.idx,
      snippet: firstOverflow.text, ctx,
      type: "manual_review",
      before: `正文引用 [${firstOverflow.cited}] 超出文献条目总数 ${maxRefNum}`,
      after: "核对正文引用编号与参考文献列表,确保一一对应。",
      explanation: "正文数字制引用编号不应超过参考文献条目总数。",
    }));
  }
  return out;
}

// ── 主 detect ──
export function detectReferenceFields(ctx: ParsedDocumentContext): RuleDetection[] {
  const entries = collectReferenceEntries(ctx);
  if (entries.length === 0) return [];
  return [
    ...checkNumbering(entries, ctx),
    ...checkTypeMarker(entries, ctx),
    ...checkAuthor(entries, ctx),
    ...checkYear(entries, ctx),
    ...checkVolPages(entries, ctx),
    ...checkCitationMatch(entries, ctx),
  ];
}

export const referenceFieldsDetector: FormatRuleDetector = {
  ruleId: REF_NUMBERING_RULE_ID, // 代表性 ruleId(实际产出多 ruleId)
  label: "参考文献字段级校验",
  group: GROUP,
  severity: "P1",
  detect: detectReferenceFields,
};

/** canonical 映射(追加进 canonical-rule-map / patch-2)。 */
export const REFERENCE_FIELD_CANONICAL_MAP: Record<string, string> = {
  [REF_NUMBERING_RULE_ID]: "canonical_reference_numbering",
  [REF_TYPE_MARKER_RULE_ID]: "canonical_reference_type_marker",
  [REF_AUTHOR_RULE_ID]: "canonical_reference_author",
  [REF_YEAR_RULE_ID]: "canonical_reference_year",
  [REF_VOL_PAGES_RULE_ID]: "canonical_reference_vol_pages",
  [REF_CITATION_MATCH_RULE_ID]: "canonical_reference_citation_match",
};
