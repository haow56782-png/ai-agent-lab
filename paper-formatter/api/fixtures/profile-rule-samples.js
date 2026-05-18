export const CAFA_RULE_SEED = {
    school: "CAFA",
    ruleVersion: "2025",
    fixtureVersion: "v0.1",
    baselineStandard: "GB/T 7713.1-2025",
    rules: [
        {
            ruleId: "CAFA-FIG-CAPTION-001",
            category: "figureCaption",
            target: "figure",
            description: "图题应放在图片下方，并与最近的图对象绑定。",
            expected: { placement: "below_figure" },
            severity: "error",
        },
        {
            ruleId: "CAFA-FIG-CAPTION-002",
            category: "style",
            target: "caption",
            description: "图题应居中排布。",
            expected: { alignment: "center" },
            severity: "warning",
        },
        {
            ruleId: "CAFA-FIG-CAPTION-003",
            category: "style",
            target: "caption",
            description: "图题字体应使用学校模板允许的中文正文字体。",
            expected: { fontFamily: "宋体" },
            severity: "warning",
        },
        {
            ruleId: "CAFA-FIG-CAPTION-004",
            category: "style",
            target: "caption",
            description: "图题字号、段前段后和非加粗样式需统一。",
            expected: { sizePt: 10.5, spacingBeforePt: 6, spacingAfterPt: 6, bold: false },
            severity: "warning",
        },
        {
            ruleId: "CAFA-FIG-CAPTION-005",
            category: "position",
            target: "paragraph",
            description: "正文中的“如图/见图”引用不得识别成图题。",
            expected: { excludeBodyReference: true },
            severity: "error",
        },
        {
            ruleId: "CAFA-TABLE-CAPTION-001",
            category: "tableCaption",
            target: "table",
            description: "表题应放在表格上方，并与最近的表对象绑定。",
            expected: { placement: "above_table" },
            severity: "error",
        },
        {
            ruleId: "CAFA-TABLE-CAPTION-002",
            category: "style",
            target: "caption",
            description: "表题应居中排布。",
            expected: { alignment: "center" },
            severity: "warning",
        },
        {
            ruleId: "CAFA-TABLE-CAPTION-003",
            category: "style",
            target: "caption",
            description: "表题字体应使用学校模板允许的中文正文字体。",
            expected: { fontFamily: "宋体" },
            severity: "warning",
        },
        {
            ruleId: "CAFA-TABLE-CAPTION-004",
            category: "style",
            target: "caption",
            description: "表题字号、段前段后和非加粗样式需统一。",
            expected: { sizePt: 10.5, spacingBeforePt: 6, spacingAfterPt: 6, bold: false },
            severity: "warning",
        },
        {
            ruleId: "CAFA-TABLE-CAPTION-005",
            category: "position",
            target: "paragraph",
            description: "正文中的“见表/如表”引用不得识别成表题。",
            expected: { excludeBodyReference: true },
            severity: "error",
        },
        {
            ruleId: "CAFA-TABLE-CAPTION-006",
            category: "numbering",
            target: "table",
            description: "续表应绑定到原表，不得被识别为新的主表题。",
            expected: { allowContinuedTable: true },
            severity: "warning",
        },
    ],
};
export const CAFA_PROFILE_RULE_SAMPLE = {
    schoolId: "cafa",
    name: "中央美术学院",
    version: "v2023.10",
    effectiveFrom: "2024-01-01",
    faculty: "美术学系",
    school: CAFA_RULE_SEED.school,
    ruleVersion: CAFA_RULE_SEED.ruleVersion,
    fixtureVersion: CAFA_RULE_SEED.fixtureVersion,
    baselineStandard: CAFA_RULE_SEED.baselineStandard,
    rulesJson: [
        { ruleId: "margin_top_mm", label: "上边距", value: 32, unit: "mm" },
        { ruleId: "margin_bottom_mm", label: "下边距", value: 27, unit: "mm" },
        { ruleId: "margin_left_mm", label: "左边距", value: 32, unit: "mm" },
        { ruleId: "margin_right_mm", label: "右边距", value: 27, unit: "mm" },
        { ruleId: "gutter_mm", label: "装订线", value: 10, unit: "mm" },
        { ruleId: "heading_before_pt", label: "一级标题段前", value: 28, unit: "pt" },
        { ruleId: "heading_after_pt", label: "一级标题段后", value: 20, unit: "pt" },
        { ruleId: "line_spacing", label: "正文行距", value: 1.75 },
    ],
    styleMap: [
        { ruleId: "body_fonts", allowedFonts: ["仿宋_GB2312", "Times New Roman"] },
        { ruleId: "first_line_indent_cm", value: 0.74, unit: "cm" },
    ],
    rules: CAFA_RULE_SEED.rules,
};
export const PROFILE_RULE_SAMPLES = [
    CAFA_PROFILE_RULE_SAMPLE,
];
export function getProfileRuleSample(schoolId) {
    return PROFILE_RULE_SAMPLES.find((sample) => sample.schoolId === schoolId) || null;
}
export function getCafaRuleIds() {
    return CAFA_RULE_SEED.rules.map((rule) => rule.ruleId);
}
