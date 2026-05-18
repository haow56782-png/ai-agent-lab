/** ============================================================
 *  Mock Reviewer Provider — Deterministic test double
 *
 *  Returns a predictable CognitiveReviewOutputV2 based on the
 *  input's architecture draft. Used for testing and development
 *  when no external API is available.
 *  ============================================================ */
export class MockReviewerProvider {
    name = "mock-reviewer";
    async review(input) {
        const startTime = Date.now();
        const output = this.generateOutput(input);
        return {
            output,
            providerName: this.name,
            modelUsed: "mock-model-v1",
            fallbackUsed: false,
            latencyMs: Date.now() - startTime,
        };
    }
    generateOutput(input) {
        const requiredChangesBeforeFreeze = [];
        const topRisks = [];
        // Check module boundaries
        if (input.architectureDraft.moduleBoundaries.length === 0) {
            requiredChangesBeforeFreeze.push("Define module boundaries");
            topRisks.push({
                id: "MOCK-001",
                description: "No module boundaries defined",
                severity: "HIGH",
            });
        }
        // Check interfaces
        if (input.architectureDraft.interfaces.length === 0) {
            requiredChangesBeforeFreeze.push("Define interfaces");
            topRisks.push({
                id: "MOCK-002",
                description: "No interfaces defined",
                severity: "HIGH",
            });
        }
        // Check acceptance criteria
        if (input.architectureDraft.acceptanceCriteria.length === 0) {
            requiredChangesBeforeFreeze.push("Define acceptance criteria");
            topRisks.push({
                id: "MOCK-003",
                description: "No acceptance criteria defined",
                severity: "MEDIUM",
            });
        }
        const verdict = requiredChangesBeforeFreeze.length > 0
            ? topRisks.some((r) => r.severity === "HIGH" || r.severity === "CRITICAL")
                ? "REJECT"
                : "APPROVE_WITH_CHANGES"
            : "APPROVE";
        return {
            verdict,
            topRisks,
            hiddenAssumptions: [],
            missingInterfaces: [],
            invariantGaps: [],
            couplingRisks: [],
            simplificationOpportunities: [],
            requiredChangesBeforeFreeze,
            optionalImprovements: [],
            finalRecommendation: requiredChangesBeforeFreeze.length > 0
                ? `Address ${requiredChangesBeforeFreeze.length} required change(s) before freeze`
                : "Architecture is ready for freeze",
            reviewerModel: "mock-model-v1",
            reviewedAt: new Date().toISOString(),
        };
    }
}
//# sourceMappingURL=mock-reviewer-provider.js.map