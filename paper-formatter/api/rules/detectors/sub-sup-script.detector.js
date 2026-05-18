export const SUB_SUP_SCRIPT_RULE_ID = "SUB_SUP_SCRIPT_REVIEW";
export const SUB_SUP_SCRIPT_LABEL = "上下标格式检查";
/**
 * Chemical elements that commonly appear with subscript numbers
 * in academic papers (chemical formulas, compounds, ions).
 */
const CHEMICAL_ELEMENTS = new Set([
    "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
    "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca",
    "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
    "Ga", "Ge", "As", "Se", "Br", "Kr", "Rb", "Sr", "Y", "Zr",
    "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn",
    "Sb", "Te", "I", "Xe", "Cs", "Ba", "La", "Ce", "Pr", "Nd",
    "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb",
    "Lu", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg",
    "Tl", "Pb", "Bi", "Po", "At", "Rn", "Fr", "Ra", "Ac", "Th",
    "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm",
    "Md", "No", "Lr", "Rf", "Db", "Sg", "Bh", "Hs", "Mt",
]);
/** Units where the trailing digit should be superscript (area/volume). */
const UNIT_SUPERSCRIPT_PATTERN = /\b(m|cm|mm|km|dm|μm|nm)([²³23])\b/;
/** Citation marker pattern: [1], [2,3], [1-3] in body text. */
const CITATION_PATTERN = /\[\d+(?:[,，\-–—]\s*\d+)*\]/;
/** Chemical element + number pattern: e.g. H2O, Fe3O4, CO2. */
/**
 * Match element symbol + digits (e.g. H2, O2, Fe3).
 * No leading \b because in compound formulas adjacent elements share boundaries.
 * (?![a-z]) prevents matching abbreviations where lowercase follows the digit.
 * Element must be in CHEMICAL_ELEMENTS to avoid false positives on model numbers.
 */
const ELEMENT_NUMBER_PATTERN = /([A-Z][a-z]?)(\d+)(?![a-z])/g;
function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}
/**
 * Build a flat array of {text, subscript, superscript} from paragraph runs,
 * so we can detect formatting gaps at token boundaries.
 */
function buildRunSequence(paragraph) {
    const runs = [];
    for (const run of paragraph.runs || []) {
        const text = String(run?.text || "").trim();
        if (!text)
            continue;
        runs.push({
            text,
            subscript: Boolean(run?.subscript),
            superscript: Boolean(run?.superscript),
            name: String(run?.name || ""),
            size_pt: Number(run?.size_pt || 12),
        });
    }
    return runs;
}
function createSubSupDetection(input) {
    return {
        ruleId: input.ruleId,
        label: input.label,
        group: "样式",
        severity: input.severity,
        confidence: 0.82,
        page: Math.max(1, Math.floor(input.paragraphIndex / 8) + 1),
        snippet: input.snippet,
        evidence: {
            paragraphIndex: input.paragraphIndex,
        },
        suggestion: {
            type: "restructure",
            before: input.snippet,
            after: input.isMissingSubscript
                ? "将化学式中的数字设为下标（如 H₂O、CO₂）"
                : input.isMissingSuperscript
                    ? "将上标数字设为上标格式（如 m²、[¹]）"
                    : "核查该处上下标格式是否符合学术规范",
            explanation: input.explanation,
        },
    };
}
/**
 * Detect chemical element+number patterns where the number is NOT subscript.
 * Example: "H2O" → should be H₂O, "CO2" → should be CO₂.
 */
function detectMissingChemicalSubscripts(paragraphs, headingIndices) {
    const detections = [];
    for (const paragraph of paragraphs) {
        if (headingIndices.has(paragraph.index ?? paragraph.paragraphIndex))
            continue;
        const paraText = cleanText(paragraph.text);
        if (!paraText || paraText.length < 3)
            continue;
        const runs = buildRunSequence(paragraph);
        if (runs.length === 0)
            continue;
        // Strategy: when the entire paragraph is a single run, check the text holistically
        // for known chemical element-number patterns. Require at least 1 known-element match
        // to avoid false positives on model numbers / version strings.
        // When there are multiple runs, check if digits adjacent to element symbols
        // are in the same run without subscript.
        if (runs.length === 1) {
            const run = runs[0];
            const matches = [...run.text.matchAll(ELEMENT_NUMBER_PATTERN)];
            const knownElementMatches = matches.filter((m) => CHEMICAL_ELEMENTS.has(m[1]));
            if (knownElementMatches.length >= 1 && !run.subscript) {
                detections.push(createSubSupDetection({
                    ruleId: SUB_SUP_SCRIPT_RULE_ID,
                    label: "化学式缺少下标格式",
                    severity: "P1",
                    snippet: paraText.slice(0, 180),
                    explanation: `检测到 ${knownElementMatches.length} 处化学元素+数字模式（如 ${knownElementMatches[0]?.[0] || paraText.match(ELEMENT_NUMBER_PATTERN)?.[0] || "元素+数字"}），但该段落未设置下标格式。化学式中的数字应为下标（如 H₂O、CO₂）。`,
                    paragraphIndex: paragraph.index ?? 0,
                    runIndex: 0,
                    isMissingSubscript: true,
                }));
            }
            continue;
        }
        // Multiple runs: check each run individually
        for (let ri = 0; ri < runs.length; ri++) {
            const run = runs[ri];
            const matches = [...run.text.matchAll(ELEMENT_NUMBER_PATTERN)];
            if (matches.length > 0 && !run.subscript) {
                // Check if this is a plausible chemical formula (has element symbols nearby)
                // rather than just a random number after a capital letter
                const hasKnownElement = matches.some((m) => CHEMICAL_ELEMENTS.has(m[1]));
                if (hasKnownElement) {
                    detections.push(createSubSupDetection({
                        ruleId: SUB_SUP_SCRIPT_RULE_ID,
                        label: "化学式缺少下标格式",
                        severity: "P1",
                        snippet: run.text.slice(0, 180),
                        explanation: `检测到 "${run.text.slice(0, 40)}" 中的数字可能为化学下标，但未设置下标格式。化学式中的数字应为下标。`,
                        paragraphIndex: paragraph.index ?? 0,
                        runIndex: ri,
                        isMissingSubscript: true,
                    }));
                }
            }
        }
    }
    return detections;
}
/**
 * Detect area/volume unit patterns where the trailing digit should be superscript.
 * Example: "m2" → should be m², "cm3" → should be cm³.
 */
function detectMissingUnitSuperscripts(paragraphs, headingIndices) {
    const detections = [];
    for (const paragraph of paragraphs) {
        if (headingIndices.has(paragraph.index ?? paragraph.paragraphIndex))
            continue;
        const paraText = cleanText(paragraph.text);
        if (!paraText || paraText.length < 3)
            continue;
        const runs = buildRunSequence(paragraph);
        if (runs.length === 0)
            continue;
        for (let ri = 0; ri < runs.length; ri++) {
            const run = runs[ri];
            if (run.superscript)
                continue; // Already superscript, skip
            const match = run.text.match(UNIT_SUPERSCRIPT_PATTERN);
            if (match && !run.subscript) {
                const unit = match[1];
                const digit = match[2];
                // m2, m3, cm2, cm3 etc. in body text should be superscripted
                detections.push(createSubSupDetection({
                    ruleId: SUB_SUP_SCRIPT_RULE_ID,
                    label: "单位面积/体积缺少上标",
                    severity: "P1",
                    snippet: run.text.slice(0, 180),
                    explanation: `检测到 "${unit}${digit}"，面积/体积单位中的数字应为上标（如 m²、cm³）。`,
                    paragraphIndex: paragraph.index ?? 0,
                    runIndex: ri,
                    isMissingSuperscript: true,
                }));
            }
        }
    }
    return detections;
}
/**
 * Detect citation markers in body text that are not superscripted.
 * Example: "[1]" in "xxx的研究[1]表明" should be superscript.
 */
function detectCitationNotSuperscript(paragraphs, headingIndices, referenceIndices) {
    const detections = [];
    for (const paragraph of paragraphs) {
        const pIdx = paragraph.index ?? paragraph.paragraphIndex ?? 0;
        if (headingIndices.has(pIdx))
            continue;
        if (referenceIndices.has(pIdx))
            continue; // Skip reference section itself
        const runs = buildRunSequence(paragraph);
        if (runs.length === 0)
            continue;
        for (let ri = 0; ri < runs.length; ri++) {
            const run = runs[ri];
            if (run.superscript)
                continue;
            const match = run.text.match(CITATION_PATTERN);
            if (match) {
                // Make sure it's not just a standalone bracket number like "(1)"
                // but actually a citation marker [1] within body text
                const before = ri > 0 ? runs[ri - 1] : null;
                const after = ri < runs.length - 1 ? runs[ri + 1] : null;
                const hasContextBefore = before?.text && before.text.length > 0;
                const hasContextAfter = after?.text && after.text.length > 0;
                if (hasContextBefore || hasContextAfter) {
                    detections.push(createSubSupDetection({
                        ruleId: SUB_SUP_SCRIPT_RULE_ID,
                        label: "参考文献引用未设置上标",
                        severity: "P1",
                        snippet: `...${(before?.text ?? "").slice(-20)}${match[0]}${(after?.text ?? "").slice(0, 20)}...`.slice(0, 180),
                        explanation: `检测到正文引用标记 "${match[0]}"，参考文献引用应为上标格式。`,
                        paragraphIndex: pIdx,
                        runIndex: ri,
                        isMissingSuperscript: true,
                    }));
                }
            }
        }
    }
    return detections;
}
/**
 * Main detector for subscript/superscript formatting issues.
 *
 * Checks body paragraphs for:
 * 1. Chemical formulas with missing subscript (e.g. H2O → should be H₂O)
 * 2. Area/volume units with missing superscript (e.g. m2 → should be m²)
 * 3. Citation markers without superscript (e.g. [1] → should be ¹)
 */
export function detectSubSupScript(ctx) {
    const paragraphs = ctx.paragraphs || [];
    if (paragraphs.length === 0)
        return [];
    const headingIndices = new Set((ctx.headings || [])
        .map((h) => h.index ?? h.paragraphIndex)
        .filter((v) => typeof v === "number"));
    const referenceIndices = new Set((ctx.structureItems || [])
        .filter((s) => s.type === "reference_entry" || s.type === "references_header")
        .map((s) => s.index)
        .filter(Boolean));
    return [
        ...detectMissingChemicalSubscripts(paragraphs, headingIndices),
        ...detectMissingUnitSuperscripts(paragraphs, headingIndices),
        ...detectCitationNotSuperscript(paragraphs, headingIndices, referenceIndices),
    ];
}
export const subSupScriptDetector = {
    ruleId: SUB_SUP_SCRIPT_RULE_ID,
    label: SUB_SUP_SCRIPT_LABEL,
    group: "样式",
    severity: "P1",
    detect: detectSubSupScript,
};
