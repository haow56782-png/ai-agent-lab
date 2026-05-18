import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildCanonicalRuleCatalog } from "./canonical-rule-catalog.js";
function loadCanonicalSchoolRegistry() {
    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
        path.join(dirname, "canonical-school-registry.json"),
        path.join(dirname, "../../fixtures/canonical-school-registry.json"),
        path.join(dirname, "../../src/fixtures/canonical-school-registry.json"),
        path.join(process.cwd(), "src/fixtures/canonical-school-registry.json"),
    ];
    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(readFileSync(candidate, "utf-8"));
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
        catch {
            continue;
        }
    }
    throw new Error("Unable to load canonical-school-registry.json");
}
function createRulePayload(input) {
    return {
        rulesJson: [
            { ruleId: "margin_top_mm", label: "上边距", value: input.marginTop, unit: "mm", category: "01. 页面与纸张", categoryCode: "01", source: "school", thesisSubset: "page_canvas", targetObject: "页面/版心", uiSection: "页面" },
            { ruleId: "margin_bottom_mm", label: "下边距", value: input.marginBottom, unit: "mm", category: "01. 页面与纸张", categoryCode: "01", source: "school", thesisSubset: "page_canvas", targetObject: "页面/版心", uiSection: "页面" },
            { ruleId: "margin_left_mm", label: "左边距", value: input.marginLeft, unit: "mm", category: "01. 页面与纸张", categoryCode: "01", source: "school", thesisSubset: "page_canvas", targetObject: "页面/版心", uiSection: "页面" },
            { ruleId: "margin_right_mm", label: "右边距", value: input.marginRight, unit: "mm", category: "01. 页面与纸张", categoryCode: "01", source: "school", thesisSubset: "page_canvas", targetObject: "页面/版心", uiSection: "页面" },
            { ruleId: "gutter_mm", label: "装订线", value: input.gutter, unit: "mm", category: "01. 页面与纸张", categoryCode: "01", source: "school", thesisSubset: "page_canvas", targetObject: "页面/版心", uiSection: "页面" },
            { ruleId: "heading_before_pt", label: "一级标题段前", value: input.headingBefore, unit: "pt", category: "09. 标题层级", categoryCode: "09", source: "school", thesisSubset: "heading", targetObject: "章节标题", uiSection: "正文" },
            { ruleId: "heading_after_pt", label: "一级标题段后", value: input.headingAfter, unit: "pt", category: "09. 标题层级", categoryCode: "09", source: "school", thesisSubset: "heading", targetObject: "章节标题", uiSection: "正文" },
            { ruleId: "line_spacing", label: "正文行距", value: input.lineSpacing, category: "10. 正文段落", categoryCode: "10", source: "school", thesisSubset: "paragraph", targetObject: "正文段落", uiSection: "正文" },
            ...buildCanonicalRuleCatalog(),
        ],
        styleMap: [
            { ruleId: "body_fonts", label: "正文字体", allowedFonts: input.bodyFonts, category: "10. 正文段落", categoryCode: "10", source: "school", thesisSubset: "paragraph", targetObject: "正文段落", uiSection: "正文" },
            { ruleId: "first_line_indent_cm", label: "首行缩进", value: input.firstLineIndentCm, unit: "cm", category: "10. 正文段落", categoryCode: "10", source: "school", thesisSubset: "paragraph", targetObject: "正文段落", uiSection: "正文" },
        ],
    };
}
export const CANONICAL_PROFILE_SEEDS = [
    {
        schoolId: "thu",
        name: "清华大学",
        faculty: "计算机科学与技术系",
        version: "v2024.09",
        effectiveFrom: "2024-01-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 25, marginBottom: 25, marginLeft: 30, marginRight: 25, gutter: 0,
            headingBefore: 24, headingAfter: 18, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "pku",
        name: "北京大学",
        faculty: "元培学院 · 通用规范",
        version: "v2024.07",
        effectiveFrom: "2024-01-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 25, marginBottom: 25, marginLeft: 30, marginRight: 25, gutter: 0,
            headingBefore: 26, headingAfter: 18, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "tjp",
        name: "同济大学",
        faculty: "软件学院",
        version: "v2024.03",
        effectiveFrom: "2024-01-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 28, marginBottom: 25, marginLeft: 28, marginRight: 25, gutter: 0,
            headingBefore: 24, headingAfter: 16, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "fdu",
        name: "复旦大学",
        faculty: "管理学院",
        version: "v2024.01",
        effectiveFrom: "2024-01-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 26, marginBottom: 24, marginLeft: 30, marginRight: 24, gutter: 0,
            headingBefore: 24, headingAfter: 18, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "cafa",
        name: "中央美术学院",
        faculty: "美术学系",
        version: "v2023.10",
        effectiveFrom: "2024-01-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 32, marginBottom: 27, marginLeft: 32, marginRight: 27, gutter: 10,
            headingBefore: 28, headingAfter: 20, lineSpacing: 1.75,
            bodyFonts: ["仿宋_GB2312", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "sjtu",
        name: "上海交通大学",
        faculty: "电子信息与电气工程学院",
        version: "v2024.05",
        effectiveFrom: "2024-01-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 25, marginBottom: 25, marginLeft: 28, marginRight: 25, gutter: 5,
            headingBefore: 24, headingAfter: 16, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "cqccst",
        name: "重庆城市科技学院",
        faculty: "经济管理学院",
        version: "v2021.06",
        effectiveFrom: "2024-01-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 25, marginBottom: 25, marginLeft: 25, marginRight: 20, gutter: 0,
            headingBefore: 24, headingAfter: 16, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "nku",
        name: "南开大学",
        faculty: "经济学院",
        version: "v2026.05",
        effectiveFrom: "2026-05-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 28, marginBottom: 25, marginLeft: 30, marginRight: 25, gutter: 0,
            headingBefore: 24, headingAfter: 18, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "lzu",
        name: "兰州大学",
        faculty: "本科生毕业论文模板",
        version: "v2026.05",
        effectiveFrom: "2026-05-13",
        aliases: [],
        ...createRulePayload({
            marginTop: 30, marginBottom: 25, marginLeft: 30, marginRight: 25, gutter: 0,
            headingBefore: 24, headingAfter: 18, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "ustc",
        name: "中国科学技术大学",
        faculty: "本科毕业论文",
        version: "v2026.05",
        effectiveFrom: "2026-05-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 25, marginBottom: 25, marginLeft: 25, marginRight: 20, gutter: 0,
            headingBefore: 24, headingAfter: 16, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "bnu",
        name: "北京师范大学",
        faculty: "学位论文模板",
        version: "v2026.05",
        effectiveFrom: "2026-05-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 28, marginBottom: 24, marginLeft: 30, marginRight: 25, gutter: 0,
            headingBefore: 24, headingAfter: 18, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "zju",
        name: "浙江大学",
        faculty: "本科毕业论文",
        version: "v2026.05",
        effectiveFrom: "2026-05-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 25, marginBottom: 25, marginLeft: 30, marginRight: 25, gutter: 0,
            headingBefore: 24, headingAfter: 18, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "nju",
        name: "南京大学",
        faculty: "本科毕业论文",
        version: "v2026.05",
        effectiveFrom: "2026-05-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 26, marginBottom: 24, marginLeft: 30, marginRight: 25, gutter: 0,
            headingBefore: 24, headingAfter: 18, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "whu",
        name: "武汉大学",
        faculty: "本科毕业论文",
        version: "v2026.05",
        effectiveFrom: "2026-05-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 26, marginBottom: 24, marginLeft: 30, marginRight: 25, gutter: 0,
            headingBefore: 24, headingAfter: 18, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "hust",
        name: "华中科技大学",
        faculty: "本科毕业论文",
        version: "v2026.05",
        effectiveFrom: "2026-05-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 26, marginBottom: 24, marginLeft: 30, marginRight: 25, gutter: 0,
            headingBefore: 24, headingAfter: 18, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "ruc",
        name: "中国人民大学",
        faculty: "本科毕业论文",
        version: "v2026.05",
        effectiveFrom: "2026-05-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 26, marginBottom: 24, marginLeft: 30, marginRight: 25, gutter: 0,
            headingBefore: 24, headingAfter: 18, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "cqu",
        name: "重庆大学",
        faculty: "本科毕业论文",
        version: "v2026.05",
        effectiveFrom: "2026-05-01",
        aliases: [],
        ...createRulePayload({
            marginTop: 26, marginBottom: 24, marginLeft: 30, marginRight: 25, gutter: 0,
            headingBefore: 24, headingAfter: 18, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.74,
        }),
    },
    {
        schoolId: "dhu",
        name: "东华大学",
        faculty: "待确认学院/通用规范",
        version: "draft-2026-05-13",
        effectiveFrom: "2026-05-13",
        aliases: [],
        ...createRulePayload({
            marginTop: 25, marginBottom: 25, marginLeft: 30, marginRight: 25, gutter: 0,
            headingBefore: 12, headingAfter: 6, lineSpacing: 1.5,
            bodyFonts: ["宋体", "Times New Roman"], firstLineIndentCm: 0.85,
        }),
    },
];
const registryBySchoolId = new Map(loadCanonicalSchoolRegistry().map((entry) => [entry.schoolId, entry]));
for (const seed of CANONICAL_PROFILE_SEEDS) {
    const registry = registryBySchoolId.get(seed.schoolId);
    if (!registry) {
        throw new Error(`Missing canonical school registry entry for ${seed.schoolId}`);
    }
    seed.aliases = registry.aliases;
}
function normalizeSchoolName(value) {
    return value.replace(/[·•·\s　（）()]/g, "").trim().toLowerCase();
}
export function resolveCanonicalProfileSeed(name) {
    const normalized = normalizeSchoolName(name);
    for (const seed of CANONICAL_PROFILE_SEEDS) {
        if (normalizeSchoolName(seed.schoolId) === normalized)
            return seed;
        if (normalizeSchoolName(seed.name) === normalized)
            return seed;
        if (seed.aliases.some((alias) => normalizeSchoolName(alias) === normalized))
            return seed;
    }
    return null;
}
