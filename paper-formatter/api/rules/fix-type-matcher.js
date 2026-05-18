import { ruleMatchesFixType } from "./rule-fix-map.js";
const FINDING_MATCHERS = {
    margin: /页边距|版芯|margin|正文/i,
    body_style: /正文|字体|行距|body|上下标|subscript|superscript/i,
    heading: /标题|题名|章节|heading/i,
    page_number: /页码|目录|page/i,
    cover: /封面|声明|题名页|cover/i,
    toc: /目录|页码|toc/i,
    abstract_format: /摘要|关键词|abstract/i,
    cross_ref: /交叉引用|引用|cross/i,
    caption: /图表|题注|caption|编号|图题|表题|continuity/i,
    reference_format: /参考文献|著录|reference|DOI/i,
    table_format: /表格|三线表|table/i,
    image_format: /图片|图题|image|印章|水印|shape|覆盖正文|floating/i,
    punctuation: /标点|punctuation/i,
};
const FORMATTER_MATCHERS = {
    margin: /margin|page_margin|页边距|版芯/i,
    body_style: /body|font|正文|字体/i,
    heading: /heading|headings|标题|题名/i,
    page_number: /page_number|页码/i,
    toc: /toc|目录/i,
    image_format: /image|floating|seal|watermark|shape|印章|水印/i,
};
export function matchFindingForFixType(fixType, findings, index) {
    if (findings.length === 0)
        return null;
    const mapped = findings.find((finding) => ruleMatchesFixType(finding.rule_id, fixType));
    if (mapped)
        return mapped;
    const matcher = FINDING_MATCHERS[fixType];
    const matched = matcher
        ? findings.find((finding) => matcher.test(`${finding.rule_group || ""} ${finding.rule_id} ${finding.rule_snapshot.rule_text} ${finding.rule_snapshot.rule_description || ""}`))
        : null;
    return matched ?? findings[index % findings.length] ?? null;
}
export function matchFormatterFindingIdForFixType(formatterDiff, fixType, index) {
    const diffs = Array.isArray(formatterDiff?.diffs) ? formatterDiff.diffs : [];
    if (diffs.length === 0)
        return undefined;
    const mapped = diffs.find((diff) => diff?.finding_id && ruleMatchesFixType(diff?.rule_id, fixType));
    if (mapped?.finding_id)
        return mapped.finding_id;
    const matcher = FORMATTER_MATCHERS[fixType];
    const matched = matcher
        ? diffs.find((diff) => diff?.finding_id && matcher.test(`${diff.element || ""} ${diff.position || ""} ${diff.note || ""}`))
        : null;
    return matched?.finding_id
        || diffs.find((diff) => diff?.finding_id)?.finding_id
        || diffs[index % diffs.length]?.finding_id;
}
