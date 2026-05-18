/** ============================================================
 *  Cognitive Review Types — Review input/output contracts
 *
 *  Defines the structured interface between Claude Opus
 *  (architect), OpenAI (cognitive reviewer), and the freeze
 *  gate. The reviewer critiques but never rewrites architecture.
 *  ============================================================ */
export const DEFAULT_OPENAI_REVIEWER_CONFIG = {
    provider: "openai",
    model: "gpt-4.1-mini",
    endpoint: "",
    timeoutMs: 120000,
    maxRetries: 2,
    retryBackoffMs: 1000,
    fallbackPolicy: "BLOCK_FREEZE",
};
//# sourceMappingURL=review-types.js.map