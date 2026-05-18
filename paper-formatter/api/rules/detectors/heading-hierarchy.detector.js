export const HEADING_HIERARCHY_RULE_ID = "HEADING_HIERARCHY_REVIEW";
export const HEADING_HIERARCHY_LABEL = "二级标题层级";
function findHierarchyIssue(headings) {
    if (headings.length === 0)
        return { heading: { index: 0, text: "未检测到标题" }, reason: "文档未检测到明确标题层级" };
    const hasLevelOne = headings.some((heading) => Number(heading?.level || 0) === 1);
    if (!hasLevelOne)
        return { heading: headings[0], reason: "文档存在标题，但未检测到一级标题作为章节锚点" };
    for (let index = 1; index < headings.length; index += 1) {
        const previousLevel = Number(headings[index - 1]?.level || 0);
        const currentLevel = Number(headings[index]?.level || 0);
        if (currentLevel > previousLevel + 1) {
            return { heading: headings[index], reason: `标题层级从 ${previousLevel} 级直接跳到 ${currentLevel} 级` };
        }
    }
    return null;
}
export function detectHeadingHierarchy(ctx) {
    const issue = findHierarchyIssue(ctx.headings || []);
    if (!issue)
        return [];
    const paragraphIndex = Number(issue.heading?.index || 0);
    const snippet = String(issue.heading?.text || issue.reason).trim().slice(0, 180);
    return [{
            ruleId: HEADING_HIERARCHY_RULE_ID,
            label: HEADING_HIERARCHY_LABEL,
            group: "样式",
            severity: "P2",
            confidence: 0.79,
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
                after: "按一级、二级、三级标题顺序整理层级",
                explanation: issue.reason,
            },
        }];
}
export const headingHierarchyDetector = {
    ruleId: HEADING_HIERARCHY_RULE_ID,
    label: HEADING_HIERARCHY_LABEL,
    group: "样式",
    severity: "P2",
    detect: detectHeadingHierarchy,
};
