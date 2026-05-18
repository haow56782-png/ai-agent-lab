/**
 * ObjectGraph invariant lint for PR #8.
 * This module validates graph-level structure after builder output without
 * throwing. Violations are returned as warning objects so downstream detectors
 * can decide whether to downgrade, ignore, or surface them.
 */
import type { ObjectGraph, ObjectGraphWarning } from "./types.js";
type ObjectGraphLintInput = Pick<ObjectGraph, "nodes" | "edges">;
export declare function lintObjectGraphInvariants(graph: ObjectGraphLintInput): ObjectGraphWarning[];
export {};
