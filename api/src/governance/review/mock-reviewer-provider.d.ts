/** ============================================================
 *  Mock Reviewer Provider — Deterministic test double
 *
 *  Returns a predictable CognitiveReviewOutputV2 based on the
 *  input's architecture draft. Used for testing and development
 *  when no external API is available.
 *  ============================================================ */
import type { CognitiveReviewInputV2 } from "./review-types.js";
import type { CognitiveReviewerProvider, ProviderReviewResult } from "./cognitive-reviewer-provider.js";
export declare class MockReviewerProvider implements CognitiveReviewerProvider {
    readonly name = "mock-reviewer";
    review(input: CognitiveReviewInputV2): Promise<ProviderReviewResult>;
    private generateOutput;
}
//# sourceMappingURL=mock-reviewer-provider.d.ts.map