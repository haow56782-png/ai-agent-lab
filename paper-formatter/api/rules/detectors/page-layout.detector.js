import { resolveLayoutThresholds } from "../profile-thresholds.js";
export const PAGE_MARGIN_RULE_ID = "PAGE_MARGIN_REVIEW";
export const PAGE_MARGIN_LABEL = "页边距";
export const GUTTER_RULE_ID = "GUTTER_REVIEW";
export const GUTTER_LABEL = "装订线 0";
function estimatePage(paragraphIndex = 0) {
    return Math.max(1, Math.floor(paragraphIndex / 8) + 1);
}
function createDetection(input) {
    return {
        ruleId: input.ruleId,
        label: input.label,
        group: "页面",
        severity: "P2",
        confidence: 0.78,
        page: input.page || 1,
        snippet: input.snippet,
        suggestion: {
            type: "restructure",
            before: input.snippet,
            after: `按学校版芯要求调整${input.label}`,
            explanation: input.explanation,
        },
    };
}
export function detectPageLayout(ctx) {
    const section = ctx.sections?.[0];
    const thresholds = resolveLayoutThresholds(ctx.profile);
    if (!section) {
        return [
            createDetection({
                ruleId: PAGE_MARGIN_RULE_ID,
                label: PAGE_MARGIN_LABEL,
                snippet: "未检测到页面设置",
                explanation: "文档没有解析出明确的页面边距信息，建议人工复核版芯设置。",
            }),
        ];
    }
    const detections = [];
    const top = Number(section.margin_top_mm || 0);
    const bottom = Number(section.margin_bottom_mm || 0);
    const left = Number(section.margin_left_mm || 0);
    const right = Number(section.margin_right_mm || 0);
    const gutter = Number(section.gutter_mm || 0);
    const tooFar = Math.abs(top - thresholds.marginTopMm) > 5
        || Math.abs(bottom - thresholds.marginBottomMm) > 5
        || Math.abs(left - thresholds.marginLeftMm) > 5
        || Math.abs(right - thresholds.marginRightMm) > 5;
    if (tooFar) {
        detections.push(createDetection({
            ruleId: PAGE_MARGIN_RULE_ID,
            label: PAGE_MARGIN_LABEL,
            snippet: `页边距 ${top}/${bottom}/${left}/${right} mm`,
            explanation: `当前页边距与规则包目标值 ${thresholds.marginTopMm}/${thresholds.marginBottomMm}/${thresholds.marginLeftMm}/${thresholds.marginRightMm} mm 差异较大，建议复核页边距设置。`,
        }));
    }
    if (Math.abs(gutter - thresholds.gutterMm) > 0.5) {
        detections.push(createDetection({
            ruleId: GUTTER_RULE_ID,
            label: GUTTER_LABEL,
            snippet: `装订线 ${gutter} mm`,
            explanation: `当前装订线与规则包目标值 ${thresholds.gutterMm} mm 不一致，建议按学校模板复核装订线设置。`,
        }));
    }
    return detections;
}
export const pageMarginDetector = {
    ruleId: PAGE_MARGIN_RULE_ID,
    label: PAGE_MARGIN_LABEL,
    group: "页面",
    severity: "P2",
    detect: detectPageLayout,
};
