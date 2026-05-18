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
export declare function resolveLayoutThresholds(profile?: Pick<SchoolProfile, "rules_json" | "style_map"> | null): LayoutThresholds;
export declare function resolveBodyStyleThresholds(profile?: Pick<SchoolProfile, "rules_json" | "style_map"> | null): BodyStyleThresholds;
