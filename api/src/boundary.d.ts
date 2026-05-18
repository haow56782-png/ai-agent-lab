/** ============================================================
 *  Execution Boundary Runtime Integration
 *
 *  Integrates E0–E3 boundary classification into the agent
 *  runtime. Classifies user requests at agent.run() entry,
 *  selects the appropriate model, and enforces the execution
 *  gate for E2/E3 when Opus is not available.
 *  ============================================================ */
import { ExecutionBoundary } from "./governance/review/external-review-policy.js";
export interface BoundaryDecision {
    boundary: ExecutionBoundary;
    recommendedExecutor: string;
    requiresPlan: boolean;
    requiresArbitration: boolean;
    modelName: string;
    description: string;
}
/**
 * Classify a user request into an execution boundary decision.
 *
 * Uses keyword heuristics to map the input to trigger categories,
 * then delegates to classifyExecutionBoundary() for the final
 * boundary level. Unknown requests default to E0 (implementation).
 */
export declare function classifyTask(input: string): BoundaryDecision;
/**
 * Select model name based on execution boundary.
 *
 * E0/E1 → DeepSeek (default model, no override needed)
 * E2/E3 → Opus (requires opusModel to be configured)
 *
 * Returns the model name string. The caller decides what to do
 * if opusModel is not set for E2/E3 (use DeepSeek or block).
 */
export declare function selectModel(boundary: ExecutionBoundary, opusModel?: string): string;
/**
 * Whether the agent should gate execution for this boundary
 * when Opus is not available.
 */
export declare function boundaryRequiresOpus(boundary: ExecutionBoundary): boolean;
export declare const BOUNDARY_ENFORCEMENT_MESSAGE: string;
//# sourceMappingURL=boundary.d.ts.map