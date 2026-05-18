export const FIGURE_DIRECTORY_RULE_ID = "FIGURE_DIRECTORY_REVIEW";
export const FIGURE_DIRECTORY_LABEL = "图目录";
function hasFigureDirectory(paragraphs) {
    return paragraphs.some((paragraph) => /图目录|list\s+of\s+figures/i.test(String(paragraph?.text || "")));
}
export function detectFigureDirectoryReview(ctx) {
    const figureCaptions = (ctx.structureItems || []).filter((item) => item?.type === "figure_caption");
    if (figureCaptions.length < 2)
        return [];
    if (hasFigureDirectory(ctx.paragraphs || []))
        return [];
    const firstCaption = figureCaptions[0];
    const paragraphIndex = Number(firstCaption?.index || 0);
    const snippet = String(firstCaption?.text || "图目录需要人工复核").trim().slice(0, 180);
    return [{
            ruleId: FIGURE_DIRECTORY_RULE_ID,
            label: FIGURE_DIRECTORY_LABEL,
            group: "目录 & 域",
            severity: "P2",
            confidence: 0.71,
            page: Math.max(1, Math.floor(paragraphIndex / 8) + 1),
            snippet,
            evidence: {
                paragraphIndex,
                contextBefore: ctx.paragraphs[Math.max(0, paragraphIndex - 1)]?.text?.slice(0, 80),
                contextAfter: ctx.paragraphs[paragraphIndex + 1]?.text?.slice(0, 80),
            },
            suggestion: {
                type: "restructure",
                before: snippet,
                after: "补充或刷新图目录",
                explanation: "文档中存在多处图题，但未检测到明确的图目录区域，建议补充图目录或刷新图目录域。",
            },
        }];
}
export const figureDirectoryDetector = {
    ruleId: FIGURE_DIRECTORY_RULE_ID,
    label: FIGURE_DIRECTORY_LABEL,
    group: "目录 & 域",
    severity: "P2",
    detect: detectFigureDirectoryReview,
};
