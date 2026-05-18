export const FLOATING_OBJECT_OVERLAP_RULE_ID = "FLOATING_OBJECT_OVERLAP_TEXT";
export const FLOATING_OBJECT_OVERLAP_LABEL = "图片/印章覆盖正文";
export const FLOATING_OBJECT_OVERLAP_DESCRIPTION = "系统发现页面中的图片、印章或浮动对象与正文文字发生重叠，影响正文阅读和论文版式规范。";
function cleanEvidenceSnippet(value) {
    return String(value || "")
        .replace(/[\x00-\x08\x0e-\x1f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180);
}
function estimatePageFromParagraphIndex(paragraphIndex) {
    return Math.max(1, Math.floor(paragraphIndex / 8) + 1);
}
function shouldSkipFloatingObject(image) {
    if (image.object_type !== "floating")
        return true;
    if (image.behind_text)
        return true;
    if (!image.overlap_risk && !image.allow_overlap)
        return true;
    if ((image.width_pt || 0) < 18 && (image.height_pt || 0) < 18)
        return true;
    return false;
}
function resolveNearbyParagraph(paragraphs, image) {
    const paragraphIndex = Math.max(0, image.paragraph_index ?? 0);
    const paragraph = paragraphs[paragraphIndex]
        ?? paragraphs[Math.max(0, paragraphIndex - 1)]
        ?? paragraphs[paragraphIndex + 1]
        ?? null;
    const snippet = cleanEvidenceSnippet(paragraph?.text
        || image.paragraph_text
        || paragraphs[Math.max(0, paragraphIndex - 1)]?.text
        || paragraphs[paragraphIndex + 1]?.text);
    if (!paragraph || !snippet)
        return null;
    return {
        paragraphIndex,
        paragraph,
        snippet,
        contextBefore: cleanEvidenceSnippet(paragraphs[Math.max(0, paragraphIndex - 1)]?.text).slice(0, 80) || undefined,
        contextAfter: cleanEvidenceSnippet(paragraphs[paragraphIndex + 1]?.text).slice(0, 80) || undefined,
    };
}
function computeTextMetrics(ctx, paragraph, snippet) {
    const section = ctx.sections[0];
    const pageWidthPt = (section?.page_width_cm || 21) * 28.3464567;
    const leftMarginPt = (section?.margin_left_mm || 30) * 2.83464567;
    const rightMarginPt = (section?.margin_right_mm || 25) * 2.83464567;
    const textWidthPt = Math.max(180, pageWidthPt - leftMarginPt - rightMarginPt);
    const fontSizePt = Math.max(10, paragraph?.runs?.find((run) => run?.size_pt)?.size_pt || 12);
    const lineSpacing = Math.max(1.2, paragraph?.spacing?.line_spacing || 1.5);
    const lineHeightPt = fontSizePt * lineSpacing;
    const charsPerLine = Math.max(12, Math.floor(textWidthPt / Math.max(fontSizePt * 0.92, 8)));
    const lineCount = Math.max(1, Math.ceil(snippet.length / charsPerLine));
    return {
        textWidthPt,
        textHeightPt: Math.max(lineHeightPt, lineCount * lineHeightPt),
        lineHeightPt,
    };
}
function computeOverlapRatio(image, metrics) {
    const widthPt = Math.max(0, image.width_pt || 0);
    const heightPt = Math.max(0, image.height_pt || 0);
    const overlapWidthPt = Math.min(widthPt || metrics.textWidthPt * 0.18, metrics.textWidthPt);
    const overlapHeightPt = Math.min(heightPt || metrics.lineHeightPt, metrics.textHeightPt);
    const overlapArea = overlapWidthPt * overlapHeightPt;
    const minArea = Math.max(1, Math.min(Math.max(widthPt * Math.max(heightPt, metrics.lineHeightPt), 1), Math.max(metrics.textWidthPt * metrics.textHeightPt, 1)));
    return overlapArea / minArea;
}
function buildCandidate(ctx, image, nearby) {
    const metrics = computeTextMetrics(ctx, nearby.paragraph, nearby.snippet);
    const overlapRatio = computeOverlapRatio(image, metrics);
    if (overlapRatio < 0.05)
        return null;
    const widthPt = Math.max(0, image.width_pt || 0);
    const heightPt = Math.max(0, image.height_pt || 0);
    return {
        page: estimatePageFromParagraphIndex(nearby.paragraphIndex),
        paragraphIndex: nearby.paragraphIndex,
        snippet: nearby.snippet,
        contextBefore: nearby.contextBefore,
        contextAfter: nearby.contextAfter,
        overlapRatio,
        objectName: cleanEvidenceSnippet(image.name || image.description) || "floating-object",
        isWatermarkLike: Boolean(image.is_watermark_like),
        bbox: {
            x: 18,
            y: Math.max(0, (nearby.paragraphIndex % 8) * 12),
            w: Math.min(72, Math.max(18, Number(((Math.min(widthPt || metrics.textWidthPt * 0.18, metrics.textWidthPt) / metrics.textWidthPt) * 100).toFixed(1)))),
            h: Math.min(36, Math.max(10, Number(((Math.min(heightPt || metrics.lineHeightPt, metrics.textHeightPt) / Math.max(metrics.textHeightPt, metrics.lineHeightPt)) * 24).toFixed(1)))),
        },
    };
}
export function detectFloatingObjectOverlap(ctx) {
    const images = (ctx.images || []);
    return images
        .filter((image) => !shouldSkipFloatingObject(image))
        .map((image) => {
        const nearby = resolveNearbyParagraph(ctx.paragraphs || [], image);
        return nearby ? buildCandidate(ctx, image, nearby) : null;
    })
        .filter((candidate) => candidate !== null)
        .sort((left, right) => right.overlapRatio - left.overlapRatio)
        .map((candidate) => {
        const after = candidate.isWatermarkLike
            ? "将印章或水印调整为衬于文字下方，保留对象但不遮挡正文。"
            : "调整图片环绕方式或锚点位置，确保图片不覆盖正文内容。";
        return {
            ruleId: FLOATING_OBJECT_OVERLAP_RULE_ID,
            label: FLOATING_OBJECT_OVERLAP_LABEL,
            group: "图形对象 & 正文",
            severity: "P1",
            confidence: Number(Math.min(0.98, 0.84 + candidate.overlapRatio).toFixed(2)),
            page: candidate.page,
            snippet: candidate.snippet,
            evidence: {
                paragraphIndex: candidate.paragraphIndex,
                contextBefore: candidate.contextBefore,
                contextAfter: candidate.contextAfter,
                bbox: candidate.bbox,
                objectName: candidate.objectName,
            },
            suggestion: {
                type: "restructure",
                before: candidate.objectName || FLOATING_OBJECT_OVERLAP_LABEL,
                after,
                explanation: after,
            },
        };
    });
}
export const floatingObjectOverlapDetector = {
    ruleId: FLOATING_OBJECT_OVERLAP_RULE_ID,
    label: FLOATING_OBJECT_OVERLAP_LABEL,
    group: "图形对象 & 正文",
    severity: "P1",
    detect: detectFloatingObjectOverlap,
};
