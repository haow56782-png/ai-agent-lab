import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
export declare const FIGURE_DIRECTORY_RULE_ID = "FIGURE_DIRECTORY_REVIEW";
export declare const FIGURE_DIRECTORY_LABEL = "\u56FE\u76EE\u5F55";
export declare function detectFigureDirectoryReview(ctx: ParsedDocumentContext): RuleDetection[];
export declare const figureDirectoryDetector: FormatRuleDetector;
