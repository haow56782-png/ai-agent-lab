/** ============================================================
 *  Review Runner — Orchestrates the full review pipeline.
 *
 *  Pipeline:
 *    0. Governance Memory Replay (optional — pre-flight check)
 *    1. Cognitive Review (via injected provider or internal)
 *    2. Claude Opus Arbitration
 *    3. Freeze decision
 *    4. Governance Memory persistence (optional)
 *
 *  Supports provider injection so the pipeline can use OpenAI,
 *  mock, or future reviewers without code changes.
 *
 *  NOTE: This file must NEVER read API keys or secrets.
 *  ============================================================ */
import type { CognitiveReviewInput, CognitiveReviewOutput, RoutingDecisionLog } from "./review-types.js";
import { type FreezeValidationResult } from "../freeze-gate/freeze-validator.js";
import { type FreezeGateEntry } from "../freeze-gate/freeze-state-machine.js";
import type { CognitiveReviewerProvider, ProviderReviewResult } from "./cognitive-reviewer-provider.js";
import type { GovernanceMemoryStore, GovernanceMemoryEntry, FreezeSnapshot, GovernanceProposalCheck } from "../memory/governance-memory.js";
import { type TriggerCategory } from "./external-review-policy.js";
import { GovernanceCostGuard, type CostGuardConfig, type CostGuardResult } from "../memory/governance-cost-guard.js";
export interface ReviewPipelineInput {
    architectureDraft: CognitiveReviewInput;
    existingMilestones: string[];
    systemInvariants: string[];
    evalBaseline: {
        testCount: number;
        evalCount: number;
    };
    actor: string;
    /** Optional task ID to include in routing audit log. */
    taskId?: string;
    /** Governance memory store for pre-flight replay checks and post-review persistence. */
    governanceMemory?: GovernanceMemoryStore;
    /** Enable pre-flight governance replay checks (default: false). */
    enableGovernanceReplay?: boolean;
    /** List of invariants touched by this proposal (for governance tracking). */
    invariantsTouched?: string[];
    /** Freeze version label (used when creating freeze snapshots). */
    freezeVersion?: string;
    /** Whether this proposal requires freeze gate (set by pre-flight replay). */
    requiresFreezeGateOverride?: boolean;
    /** Governance cost guard instance (injected). */
    costGuard?: GovernanceCostGuard;
    /** Cost guard configuration (enabled by default). */
    costGuardConfig?: CostGuardConfig;
    /** Trigger categories for local review level classification. */
    triggerCategories?: TriggerCategory[];
}
export interface ReviewPipelineResult {
    freezeEntry: FreezeGateEntry;
    reviewOutput: CognitiveReviewOutput;
    arbitrationResult: {
        verdict: "APPROVE" | "APPROVE_WITH_CHANGES" | "REJECT";
        acceptedFindings: string[];
        rejectedFindings: string[];
        finalDecision: string;
    };
    freezeValidation: FreezeValidationResult;
    passed: boolean;
    summary: string;
    /** Present when an external provider was used. */
    providerResult?: ProviderReviewResult;
    /** Routing audit log entry generated for this pipeline run. */
    routingDecision?: RoutingDecisionLog;
    /** Governance memory entry created after review (if governanceMemory was provided). */
    governanceMemoryEntry?: GovernanceMemoryEntry;
    /** Freeze snapshot created on FROZEN (if governanceMemory was provided). */
    freezeSnapshot?: FreezeSnapshot;
    /** Pre-flight governance replay result (if enableGovernanceReplay was true). */
    governanceReplay?: GovernanceProposalCheck;
    /** Whether freeze gate is required due to constitutional invariant violation. */
    requiresFreezeGate?: boolean;
    /** Governance memory entry ID for audit linking. */
    governanceEntryId?: string;
    /** Cost guard evaluation result (if cost guard was enabled). */
    costGuardResult?: CostGuardResult;
}
export declare function runReviewPipeline(input: ReviewPipelineInput, reviewProvider?: CognitiveReviewerProvider): Promise<ReviewPipelineResult>;
//# sourceMappingURL=review-runner.d.ts.map