// ============================================================================
// 补丁二:canonical-rule-map.ts —— 注册学科层 12 条 canonical 规则
// ============================================================================
// 在 DETECTOR_TO_CANONICAL_RULE_ID 映射表里追加以下条目。
//
// 关键修正:原先 SUB_SUP_SCRIPT_RULE_ID → "canonical_formula_01" 名不副实
// (该 detector 只查上下标/化学式/引用标记,不查公式编号字体)。现拆分:
//   - SUB_SUP_SCRIPT 保留,降级为「上下标格式」专项,映射到 formula_font 的子集。
//   - 公式编号 / 对齐 / 引用 由新增 detector 承接(见文末 detector 清单)。
//
// 学科层 detector 命名约定(需在各 detector 文件导出对应 RULE_ID 常量):
//   FORMULA_NUMBERING_RULE_ID / FORMULA_ALIGNMENT_RULE_ID / FORMULA_CITATION_RULE_ID
//   THREE_LINE_TABLE_RULE_ID / TABLE_UNIT_RULE_ID
//   FIGURE_AXIS_RULE_ID / FIGURE_RESOLUTION_RULE_ID
//   SYMBOL_TABLE_RULE_ID
//   CODE_BLOCK_RULE_ID / ALGORITHM_CAPTION_RULE_ID
//   REFERENCE_TYPE_MARKER_RULE_ID

/*
export const DETECTOR_TO_CANONICAL_RULE_ID: Record<string, string> = {
  // ──────────── 既有映射保持不变 ────────────
  [PAGE_MARGIN_RULE_ID]: "canonical_page_canvas_02",
  // ...(原有 20 条略)...

  // ──────────── 公式:拆分修正 ────────────
  // 上下标专项(原 SUB_SUP_SCRIPT)→ 归入字体规范,不再独占 formula_01
  [SUB_SUP_SCRIPT_RULE_ID]: "canonical_formula_font",
  [FORMULA_NUMBERING_RULE_ID]: "canonical_formula_numbering",
  [FORMULA_ALIGNMENT_RULE_ID]: "canonical_formula_alignment",
  [FORMULA_CITATION_RULE_ID]: "canonical_formula_citation",

  // ──────────── 三线表 ────────────
  [THREE_LINE_TABLE_RULE_ID]: "canonical_three_line_table_enforce",
  [TABLE_UNIT_RULE_ID]: "canonical_table_unit_consistency",

  // ──────────── 图 ────────────
  [FIGURE_AXIS_RULE_ID]: "canonical_figure_axis_legend",
  [FIGURE_RESOLUTION_RULE_ID]: "canonical_figure_vector_resolution",

  // ──────────── 符号表 ────────────
  [SYMBOL_TABLE_RULE_ID]: "canonical_symbol_table_presence",

  // ──────────── 代码 / 算法 ────────────
  [CODE_BLOCK_RULE_ID]: "canonical_code_block_style",
  [ALGORITHM_CAPTION_RULE_ID]: "canonical_algorithm_caption",

  // ──────────── 参考文献(理工倾向)────────────
  [REFERENCE_TYPE_MARKER_RULE_ID]: "canonical_reference_type_marker",
};
*/

// ----------------------------------------------------------------------------
// 注意:canonicalize 阶段需顺带回填 ruleSource。
// 现有 resolveCanonicalRuleMapping 只解析 ruleId,不写 ruleSource。
// 建议在 canonicalizeRuleDetections 内部,按 resolvedRuleId 命中的规则库条目
// 把 rule.ruleSource 写回 detection.ruleSource,供补丁一的权重排序使用。
// ----------------------------------------------------------------------------

/*
// canonicalizeRuleDetections 内,对每条 detection 追加:
const matched = findRuleInProfileOrLayers(resolvedRuleId, profile, disciplineLayer);
detection.ruleSource = matched?.ruleSource ?? detection.ruleSource ?? "system";
*/

export {};
