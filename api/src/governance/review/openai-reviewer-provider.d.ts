/** ============================================================
 *  OpenAI Reviewer Provider — Real runtime call via fetch
 *
 *  Calls OpenAI /chat/completions for cognitive architecture
 *  review. No hardcoded API keys — reads from env.
 *
 *  Env vars:
 *    OPENAI_API_KEY   — required at runtime (missing → fallback)
 *    OPENAI_BASE_URL  — default https://api.openai.com/v1
 *    OPENAI_MODEL     — default gpt-4.1-mini (set in config)
 *
 *  Error types are discriminated for audit logging:
 *    MISSING_API_KEY, NETWORK_ERROR, TIMEOUT, INVALID_JSON,
 *    SCHEMA_VALIDATION_FAILED, PROVIDER_REJECTED
 *  ============================================================ */
import type { CognitiveReviewInputV2, OpenAIReviewerConfig } from "./review-types.js";
import type { CognitiveReviewerProvider, ProviderReviewResult } from "./cognitive-reviewer-provider.js";
export declare class OpenAIReviewerProvider implements CognitiveReviewerProvider {
    readonly name = "openai-reviewer";
    private config;
    constructor(config?: Partial<OpenAIReviewerConfig>);
    review(input: CognitiveReviewInputV2): Promise<ProviderReviewResult>;
    private resolveBaseUrl;
    private fetchWithRetry;
    private sleep;
    private buildReviewPrompt;
    private extractText;
    private parseJSONOutput;
    private ensureStringArray;
}
//# sourceMappingURL=openai-reviewer-provider.d.ts.map