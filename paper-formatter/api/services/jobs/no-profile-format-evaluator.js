export function buildAutoFormatIssues(sections, paragraphs) {
    const formatIssues = [];
    const detectedFonts = new Set();
    const detectedFontSizes = new Set();
    let paragraphTotal = 0;
    let hasRichFormat = false;
    for (const paragraph of paragraphs) {
        if (!paragraph.text?.trim())
            continue;
        paragraphTotal++;
        if (paragraph.runs && paragraph.runs.length > 0) {
            hasRichFormat = true;
            for (const run of paragraph.runs) {
                if (run.name)
                    detectedFonts.add(run.name);
                if (run.size_pt)
                    detectedFontSizes.add(Math.round(run.size_pt));
            }
        }
        else if (paragraph.style) {
            hasRichFormat = true;
        }
    }
    if (!hasRichFormat) {
        formatIssues.push(["格式信息不可用（文件为旧版 .doc 格式）", "warn"]);
        formatIssues.push([`检测 ${paragraphTotal} 个正文段落`, "pass"]);
        return formatIssues;
    }
    const fontList = [...detectedFonts].filter(Boolean);
    if (fontList.length > 2) {
        formatIssues.push([`检测到多种字体: ${fontList.slice(0, 4).join("、")}${fontList.length > 4 ? ` 等${fontList.length}种` : ""}`, "warn"]);
    }
    else if (fontList.length === 2) {
        formatIssues.push([`正文字体: ${fontList[0]}（推荐统一为宋体/Times New Roman）`, "warn"]);
    }
    else if (fontList.length === 1) {
        formatIssues.push([`正文字体统一: ${fontList[0]}`, "pass"]);
    }
    else {
        formatIssues.push(["未检测到字体信息", "warn"]);
    }
    const fontSizeList = [...detectedFontSizes].filter(Boolean).sort((left, right) => left - right);
    if (fontSizeList.length > 2) {
        formatIssues.push([`字号不统一: ${fontSizeList.join("pt、")}pt（推荐统一为 12pt/小四）`, "warn"]);
    }
    else if (fontSizeList.length === 2) {
        formatIssues.push([`字号差异: ${fontSizeList.join("pt、")}pt`, "warn"]);
    }
    else if (fontSizeList.length === 1) {
        formatIssues.push([`正文字号一致: ${fontSizeList[0]}pt`, "pass"]);
    }
    const headingParagraphs = paragraphs.filter((paragraph) => paragraph.is_heading || paragraph.style?.startsWith("Heading"));
    if (headingParagraphs.length > 0) {
        const headingFonts = [...new Set(headingParagraphs.flatMap((heading) => (heading.runs || []).map((run) => run.name).filter(Boolean)))];
        if (headingFonts.length > 2) {
            formatIssues.push([`标题字体不一致: ${headingFonts.join("、")}`, "warn"]);
        }
    }
    if (sections.length > 0) {
        const firstSection = sections[0];
        if (firstSection.margin_top_mm && Math.abs(firstSection.margin_top_mm - 25) > 5) {
            formatIssues.push([`页边距: 上${firstSection.margin_top_mm}mm（参考值 25mm）`, "warn"]);
        }
    }
    formatIssues.push([`检测 ${paragraphTotal} 个正文段落`, "pass"]);
    return formatIssues;
}
