/** ============================================================
 *  Cognitive Reviewer Provider — Interface & result types
 *
 *  Abstracts the external Cognitive Reviewer behind a common
 *  interface so the review pipeline can switch between OpenAI,
 *  mock, or future providers without code changes.
 *  ============================================================ */
import type { CognitiveReviewInput, CognitiveReviewInputV2, CognitiveReviewOutput, CognitiveReviewOutputV2, ProviderErrorCode } from "./review-types.js";
export interface CognitiveReviewerProvider {
    readonly name: string;
    review(input: CognitiveReviewInputV2): Promise<ProviderReviewResult>;
}
export interface ProviderReviewResult {
    output: CognitiveReviewOutputV2;
    providerName: string;
    modelUsed: string;
    fallbackUsed: boolean;
    latencyMs: number;
    /** Set when the provider encountered a specific error. */
    errorCode?: ProviderErrorCode;
    /** Truncated raw response text when JSON parsing failed. */
    rawResponseSummary?: string;
}
/** Fallback result returned when the provider cannot be reached. */
export declare function createFallbackResult(reason: string, modelUsed?: string, errorCode?: ProviderErrorCode, rawResponseSummary?: string): ProviderReviewResult;
export declare function v1InputToV2(input: CognitiveReviewInput): CognitiveReviewInputV2;
export declare function v2OutputToV1(v2: CognitiveReviewOutputV2): CognitiveReviewOutput;
//# sourceMappingURL=cognitive-reviewer-provider.d.ts.map