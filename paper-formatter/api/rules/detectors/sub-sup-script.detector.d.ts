import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
export declare const SUB_SUP_SCRIPT_RULE_ID = "SUB_SUP_SCRIPT_REVIEW";
export declare const SUB_SUP_SCRIPT_LABEL = "\u4E0A\u4E0B\u6807\u683C\u5F0F\u68C0\u67E5";
/**
 * Main detector for subscript/superscript formatting issues.
 *
 * Checks body paragraphs for:
 * 1. Chemical formulas with missing subscript (e.g. H2O → should be H₂O)
 * 2. Area/volume units with missing superscript (e.g. m2 → should be m²)
 * 3. Citation markers without superscript (e.g. [1] → should be ¹)
 */
export declare function detectSubSupScript(ctx: ParsedDocumentContext): RuleDetection[];
export declare const subSupScriptDetector: FormatRuleDetector;
