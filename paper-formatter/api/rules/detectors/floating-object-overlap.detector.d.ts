import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
export declare const FLOATING_OBJECT_OVERLAP_RULE_ID = "FLOATING_OBJECT_OVERLAP_TEXT";
export declare const FLOATING_OBJECT_OVERLAP_LABEL = "\u56FE\u7247/\u5370\u7AE0\u8986\u76D6\u6B63\u6587";
export declare const FLOATING_OBJECT_OVERLAP_DESCRIPTION = "\u7CFB\u7EDF\u53D1\u73B0\u9875\u9762\u4E2D\u7684\u56FE\u7247\u3001\u5370\u7AE0\u6216\u6D6E\u52A8\u5BF9\u8C61\u4E0E\u6B63\u6587\u6587\u5B57\u53D1\u751F\u91CD\u53E0\uFF0C\u5F71\u54CD\u6B63\u6587\u9605\u8BFB\u548C\u8BBA\u6587\u7248\u5F0F\u89C4\u8303\u3002";
export interface ParserImageMeta {
    paragraph_index?: number;
    paragraph_text?: string;
    width_pt?: number;
    height_pt?: number;
    object_type?: string;
    wrap_type?: string;
    behind_text?: boolean;
    allow_overlap?: boolean;
    name?: string;
    description?: string;
    is_watermark_like?: boolean;
    overlap_risk?: boolean;
}
export declare function detectFloatingObjectOverlap(ctx: ParsedDocumentContext): RuleDetection[];
export declare const floatingObjectOverlapDetector: FormatRuleDetector;
