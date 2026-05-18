/**
 * ObjectGraph-backed table continuation detector.
 * Emits review detections only for ambiguous continuation edges. Confirmed
 * continuation edges remain graph evidence and do not become user-facing issues.
 */
import type { ObjectGraph } from "../../parser/object-graph/types.js";
import type { RuleDetection } from "../rule-types.js";
export declare const TABLE_CONTINUATION_RULE_ID = "TABLE_CONTINUATION_REVIEW";
export declare const TABLE_CONTINUATION_LABEL = "\u7EED\u8868\u5173\u7CFB\u786E\u8BA4";
export declare function detectTableContinuation(graph: ObjectGraph): RuleDetection[];
