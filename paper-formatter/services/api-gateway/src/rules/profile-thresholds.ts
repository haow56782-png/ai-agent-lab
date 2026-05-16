import type { SchoolProfile } from "../repositories/profiles.js";

export interface LayoutThresholds {
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  gutterMm: number;
}

export interface BodyStyleThresholds {
  allowedFonts: string[];
  lineSpacing: number;
  firstLineIndentCm: number;
  headingBeforePt: number;
  headingAfterPt: number;
}

function normalizeEntries(profile: Pick<SchoolProfile, "rules_json" | "style_map"> | undefined | null): any[] {
  return [
    ...((profile?.rules_json || []) as any[]),
    ...((profile?.style_map || []) as any[]),
  ];
}

function findNumeric(entries: any[], patterns: RegExp[], fallback: number): number {
  for (const entry of entries) {
    const haystack = JSON.stringify(entry || {});
    if (!patterns.some((pattern) => pattern.test(haystack))) continue;
    const direct =
      Number(entry?.value ?? entry?.target ?? entry?.expected ?? entry?.mm ?? entry?.pt ?? entry?.cm);
    if (Number.isFinite(direct) && direct > 0) return direct;
  }
  return fallback;
}

function findFontList(entries: any[], fallback: string[]): string[] {
  for (const entry of entries) {
    const haystack = JSON.stringify(entry || {});
    if (!/font|字体/i.test(haystack)) continue;
    if (Array.isArray(entry?.allowedFonts) && entry.allowedFonts.length > 0) return entry.allowedFonts.map(String);
    if (Array.isArray(entry?.fonts) && entry.fonts.length > 0) return entry.fonts.map(String);
    if (typeof entry?.value === "string" && entry.value.trim()) return entry.value.split(/[\/,，、]/).map((item: string) => item.trim()).filter(Boolean);
  }
  return fallback;
}

export function resolveLayoutThresholds(profile?: Pick<SchoolProfile, "rules_json" | "style_map"> | null): LayoutThresholds {
  const entries = normalizeEntries(profile);
  return {
    marginTopMm: findNumeric(entries, [/margin_top|top_margin|上边距/i], 25),
    marginBottomMm: findNumeric(entries, [/margin_bottom|bottom_margin|下边距/i], 20),
    marginLeftMm: findNumeric(entries, [/margin_left|left_margin|左边距/i], 25),
    marginRightMm: findNumeric(entries, [/margin_right|right_margin|右边距/i], 20),
    gutterMm: findNumeric(entries, [/gutter|装订线/i], 0),
  };
}

export function resolveBodyStyleThresholds(profile?: Pick<SchoolProfile, "rules_json" | "style_map"> | null): BodyStyleThresholds {
  const entries = normalizeEntries(profile);
  return {
    allowedFonts: findFontList(entries, ["宋体", "Times New Roman"]),
    lineSpacing: findNumeric(entries, [/line_spacing|行距/i], 1.5),
    firstLineIndentCm: findNumeric(entries, [/first_line|首行缩进/i], 0.74),
    headingBeforePt: findNumeric(entries, [/heading_before|段前24|标题段前/i], 24),
    headingAfterPt: findNumeric(entries, [/heading_after|段后18|标题段后/i], 18),
  };
}
