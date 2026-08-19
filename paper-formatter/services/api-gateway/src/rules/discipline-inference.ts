import type { ParsedDocumentContext } from "./rule-types.js";

/**
 * 学科推断 enrichment 步骤。
 *
 * 挂载位置:Step3 解析完成后、规则合成前。纯函数,不阻塞主流程。
 * 输入:ParsedDocumentContext(已含 paragraphs / tables / structureItems 等解析产物)
 * 输出:DisciplineInference 三元组,写入 reviewStore / profile 上下文,Step4 只读不算。
 *
 * 设计原则:
 *  - 高置信(c >= 0.75)路径下对用户完全透明,静默加学科层。
 *  - banner 只是纠错出口,不是开关:条目显隐取决于合成出的规则集,不取决于本结果是否冒泡。
 *  - needsBanner 由两条独立路径决定:① 模糊带;② 否决线(学校模板缺学科细则)。
 */

export type Discipline = "stem" | "humanities" | "unknown";

export interface DisciplineInference {
  /** 推断出的学科。c < LOW_THRESHOLD 时为 "unknown"(回落 GB,不加学科层)。 */
  discipline: Discipline;
  /** STEM 置信度,[0,1]。越接近 1 越确定是理工科。 */
  confidence: number;
  /** 是否需要在 Step4 浮现确认 banner。 */
  needsBanner: boolean;
  /** banner / 调试用:本次推断命中的信号及其贡献。 */
  signals: SignalContribution[];
  /** 触发(或未触发)banner 的原因码,便于埋点与回归。 */
  bannerReason: BannerReason;
}

export type BannerReason =
  | "none_high_confidence" // 高置信且模板已覆盖 → 不弹
  | "none_low_confidence" // 回落 GB → 不弹
  | "ambiguous_band" // 模糊带 → 弹
  | "profile_missing_discipline_rules"; // 否决线:模板缺学科细则 → 强制弹

export interface SignalContribution {
  key: string;
  label: string;
  /** 对 STEM 置信的有向贡献:正值偏理工,负值偏文科。 */
  delta: number;
  detail: string;
}

/** 三段阈值,与状态流转图一致。 */
const HIGH_THRESHOLD = 0.75;
const LOW_THRESHOLD = 0.45;

/**
 * 学科细则的 canonical 规则前缀。判断"学校 profile 是否已覆盖学科细则"时,
 * 只要 profile 的 rules_json 里出现任一前缀,即视为已覆盖,否决线不触发。
 * 这些前缀应与理工科规则层 yaml(discipline-stem-rules.yaml)的 ruleId 命名空间保持一致。
 */
const DISCIPLINE_RULE_PREFIXES = [
  "canonical_formula", // 公式编号 / 字体 / 引用
  "canonical_three_line_table", // 三线表强制
  "canonical_symbol_table", // 符号表 / 物理量单位表
  "canonical_code_block", // 代码块 / 算法环境
];

interface SignalStats {
  paragraphCount: number;
  formulaObjectCount: number;
  subSupRunRatio: number; // 含上下标的 run 占比
  chemicalFormulaHits: number;
  threeLineTableRatio: number; // 三线表 / 全部表格
  ieeeStyleCitationRatio: number; // [1] 数字制引用占比
  authorYearCitationHits: number; // (Smith, 2020) 作者-年份制
  codeOrAlgoBlocks: number;
  footnoteDensity: number; // 脚注 / 段落
  avgParagraphLength: number;
}

/** 数字制引用:[1] [2,3] [1-3]。 */
const NUMERIC_CITATION = /\[\d+(?:[,，\-–—]\s*\d+)*\]/;
/** 作者-年份制引用:(Smith, 2020) / (王浩, 2021)。 */
const AUTHOR_YEAR_CITATION = /[（(][^)）]{1,40}?(?:19|20)\d{2}[)）]/;
/** 化学式:元素符号 + 数字,如 H2O / Fe3O4(粗判,精判交给 sub-sup detector)。 */
const CHEM_FORMULA = /\b([A-Z][a-z]?\d+){1,}/;
/** 代码 / 算法环境的弱信号:常见关键字密集出现。 */
const CODE_HINT = /\b(function|def|class|import|for|while|return|公式|算法|Algorithm|begin|end)\b/i;

function safeText(v: unknown): string {
  return String(v ?? "").trim();
}

function collectStats(ctx: ParsedDocumentContext): SignalStats {
  const paragraphs = ctx.paragraphs ?? [];
  const tables = ctx.tables ?? [];
  const structureItems = ctx.structureItems ?? [];
  const paragraphCount = Math.max(1, paragraphs.length);

  // 公式对象:优先用 structureItems 中标注的 formula 类型;退化时用段落正则兜底。
  const formulaItems = structureItems.filter(
    (it: any) => it?.type === "formula" || it?.type === "equation" || it?.type === "omml",
  );
  const formulaObjectCount = formulaItems.length;

  // 上下标 run 占比:依赖解析层在 run 上标记 subscript / superscript。
  let totalRuns = 0;
  let subSupRuns = 0;
  for (const p of paragraphs) {
    const runs = p?.runs ?? [];
    for (const r of runs) {
      totalRuns += 1;
      if (r?.subscript || r?.superscript) subSupRuns += 1;
    }
  }
  const subSupRunRatio = totalRuns > 0 ? subSupRuns / totalRuns : 0;

  let chemicalFormulaHits = 0;
  let ieeeHits = 0;
  let authorYearHits = 0;
  let footnoteHits = 0;
  let codeBlocks = 0;
  let totalLen = 0;

  for (const p of paragraphs) {
    const text = safeText(p?.text);
    totalLen += text.length;
    if (CHEM_FORMULA.test(text)) chemicalFormulaHits += 1;
    if (NUMERIC_CITATION.test(text)) ieeeHits += 1;
    if (AUTHOR_YEAR_CITATION.test(text)) authorYearHits += 1;
    if (p?.style?.includes?.("footnote") || p?.type === "footnote") footnoteHits += 1;
    if ((p?.style?.includes?.("code") || p?.type === "code_block") && CODE_HINT.test(text)) {
      codeBlocks += 1;
    }
  }

  // 三线表:解析层应在 table 上标记是否仅含顶/底/栏目线(无竖线、无内部横线)。
  const threeLineTables = tables.filter((t: any) => (t?.isThreeLine ?? t?.is_three_line) === true).length;
  const threeLineTableRatio = tables.length > 0 ? threeLineTables / tables.length : 0;

  return {
    paragraphCount,
    formulaObjectCount,
    subSupRunRatio,
    chemicalFormulaHits,
    threeLineTableRatio,
    ieeeStyleCitationRatio: ieeeHits / paragraphCount,
    authorYearCitationHits: authorYearHits,
    codeOrAlgoBlocks: codeBlocks,
    footnoteDensity: footnoteHits / paragraphCount,
    avgParagraphLength: totalLen / paragraphCount,
  };
}

/**
 * 把统计量映射成有向贡献。正值偏理工(c↑),负值偏文科(c↓)。
 * 每个信号的权重经验设定,后续可由回归集校准。
 */
function scoreSignals(s: SignalStats): SignalContribution[] {
  const out: SignalContribution[] = [];

  // ── 偏理工科信号 ──
  const formulaDensity = s.formulaObjectCount / s.paragraphCount;
  if (formulaDensity > 0) {
    out.push({
      key: "formula_density",
      label: "公式对象密度",
      delta: Math.min(0.3, formulaDensity * 6),
      detail: `${s.formulaObjectCount} 个公式 / ${s.paragraphCount} 段`,
    });
  }
  if (s.subSupRunRatio > 0.005) {
    out.push({
      key: "sub_sup_ratio",
      label: "上下标密度",
      delta: Math.min(0.15, s.subSupRunRatio * 15),
      detail: `含上下标 run 占比 ${(s.subSupRunRatio * 100).toFixed(1)}%`,
    });
  }
  if (s.chemicalFormulaHits > 0) {
    out.push({
      key: "chemical_formula",
      label: "化学式",
      delta: Math.min(0.15, s.chemicalFormulaHits * 0.03),
      detail: `命中 ${s.chemicalFormulaHits} 段含化学式`,
    });
  }
  if (s.threeLineTableRatio > 0) {
    out.push({
      key: "three_line_table",
      label: "三线表占比",
      delta: Math.min(0.2, s.threeLineTableRatio * 0.25),
      detail: `三线表占比 ${(s.threeLineTableRatio * 100).toFixed(0)}%`,
    });
  }
  if (s.ieeeStyleCitationRatio > 0.02) {
    out.push({
      key: "numeric_citation",
      label: "数字制引用",
      delta: Math.min(0.15, s.ieeeStyleCitationRatio * 3),
      detail: `数字制引用段落占比 ${(s.ieeeStyleCitationRatio * 100).toFixed(1)}%`,
    });
  }
  if (s.codeOrAlgoBlocks > 0) {
    out.push({
      key: "code_algo",
      label: "代码 / 算法块",
      delta: Math.min(0.12, s.codeOrAlgoBlocks * 0.04),
      detail: `${s.codeOrAlgoBlocks} 个代码 / 算法块`,
    });
  }

  // ── 偏文科信号(负贡献)──
  if (s.authorYearCitationHits > 0) {
    out.push({
      key: "author_year_citation",
      label: "作者-年份制引用",
      delta: -Math.min(0.2, s.authorYearCitationHits * 0.02),
      detail: `命中 ${s.authorYearCitationHits} 处作者-年份制引用`,
    });
  }
  if (s.footnoteDensity > 0.05) {
    out.push({
      key: "footnote_density",
      label: "脚注密集",
      delta: -Math.min(0.15, s.footnoteDensity * 1.5),
      detail: `脚注密度 ${(s.footnoteDensity * 100).toFixed(1)}%`,
    });
  }
  // 长篇连续正文 + 几乎无公式/表 → 偏文科。
  const lowStructuralEvidence = s.formulaObjectCount === 0 && s.threeLineTableRatio === 0;
  if (lowStructuralEvidence && s.avgParagraphLength > 120) {
    out.push({
      key: "prose_heavy",
      label: "长篇连续正文",
      delta: -0.18,
      detail: `平均段长 ${s.avgParagraphLength.toFixed(0)} 字且无公式/三线表`,
    });
  }

  return out;
}

/** 中心 0.5,信号有向叠加后夹到 [0,1]。 */
function aggregateConfidence(contribs: SignalContribution[]): number {
  const raw = 0.5 + contribs.reduce((acc, c) => acc + c.delta, 0);
  return Math.min(1, Math.max(0, raw));
}

/** 学校 profile 是否已规定公式 / 三线表等学科细则。 */
function profileCoversDisciplineRules(
  profile: ParsedDocumentContext["profile"],
): boolean {
  const ruleIds = [
    ...((profile?.rules_json ?? []).map((r: any) => String(r?.ruleId ?? r?.rule_id ?? ""))),
    ...((profile?.style_map ?? []).map((r: any) => String(r?.ruleId ?? r?.rule_id ?? ""))),
  ].filter(Boolean);
  return ruleIds.some((id) => DISCIPLINE_RULE_PREFIXES.some((prefix) => id.startsWith(prefix)));
}

/**
 * 主入口。Step3 解析完成后调用一次。
 */
export function inferDiscipline(ctx: ParsedDocumentContext): DisciplineInference {
  const stats = collectStats(ctx);
  const signals = scoreSignals(stats);
  const confidence = aggregateConfidence(signals);

  // 低置信:回落 GB,不加学科层,不弹 banner。
  if (confidence < LOW_THRESHOLD) {
    return {
      discipline: "unknown",
      confidence,
      needsBanner: false,
      signals,
      bannerReason: "none_low_confidence",
    };
  }

  // confidence >= LOW_THRESHOLD,判定为(倾向)理工科,准备加学科层。
  const profileCovers = profileCoversDisciplineRules(ctx.profile);

  // 否决线:即使高置信,只要学校模板没覆盖学科细则,系统是在替学校"补规则",强制弹。
  if (!profileCovers) {
    return {
      discipline: "stem",
      confidence,
      needsBanner: true,
      signals,
      bannerReason: "profile_missing_discipline_rules",
    };
  }

  // 模板已覆盖:进入正常三段判定。
  if (confidence >= HIGH_THRESHOLD) {
    return {
      discipline: "stem",
      confidence,
      needsBanner: false,
      signals,
      bannerReason: "none_high_confidence",
    };
  }

  // 模糊带 [0.45, 0.75):静默按理工合成,但浮现可忽略的事后确认。
  return {
    discipline: "stem",
    confidence,
    needsBanner: true,
    signals,
    bannerReason: "ambiguous_band",
  };
}
