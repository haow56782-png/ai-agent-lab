export const FOOTNOTE_STYLE_RULE_ID = "FOOTNOTE_STYLE_NOT_ALLOWED";
export const FOOTNOTE_STYLE_LABEL = "脚注样式不在白名单";
function normalizeFontName(value) {
    return String(value || "").toLowerCase().trim();
}
function isAllowedFootnoteFont(value) {
    const font = normalizeFontName(value);
    return font.includes("times") || font.includes("宋") || font.includes("仿宋") || font.includes("arial");
}
export function detectFootnoteStyleIssues(ctx) {
    const footnoteParagraph = (ctx.paragraphs || []).find((paragraph) => /footnote|脚注/i.test(paragraph?.style || ""));
    if (!footnoteParagraph)
        return [];
    const runFonts = Array.isArray(footnoteParagraph.runs) ? footnoteParagraph.runs.map((run) => run?.name).filter(Boolean) : [];
    const runSizes = Array.isArray(footnoteParagraph.runs) ? footnoteParagraph.runs.map((run) => Number(run?.size_pt || 0)).filter(Boolean) : [];
    const hasDisallowedFont = runFonts.some((font) => !isAllowedFootnoteFont(font));
    const hasUnexpectedSize = runSizes.some((size) => size > 11.5 || size < 8.5);
    if (!hasDisallowedFont && !hasUnexpectedSize)
        return [];
    return [{
            ruleId: FOOTNOTE_STYLE_RULE_ID,
            label: FOOTNOTE_STYLE_LABEL,
            group: "样式",
            severity: "P2",
            confidence: 0.76,
            page: Math.max(1, Math.floor((footnoteParagraph.index || 0) / 8) + 1),
            snippet: String(footnoteParagraph.text || "").trim().slice(0, 180) || "脚注内容需要人工复核。",
            evidence: {
                paragraphIndex: footnoteParagraph.index || 0,
                contextBefore: ctx.paragraphs[Math.max(0, (footnoteParagraph.index || 0) - 1)]?.text?.slice(0, 80),
                contextAfter: ctx.paragraphs[(footnoteParagraph.index || 0) + 1]?.text?.slice(0, 80),
            },
            suggestion: {
                type: "restructure",
                before: runFonts[0] || "脚注样式",
                after: "按学校模板脚注样式统一",
                explanation: "脚注的字体、字号或样式不在学校模板白名单中，建议统一到模板允许的脚注样式组合。",
            },
        }];
}
export const footnoteStyleDetector = {
    ruleId: FOOTNOTE_STYLE_RULE_ID,
    label: FOOTNOTE_STYLE_LABEL,
    group: "样式",
    severity: "P2",
    detect: detectFootnoteStyleIssues,
};
