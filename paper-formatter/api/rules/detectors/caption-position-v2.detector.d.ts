/**
 * ObjectGraph-backed caption-position detector v2.
 * It coexists with the legacy detector and is not registered in the current
 * format detector registry in PR #6. Inputs are L2 ObjectGraph nodes/edges.
 */
import type { ObjectGraph } from "../../parser/object-graph/types.js";
import type { RuleDetection } from "../rule-types.js";
export declare const FIGURE_CAPTION_POSITION_V2_RULE_ID = "CAPTION_POSITION_OBJECT_GRAPH_REVIEW";
export declare function detectCaptionPositionV2(graph: ObjectGraph): RuleDetection[];
