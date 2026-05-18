function normalizeEntries(profile) {
    return [
        ...(profile?.rules_json || []),
        ...(profile?.style_map || []),
    ];
}
function findNumeric(entries, patterns, fallback) {
    for (const entry of entries) {
        const haystack = JSON.stringify(entry || {});
        if (!patterns.some((pattern) => pattern.test(haystack)))
            continue;
        const direct = Number(entry?.value ?? entry?.target ?? entry?.expected ?? entry?.mm ?? entry?.pt ?? entry?.cm);
        if (Number.isFinite(direct) && direct > 0)
            return direct;
    }
    return fallback;
}
function findFontList(entries, fallback) {
    for (const entry of entries) {
        const haystack = JSON.stringify(entry || {});
        if (!/font|字体/i.test(haystack))
            continue;
        if (Array.isArray(entry?.allowedFonts) && entry.allowedFonts.length > 0)
            return entry.allowedFonts.map(String);
        if (Array.isArray(entry?.fonts) && entry.fonts.length > 0)
            return entry.fonts.map(String);
        if (typeof entry?.value === "string" && entry.value.trim())
            return entry.value.split(/[\/,，、]/).map((item) => item.trim()).filter(Boolean);
    }
    return fallback;
}
export function resolveLayoutThresholds(profile) {
    const entries = normalizeEntries(profile);
    return {
        marginTopMm: findNumeric(entries, [/margin_top|top_margin|上边距/i], 25),
        marginBottomMm: findNumeric(entries, [/margin_bottom|bottom_margin|下边距/i], 20),
        marginLeftMm: findNumeric(entries, [/margin_left|left_margin|左边距/i], 25),
        marginRightMm: findNumeric(entries, [/margin_right|right_margin|右边距/i], 20),
        gutterMm: findNumeric(entries, [/gutter|装订线/i], 0),
    };
}
export function resolveBodyStyleThresholds(profile) {
    const entries = normalizeEntries(profile);
    return {
        allowedFonts: findFontList(entries, ["宋体", "Times New Roman"]),
        lineSpacing: findNumeric(entries, [/line_spacing|行距/i], 1.5),
        firstLineIndentCm: findNumeric(entries, [/first_line|首行缩进/i], 0.74),
        headingBeforePt: findNumeric(entries, [/heading_before|段前24|标题段前/i], 24),
        headingAfterPt: findNumeric(entries, [/heading_after|段后18|标题段后/i], 18),
    };
}
