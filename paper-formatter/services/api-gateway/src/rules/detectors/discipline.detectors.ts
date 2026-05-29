import type {
  FormatRuleDetector,
  ParsedDocumentContext,
  RuleDetection,
  RuleSeverity,
} from "../rule-types.js";

// ============================================================================
// 学科层 detector 全集(11 个)
// ============================================================================
// 设计约束(防漂移):
//  1. 每个 detector 双路探测:优先读解析层结构化标记;缺失时降级到可得字段。
//  2. 不可判定项一律产出 manual_review,绝不臆测成 replace/restructure(防假阳性)。
//  3. 所有 detection 显式带 ruleSource: "discipline",供权重排序使用。
//  4. canonical 映射、ruleId 命名与 discipline-stem-rules.yaml / patch-2 完全一致。
//
// 注册:把文件末尾 disciplineDetectors 展开追加进 rule-registry.ts 的 detectors 数组。

const DISCIPLINE_SOURCE = "discipline" as const;

function cleanSnippet(value: unknown): string {
  return String(value || "")
    .replace(/[\x00-\x08\x0e-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function estimatePage(paragraphIndex: number): number {
  return Math.max(1, Math.floor(paragraphIndex / 8) + 1);
}

/** 统一构造 detection,补 ruleSource 与上下文。 */
function makeDetection(input: {
  ruleId: string;
  label: string;
  group: string;
  severity: RuleSeverity;
  confidence: number;
  paragraphIndex: number;
  snippet: string;
  ctx: ParsedDocumentContext;
  suggestionType: "replace" | "restructure" | "manual_review";
  before: string;
  after: string;
  explanation: string;
  objectName?: string;
}): RuleDetection {
  const paragraphs = input.ctx.paragraphs || [];
  return {
    ruleId: input.ruleId,
    label: input.label,
    group: input.group,
    severity: input.severity,
    ruleSource: DISCIPLINE_SOURCE,
    confidence: Number(Math.min(0.98, Math.max(0.5, input.confidence)).toFixed(2)),
    page: estimatePage(input.paragraphIndex),
    snippet: input.snippet,
    evidence: {
      paragraphIndex: input.paragraphIndex,
      contextBefore: cleanSnippet(paragraphs[Math.max(0, input.paragraphIndex - 1)]?.text).slice(0, 80) || undefined,
      contextAfter: cleanSnippet(paragraphs[input.paragraphIndex + 1]?.text).slice(0, 80) || undefined,
      objectName: input.objectName,
    },
    suggestion: {
      type: input.suggestionType,
      before: input.before,
      after: input.after,
      explanation: input.explanation,
    },
  } as RuleDetection;
}

// ───────────────────────── 公式 numbering ─────────────────────────
export const FORMULA_NUMBERING_RULE_ID = "FORMULA_NUMBERING";
export const FORMULA_NUMBERING_LABEL = "公式连续编号";

function getFormulaItems(ctx: ParsedDocumentContext): any[] {
  return (ctx.structureItems || []).filter(
    (it: any) => it?.type === "formula" || it?.type === "equation" || it?.type === "omml",
  );
}

/** 提取公式编号文本里的 (n) 或 (章-序) 形态。 */
const FORMULA_NUM_PATTERN = /[(（]\s*(\d+)(?:[-–.]\s*(\d+))?\s*[)）]/;

export function detectFormulaNumbering(ctx: ParsedDocumentContext): RuleDetection[] {
  const formulas = getFormulaItems(ctx);
  if (formulas.length === 0) return [];

  // 收集已有编号序列,检测断号 / 缺号。
  const numbered: Array<{ idx: number; major?: number; minor?: number; raw: string }> = [];
  let unnumbered = 0;
  for (const f of formulas) {
    const text = String(f?.numbering || f?.text || "");
    const m = FORMULA_NUM_PATTERN.exec(text);
    if (m) {
      numbered.push({
        idx: Number(f?.index || 0),
        major: m[2] ? Number(m[1]) : undefined,
        minor: m[2] ? Number(m[2]) : Number(m[1]),
        raw: m[0],
      });
    } else {
      unnumbered += 1;
    }
  }

  const out: RuleDetection[] = [];
  // 信号①:存在独立公式但完全无编号
  if (numbered.length === 0 && unnumbered > 0) {
    const first = formulas[0];
    out.push(makeDetection({
      ruleId: FORMULA_NUMBERING_RULE_ID, label: FORMULA_NUMBERING_LABEL,
      group: "公式", severity: "P1", confidence: 0.8,
      paragraphIndex: Number(first?.index || 0),
      snippet: cleanSnippet(first?.text) || "(独立公式)", ctx,
      suggestionType: "manual_review",
      before: "公式无编号",
      after: "为独立公式补充连续编号,建议按章节制 (章-序),编号右对齐。",
      explanation: `检测到 ${unnumbered} 个独立公式缺少编号,理工科论文要求独立公式连续编号。`,
    }));
    return out;
  }
  // 信号②:编号存在但不连续(同章 minor 跳号)
  const sorted = numbered.slice().sort((a, b) => a.idx - b.idx);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1], cur = sorted[i];
    const sameMajor = prev.major === cur.major;
    if (sameMajor && cur.minor != null && prev.minor != null && cur.minor !== prev.minor + 1) {
      out.push(makeDetection({
        ruleId: FORMULA_NUMBERING_RULE_ID, label: FORMULA_NUMBERING_LABEL,
        group: "公式", severity: "P1", confidence: 0.78,
        paragraphIndex: cur.idx,
        snippet: cur.raw, ctx,
        suggestionType: "manual_review",
        before: `公式编号 ${cur.raw} 与前序 ${prev.raw} 不连续`,
        after: "核对并修正公式编号,使其在同一章节内连续递增。",
        explanation: "公式编号出现断号,可能存在删除公式后未更新编号的情况。",
      }));
      break; // 报首个断点即可,避免刷屏
    }
  }
  return out;
}

// ───────────────────────── 公式 alignment ─────────────────────────
export const FORMULA_ALIGNMENT_RULE_ID = "FORMULA_ALIGNMENT";
export const FORMULA_ALIGNMENT_LABEL = "公式居中与编号右对齐";

export function detectFormulaAlignment(ctx: ParsedDocumentContext): RuleDetection[] {
  const formulas = getFormulaItems(ctx);
  if (formulas.length === 0) return [];
  const paragraphs = ctx.paragraphs || [];
  const out: RuleDetection[] = [];
  for (const f of formulas) {
    const idx = Number(f?.index || 0);
    const para = paragraphs[idx];
    const align = String(para?.alignment || para?.style?.alignment || "").toLowerCase();
    if (!align) continue; // 解析层无对齐信息 → 跳过,不臆测
    if (align !== "center" && align !== "both" && align !== "distribute") {
      out.push(makeDetection({
        ruleId: FORMULA_ALIGNMENT_RULE_ID, label: FORMULA_ALIGNMENT_LABEL,
        group: "公式", severity: "P2", confidence: 0.72,
        paragraphIndex: idx, snippet: cleanSnippet(f?.text) || "(独立公式)", ctx,
        suggestionType: "replace",
        before: `公式段落对齐:${align}`,
        after: "将独立公式段落设为居中,公式编号用右对齐制表位置于行末。",
        explanation: "独立公式应居中排版,编号右对齐,符合理工科版式惯例。",
      }));
    }
  }
  return out.slice(0, 5); // 限量,避免整篇刷屏
}

// ───────────────────────── 公式 citation ─────────────────────────
export const FORMULA_CITATION_RULE_ID = "FORMULA_CITATION";
export const FORMULA_CITATION_LABEL = "公式引用格式";

/** 不规范引用:裸编号「由(3-1)可得」缺少「式」字。规范:式(3-1)。 */
const BARE_FORMULA_REF = /(?<![式公式])\([0-9]+[-–.][0-9]+\)/;
const GOOD_FORMULA_REF = /式\s*[(（][0-9]+[-–.]?[0-9]*[)）]/;

export function detectFormulaCitation(ctx: ParsedDocumentContext): RuleDetection[] {
  if (getFormulaItems(ctx).length === 0) return [];
  const paragraphs = ctx.paragraphs || [];
  const out: RuleDetection[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const text = String(paragraphs[i]?.text || "");
    if (BARE_FORMULA_REF.test(text) && !GOOD_FORMULA_REF.test(text)) {
      out.push(makeDetection({
        ruleId: FORMULA_CITATION_RULE_ID, label: FORMULA_CITATION_LABEL,
        group: "公式", severity: "P2", confidence: 0.7,
        paragraphIndex: i, snippet: cleanSnippet(text), ctx,
        suggestionType: "replace",
        before: "正文以裸编号引用公式",
        after: "公式引用统一改为「式(3-1)」形式。",
        explanation: "正文引用公式应使用「式(编号)」格式,而非裸编号。",
      }));
      if (out.length >= 3) break;
    }
  }
  return out;
}

// ───────────────────────── 三线表强制 ─────────────────────────
export const THREE_LINE_TABLE_RULE_ID = "THREE_LINE_TABLE";
export const THREE_LINE_TABLE_LABEL = "三线表强制";

/**
 * 三线表判定:仅顶线、栏目线、底线;无竖线、无内部多余横线。
 * 双路:优先读 table.isThreeLine;缺失时读 tblBorders / borders 结构降级判断。
 */
function isThreeLineTable(table: any): boolean | null {
  // 字段兼容:parser(Python)产 is_three_line(下划线);保留 isThreeLine 以防未来边界做 camelCase 转换。
  const flag = table?.isThreeLine ?? table?.is_three_line;
  if (typeof flag === "boolean") return flag;
  const borders = table?.tblBorders || table?.borders;
  if (!borders) return null; // 无边框信息 → 不可判定
  const hasVertical = Boolean(borders.insideV && borders.insideV !== "none" && borders.insideV?.val !== "none");
  const hasInsideH = Boolean(borders.insideH && borders.insideH !== "none" && borders.insideH?.val !== "none");
  // 三线表:无竖线、无内部横线(顶/底线由 top/bottom 体现)
  return !hasVertical && !hasInsideH;
}

export function detectThreeLineTable(ctx: ParsedDocumentContext): RuleDetection[] {
  const tables = ctx.tables || [];
  if (tables.length === 0) return [];
  const out: RuleDetection[] = [];
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    const verdict = isThreeLineTable(t);
    if (verdict === null) continue; // 不可判定 → 跳过,防漂移
    if (verdict === false) {
      const idx = Number(t?.paragraph_index ?? t?.index ?? 0);
      out.push(makeDetection({
        ruleId: THREE_LINE_TABLE_RULE_ID, label: THREE_LINE_TABLE_LABEL,
        group: "表格对象", severity: "P1", confidence: 0.82,
        paragraphIndex: idx,
        snippet: cleanSnippet(t?.caption || t?.text) || `表 ${i + 1}`, ctx,
        suggestionType: "replace",
        before: "表格含竖线或多余内部横线",
        after: "改为三线表:保留顶线、栏目线、底线,删除竖线与内部横线。",
        explanation: "理工科数据表通常要求三线表样式。",
        objectName: cleanSnippet(t?.caption) || `table-${i + 1}`,
      }));
    }
  }
  return out;
}

// ───────────────────────── 表内单位一致 ─────────────────────────
export const TABLE_UNIT_RULE_ID = "TABLE_UNIT_CONSISTENCY";
export const TABLE_UNIT_LABEL = "表内单位与有效数字一致";

const DECIMAL_NUM = /-?\d+\.(\d+)/;

export function detectTableUnitConsistency(ctx: ParsedDocumentContext): RuleDetection[] {
  const tables = ctx.tables || [];
  if (tables.length === 0) return [];
  const out: RuleDetection[] = [];
  for (let ti = 0; ti < tables.length; ti++) {
    const rows: any[] = tables[ti]?.rows || tables[ti]?.cells || [];
    if (!Array.isArray(rows) || rows.length < 2) continue;
    const colCount = Array.isArray(rows[0]) ? rows[0].length : 0;
    if (colCount === 0) continue;
    // 逐列检查小数位是否一致(仅数值列)
    for (let c = 0; c < colCount; c++) {
      const decimals = new Set<number>();
      let numericCells = 0;
      for (let r = 1; r < rows.length; r++) {
        const cell = String(rows[r]?.[c]?.text ?? rows[r]?.[c] ?? "");
        const m = DECIMAL_NUM.exec(cell);
        if (m) { decimals.add(m[1].length); numericCells += 1; }
      }
      if (numericCells >= 3 && decimals.size > 1) {
        const idx = Number(tables[ti]?.paragraph_index ?? tables[ti]?.index ?? 0);
        out.push(makeDetection({
          ruleId: TABLE_UNIT_RULE_ID, label: TABLE_UNIT_LABEL,
          group: "表格对象", severity: "P2", confidence: 0.68,
          paragraphIndex: idx,
          snippet: cleanSnippet(tables[ti]?.caption) || `表 ${ti + 1} 第 ${c + 1} 列`, ctx,
          suggestionType: "manual_review",
          before: `表 ${ti + 1} 第 ${c + 1} 列有效数字位数不一致`,
          after: "统一该列数据的有效数字位数。",
          explanation: "同列数值的有效数字位数应一致。",
        }));
        break; // 每表只报一次
      }
    }
  }
  return out;
}

// ───────────────────────── 图轴与图例 ─────────────────────────
export const FIGURE_AXIS_RULE_ID = "FIGURE_AXIS_LEGEND";
export const FIGURE_AXIS_LABEL = "图坐标轴与图例完整";

export function detectFigureAxisLegend(ctx: ParsedDocumentContext): RuleDetection[] {
  // ⚠ 上游依赖未实现:本 detector 需要 parser 产出 type==="chart" 的条目及其 embeddedText
  //   (图内嵌入文本=轴标签/图例)。当前 parse_enrich.py 不解析图内文本,
  //   故本 detector 暂为空跑(返回 [])。属于已知缺口,不是 bug。
  //   激活前置:docx-parser 需补图内 OLE/EMF 文本抽取或 chart XML 解析(P2 级,成本高)。
  //   在此之前保留逻辑骨架,字段命名与未来 parser 输出对齐(type/chart/embeddedText)。
  const items = (ctx.structureItems || []).filter(
    (it: any) => it?.type === "figure" || it?.type === "chart" || it?.type === "image_caption",
  );
  if (items.length === 0) return [];
  const out: RuleDetection[] = [];
  for (const it of items) {
    // 仅当解析层明确标记为数据图(chart)且缺嵌入文本时提示
    if (it?.type !== "chart") continue;
    const hasEmbeddedText = Boolean(it?.embeddedText && String(it.embeddedText).trim().length > 0);
    if (hasEmbeddedText) continue;
    const idx = Number(it?.index || 0);
    out.push(makeDetection({
      ruleId: FIGURE_AXIS_RULE_ID, label: FIGURE_AXIS_LABEL,
      group: "图片对象", severity: "P2", confidence: 0.6,
      paragraphIndex: idx, snippet: cleanSnippet(it?.caption) || "(数据图)", ctx,
      suggestionType: "manual_review",
      before: "数据图可能缺少坐标轴标注或图例",
      after: "核对数据图含坐标轴(量与单位)与图例,多子图按 (a)(b)(c) 编号。",
      explanation: "数据图应包含坐标轴标注与图例,便于读者理解。",
    }));
  }
  return out;
}

// ───────────────────────── 图分辨率 / 矢量 ─────────────────────────
export const FIGURE_RESOLUTION_RULE_ID = "FIGURE_RESOLUTION";
export const FIGURE_RESOLUTION_LABEL = "图清晰度与矢量优先";

const MIN_DPI = 300;

export function detectFigureResolution(ctx: ParsedDocumentContext): RuleDetection[] {
  const images = (ctx.images || []) as any[];
  if (images.length === 0) return [];
  const out: RuleDetection[] = [];
  for (const img of images) {
    const dpi = Number(img?.dpi || img?.horizontal_dpi || 0);
    const format = String(img?.format || img?.content_type || "").toLowerCase();
    // 优先复用 parser 已算好的 is_vector(parse_enrich 输出);缺失时按扩展名兜底。
    const isVector = (typeof img?.is_vector === "boolean")
      ? img.is_vector
      : /emf|wmf|svg|eps|pdf/.test(format);
    if (isVector) continue; // 矢量图不判分辨率
    if (dpi <= 0) continue; // 无 dpi 信息 → 跳过,不臆测
    if (dpi < MIN_DPI) {
      const idx = Number(img?.paragraph_index || 0);
      out.push(makeDetection({
        ruleId: FIGURE_RESOLUTION_RULE_ID, label: FIGURE_RESOLUTION_LABEL,
        group: "图片对象", severity: "P2", confidence: 0.7,
        paragraphIndex: idx, snippet: cleanSnippet(img?.name) || "(位图)", ctx,
        suggestionType: "manual_review",
        before: `图片分辨率约 ${dpi} dpi,低于 ${MIN_DPI} dpi`,
        after: "提高位图分辨率,或线条图改用矢量格式(EMF/SVG)。",
        explanation: "位图分辨率过低会导致印刷模糊,线条图建议用矢量格式。",
        objectName: cleanSnippet(img?.name) || undefined,
      }));
    }
  }
  return out.slice(0, 5);
}

// ───────────────────────── 符号表 ─────────────────────────
export const SYMBOL_TABLE_RULE_ID = "SYMBOL_TABLE_PRESENCE";
export const SYMBOL_TABLE_LABEL = "符号表 / 物理量单位表";

const SYMBOL_TABLE_HEADING = /(主要符号|符号表|符号说明|物理量|术语表|nomenclature|list of symbols)/i;

export function detectSymbolTable(ctx: ParsedDocumentContext): RuleDetection[] {
  // 仅在文档明显是理工科(有公式)且无符号表时,做一次性弱提示。
  const hasFormula = getFormulaItems(ctx).length >= 3;
  if (!hasFormula) return [];
  const headings = ctx.headings || [];
  const hasSymbolTable = headings.some((h: any) => SYMBOL_TABLE_HEADING.test(String(h?.text || "")));
  if (hasSymbolTable) return [];
  return [makeDetection({
    ruleId: SYMBOL_TABLE_RULE_ID, label: SYMBOL_TABLE_LABEL,
    group: "前置部分", severity: "P3", confidence: 0.55,
    paragraphIndex: 0, snippet: "(未检测到符号表)", ctx,
    suggestionType: "manual_review",
    before: "文档含较多公式但未检测到符号表",
    after: "如学校要求,补充主要物理量、符号、单位说明的符号表。",
    explanation: "公式密集的理工科论文通常需要符号表,请确认是否需要补充。",
  })];
}

// ───────────────────────── 代码块格式 ─────────────────────────
export const CODE_BLOCK_RULE_ID = "CODE_BLOCK_STYLE";
export const CODE_BLOCK_LABEL = "代码块格式";

const MONOSPACE_FONTS = /consolas|courier|monaco|menlo|source code|fira code|jetbrains|等宽|monospace/i;
const CODE_KEYWORDS = /\b(function|def|class|import|public|private|void|int|for|while|return|#include)\b/;

export function detectCodeBlockStyle(ctx: ParsedDocumentContext): RuleDetection[] {
  const paragraphs = ctx.paragraphs || [];
  const out: RuleDetection[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const text = String(p?.text || "");
    // 仅当明显是代码(命中关键字)却非等宽字体时提示
    if (!CODE_KEYWORDS.test(text)) continue;
    const fontName = String(p?.runs?.find((r: any) => r?.name)?.name || p?.style?.font || "");
    if (MONOSPACE_FONTS.test(fontName)) continue;
    if (!fontName) continue; // 无字体信息 → 不臆测
    out.push(makeDetection({
      ruleId: CODE_BLOCK_RULE_ID, label: CODE_BLOCK_LABEL,
      group: "代码 / 算法", severity: "P2", confidence: 0.65,
      paragraphIndex: i, snippet: cleanSnippet(text), ctx,
      suggestionType: "replace",
      before: `代码段使用非等宽字体:${fontName}`,
      after: "代码块改用等宽字体,保留缩进,与正文区分。",
      explanation: "代码块应使用等宽字体并保留缩进。",
    }));
    if (out.length >= 3) break;
  }
  return out;
}

// ───────────────────────── 算法题注 ─────────────────────────
export const ALGORITHM_CAPTION_RULE_ID = "ALGORITHM_CAPTION";
export const ALGORITHM_CAPTION_LABEL = "算法伪代码题注";

const ALGO_BLOCK = /(算法\s*\d|Algorithm\s*\d|\bbegin\b[\s\S]{0,200}\bend\b|伪代码)/i;
const ALGO_CAPTION = /(算法\s*[\d-]+|Algorithm\s*[\d-]+)/;

export function detectAlgorithmCaption(ctx: ParsedDocumentContext): RuleDetection[] {
  const paragraphs = ctx.paragraphs || [];
  const out: RuleDetection[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const text = String(paragraphs[i]?.text || "");
    if (!ALGO_BLOCK.test(text)) continue;
    // 检查邻近段落是否含算法编号题注
    const window = [paragraphs[i - 1], paragraphs[i], paragraphs[i + 1]]
      .map((p) => String(p?.text || "")).join(" ");
    if (ALGO_CAPTION.test(window)) continue;
    out.push(makeDetection({
      ruleId: ALGORITHM_CAPTION_RULE_ID, label: ALGORITHM_CAPTION_LABEL,
      group: "代码 / 算法", severity: "P2", confidence: 0.62,
      paragraphIndex: i, snippet: cleanSnippet(text), ctx,
      suggestionType: "manual_review",
      before: "算法块缺少编号题注",
      after: "为算法块补充编号题注(如「算法 3-1」),与图表题注体系一致。",
      explanation: "算法伪代码应有编号题注,便于正文引用。",
    }));
    if (out.length >= 3) break;
  }
  return out;
}

// ───────────────────────── 文献类型标识符 ─────────────────────────
export const REFERENCE_TYPE_MARKER_RULE_ID = "REFERENCE_TYPE_MARKER";
export const REFERENCE_TYPE_MARKER_LABEL = "文献类型标识符";

const TYPE_MARKER = /\[[JMDCRSPGNZ]\b/; // [J] [M] [D] [C] 等 GB/T 7714 类型标识

export function detectReferenceTypeMarker(ctx: ParsedDocumentContext): RuleDetection[] {
  const entries = (ctx.structureItems || []).filter((it: any) => it?.type === "reference_entry" || it?.type === "reference");
  if (entries.length === 0) return [];
  // 若整体都没有类型标识,只报一次(说明可能用了非 GB/T 7714 体系)
  const withMarker = entries.filter((e: any) => TYPE_MARKER.test(String(e?.text || ""))).length;
  if (withMarker >= Math.ceil(entries.length * 0.5)) return []; // 半数以上有标识 → 体系正常
  const first = entries.find((e: any) => !TYPE_MARKER.test(String(e?.text || ""))) || entries[0];
  const idx = Number(first?.index || 0);
  return [makeDetection({
    ruleId: REFERENCE_TYPE_MARKER_RULE_ID, label: REFERENCE_TYPE_MARKER_LABEL,
    group: "参考文献", severity: "P2", confidence: 0.66,
    paragraphIndex: idx, snippet: cleanSnippet(first?.text), ctx,
    suggestionType: "manual_review",
    before: "参考文献缺少文献类型标识符",
    after: "按 GB/T 7714 为文献补充类型标识([J]/[M]/[D]/[C] 等)。",
    explanation: "GB/T 7714 著录要求标注文献类型标识符,理工科论文普遍采用。",
  })];
}

// ============================================================================
// detector 对象 + 注册清单
// ============================================================================
function asDetector(
  ruleId: string, label: string, group: string, severity: RuleSeverity,
  detect: (ctx: ParsedDocumentContext) => RuleDetection[],
): FormatRuleDetector {
  return { ruleId, label, group, severity, detect };
}

export const formulaNumberingDetector = asDetector(FORMULA_NUMBERING_RULE_ID, FORMULA_NUMBERING_LABEL, "公式", "P1", detectFormulaNumbering);
export const formulaAlignmentDetector = asDetector(FORMULA_ALIGNMENT_RULE_ID, FORMULA_ALIGNMENT_LABEL, "公式", "P2", detectFormulaAlignment);
export const formulaCitationDetector = asDetector(FORMULA_CITATION_RULE_ID, FORMULA_CITATION_LABEL, "公式", "P2", detectFormulaCitation);
export const threeLineTableDetector = asDetector(THREE_LINE_TABLE_RULE_ID, THREE_LINE_TABLE_LABEL, "表格对象", "P1", detectThreeLineTable);
export const tableUnitConsistencyDetector = asDetector(TABLE_UNIT_RULE_ID, TABLE_UNIT_LABEL, "表格对象", "P2", detectTableUnitConsistency);
export const figureAxisLegendDetector = asDetector(FIGURE_AXIS_RULE_ID, FIGURE_AXIS_LABEL, "图片对象", "P2", detectFigureAxisLegend);
export const figureResolutionDetector = asDetector(FIGURE_RESOLUTION_RULE_ID, FIGURE_RESOLUTION_LABEL, "图片对象", "P2", detectFigureResolution);
export const symbolTableDetector = asDetector(SYMBOL_TABLE_RULE_ID, SYMBOL_TABLE_LABEL, "前置部分", "P3", detectSymbolTable);
export const codeBlockStyleDetector = asDetector(CODE_BLOCK_RULE_ID, CODE_BLOCK_LABEL, "代码 / 算法", "P2", detectCodeBlockStyle);
export const algorithmCaptionDetector = asDetector(ALGORITHM_CAPTION_RULE_ID, ALGORITHM_CAPTION_LABEL, "代码 / 算法", "P2", detectAlgorithmCaption);
export const referenceTypeMarkerDetector = asDetector(REFERENCE_TYPE_MARKER_RULE_ID, REFERENCE_TYPE_MARKER_LABEL, "参考文献", "P2", detectReferenceTypeMarker);

/**
 * 学科 detector 全集。展开追加进 rule-registry.ts 的 detectors 数组:
 *   import { disciplineDetectors } from "./detectors/discipline.detectors.js";
 *   const detectors = [ ...existing, ...disciplineDetectors ];
 *
 * 注意:这些 detector 应仅在 disciplineInference.discipline === "stem" 时启用,
 * 由 runFormatRuleDetectors 根据 ctx 上的学科标记过滤(见下方说明)。
 */
export const disciplineDetectors: FormatRuleDetector[] = [
  formulaNumberingDetector,
  formulaAlignmentDetector,
  formulaCitationDetector,
  threeLineTableDetector,
  tableUnitConsistencyDetector,
  figureAxisLegendDetector,
  figureResolutionDetector,
  symbolTableDetector,
  codeBlockStyleDetector,
  algorithmCaptionDetector,
  referenceTypeMarkerDetector,
];

/** detector ruleId → canonical ruleId(与 patch-2 / yaml 一致,供 canonical-rule-map 合并)。 */
export const DISCIPLINE_DETECTOR_CANONICAL_MAP: Record<string, string> = {
  [FORMULA_NUMBERING_RULE_ID]: "canonical_formula_numbering",
  [FORMULA_ALIGNMENT_RULE_ID]: "canonical_formula_alignment",
  [FORMULA_CITATION_RULE_ID]: "canonical_formula_citation",
  [THREE_LINE_TABLE_RULE_ID]: "canonical_three_line_table_enforce",
  [TABLE_UNIT_RULE_ID]: "canonical_table_unit_consistency",
  [FIGURE_AXIS_RULE_ID]: "canonical_figure_axis_legend",
  [FIGURE_RESOLUTION_RULE_ID]: "canonical_figure_vector_resolution",
  [SYMBOL_TABLE_RULE_ID]: "canonical_symbol_table_presence",
  [CODE_BLOCK_RULE_ID]: "canonical_code_block_style",
  [ALGORITHM_CAPTION_RULE_ID]: "canonical_algorithm_caption",
  [REFERENCE_TYPE_MARKER_RULE_ID]: "canonical_reference_type_marker",
};
