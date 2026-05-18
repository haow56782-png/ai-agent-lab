export const FRONT_MATTER_ROMAN_RULE_ID = "FRONT_MATTER_ROMAN_REVIEW";
export const FRONT_MATTER_ROMAN_LABEL = "前置页 罗马";
export const FOOTER_ALIGNMENT_RULE_ID = "FOOTER_ALIGNMENT_REVIEW";
export const FOOTER_ALIGNMENT_LABEL = "页脚居中";
const ROMAN_PATTERN = /^(?:[ivxlcdm]+)$/i;
const ARABIC_PATTERN = /^\d+$/;
function resolveFooterNumberFormat(section) {
    const declaredFormat = String(section?.footer_page_number_format || "").trim().toLowerCase();
    if (declaredFormat === "roman" || declaredFormat === "arabic" || declaredFormat === "mixed") {
        return declaredFormat;
    }
    const footerText = String(section?.footer_text || "").trim();
    if (ROMAN_PATTERN.test(footerText))
        return "roman";
    if (ARABIC_PATTERN.test(footerText))
        return "arabic";
    return footerText ? "mixed" : "unknown";
}
function createDetection(input) {
    return {
        ruleId: input.ruleId,
        label: input.label,
        group: "分节 & 页码",
        severity: "P2",
        confidence: 0.73,
        page: input.page || 1,
        snippet: input.snippet,
        suggestion: {
            type: "restructure",
            before: input.snippet,
            after: `按模板统一${input.label}`,
            explanation: input.explanation,
        },
    };
}
export function detectFooterPageNumber(ctx) {
    const sections = ctx.sections || [];
    if (sections.length === 0)
        return [];
    const detections = [];
    const firstSection = sections[0];
    const firstFooterText = String(firstSection?.footer_text || "").trim();
    const firstFormat = resolveFooterNumberFormat(firstSection);
    if (firstSection?.footer_has_page_field && firstFormat === "arabic") {
        detections.push(createDetection({
            ruleId: FRONT_MATTER_ROMAN_RULE_ID,
            label: FRONT_MATTER_ROMAN_LABEL,
            snippet: `前置页页码 "${firstFooterText || "PAGE"}"`,
            explanation: "检测到前置页存在页码域，但当前呈现为阿拉伯数字，建议按模板改为罗马数字页码。",
        }));
    }
    else if (firstFooterText && firstFormat === "mixed") {
        detections.push(createDetection({
            ruleId: FRONT_MATTER_ROMAN_RULE_ID,
            label: FRONT_MATTER_ROMAN_LABEL,
            snippet: `前置页页脚 "${firstFooterText}"`,
            explanation: "前置页页脚内容既不像罗马数字也不像可识别页码，建议人工复核前置页页码样式。",
        }));
    }
    const misalignedFooter = sections.find((section) => {
        const footerText = String(section?.footer_text || "").trim();
        return section?.footer_present
            && section?.footer_alignment
            && section.footer_alignment !== "center"
            && (footerText.length > 0 || Boolean(section?.footer_has_page_field));
    });
    if (misalignedFooter) {
        detections.push(createDetection({
            ruleId: FOOTER_ALIGNMENT_RULE_ID,
            label: FOOTER_ALIGNMENT_LABEL,
            snippet: `页脚对齐 ${misalignedFooter.footer_alignment || "未知"}`,
            explanation: "检测到页脚不是居中对齐，建议按模板统一页脚位置。",
            page: Number(misalignedFooter.index || 0) + 1,
        }));
    }
    return detections;
}
export const footerPageNumberDetector = {
    ruleId: FOOTER_ALIGNMENT_RULE_ID,
    label: FOOTER_ALIGNMENT_LABEL,
    group: "分节 & 页码",
    severity: "P2",
    detect: detectFooterPageNumber,
};
