/** ============================================================
 *  Cognitive Review — Structured architecture review logic.
 *
 *  Implements the Cognitive Reviewer role: identifies hidden
 *  assumptions, missing invariants, coupling risks, and other
 *  architecture issues without rewriting the architecture.
 *  ============================================================ */
import type { CognitiveReviewInput, CognitiveReviewOutput } from "./review-types.js";
export declare function performCognitiveReview(input: CognitiveReviewInput): CognitiveReviewOutput;
/**
 * Claude Opus arbitration of the review output.
 */
export declare function arbitrateReview(input: CognitiveReviewInput, reviewOutput: CognitiveReviewOutput, arbiterNotes?: string): {
    verdict: "APPROVE" | "APPROVE_WITH_CHANGES" | "REJECT";
    acceptedFindings: string[];
    rejectedFindings: string[];
    finalDecision: string;
};
//# sourceMappingURL=cognitive-review.d.ts.map