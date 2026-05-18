/** ============================================================
 *  Architecture Governance Layer — Entry Point
 *
 *  Provides:
 *    - ADR creation, storage, lifecycle management
 *    - Architecture Freeze Gate (DRAFT → FROZEN → THAWED)
 *    - Cognitive Review pipeline (OpenAI review → Opus arbitration)
 *    - Diff validation (interface, schema, invariant drift detection)
 *    - Audit logging (routing decisions, governance events)
 *  ============================================================ */
// ADR
export { buildAdr, finalizeAdr, supersedeAdr } from "./adr/adr-builder.js";
export { InMemoryAdrStore } from "./adr/adr-store.js";
// Freeze Gate
export { createFreezeEntry, transitionFreeze, getFreezeStatus } from "./freeze-gate/freeze-state-machine.js";
export { validateFreezeConditions } from "./freeze-gate/freeze-validator.js";
export { initiateThaw, canThawWithoutReview, generateThawReport } from "./freeze-gate/thaw-protocol.js";
export { FREEZE_TRANSITIONS } from "./freeze-gate/types.js";
// Review
export { performCognitiveReview, arbitrateReview } from "./review/cognitive-review.js";
export { runReviewPipeline } from "./review/review-runner.js";
export { DEFAULT_OPENAI_REVIEWER_CONFIG } from "./review/review-types.js";
export { createFallbackResult, v1InputToV2, v2OutputToV1 } from "./review/cognitive-reviewer-provider.js";
export { OpenAIReviewerProvider } from "./review/openai-reviewer-provider.js";
export { MockReviewerProvider } from "./review/mock-reviewer-provider.js";
// Diff
export { diffInterfaces, mergeInterfaceReports } from "./diff/interface-diff.js";
export { diffSchemas } from "./diff/schema-diff.js";
export { checkSystemInvariants, getStandardInvariants, summarizeInvariantChecks } from "./diff/invariant-check.js";
// External Review Policy
export { ReviewLevel, ExecutionBoundary, evaluateTrigger, getReviewLevel, shouldRequireExternalReview, shouldEscalateToFreezeGate, getRequiredReviewerModel, evaluateRoutingDrift, classifyExecutionBoundary, boundaryRequiresPlan, boundaryRequiresArbitration, getRecommendedExecutor, describeExecutionBoundary } from "./review/external-review-policy.js";
export { TRIGGER_LEVELS, TRIGGER_DESCRIPTIONS, REVIEWER_MODEL_POLICY, SEMANTIC_BOUNDARY_MAP } from "./review/external-review-policy.js";
// Audit
export { RoutingLog } from "./audit/routing-log.js";
export { GovernanceEventStore } from "./audit/governance-events.js";
// Governance Memory — P3.0 Architecture Memory & Governance Persistence
export { InMemoryAdrStore as CognitiveAdrStore } from "./memory/adr-store.js";
export { InvariantRegistry } from "./memory/invariant-registry.js";
export { GovernanceMemoryStore } from "./memory/governance-memory.js";
export { GovernanceIndex } from "./memory/governance-index.js";
export { replayGovernanceDecision, replayFreezeLineage, detectHistoricalInvariantViolation, detectAuthorityDrift, detectRoutingDrift, detectGovernanceRuntimeLeakage } from "./memory/drift-replay.js";
export { computeDecisionHash } from "./memory/governance-memory-utils.js";
export { GovernanceCostGuard } from "./memory/governance-cost-guard.js";
//# sourceMappingURL=index.js.map