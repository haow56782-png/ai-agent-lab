/** ============================================================
 *  Cognitive Reviewer Provider — Interface & result types
 *
 *  Abstracts the external Cognitive Reviewer behind a common
 *  interface so the review pipeline can switch between OpenAI,
 *  mock, or future providers without code changes.
 *  ============================================================ */
/** Fallback result returned when the provider cannot be reached. */
export function createFallbackResult(reason, modelUsed = "fallback", errorCode, rawResponseSummary) {
    return {
        output: {
            verdict: "APPROVE_WITH_CHANGES",
            topRisks: [
                {
                    id: "FALLBACK-001",
                    description: `OpenAI reviewer unavailable: ${reason}. Review deferred to Opus arbitration.`,
                    severity: "MEDIUM",
                },
            ],
            hiddenAssumptions: ["OpenAI cognitive review was not performed"],
            missingInterfaces: [],
            invariantGaps: [],
            couplingRisks: [],
            simplificationOpportunities: [],
            requiredChangesBeforeFreeze: ["OpenAI review not completed — verify architecture manually"],
            optionalImprovements: [],
            finalRecommendation: "OpenAI reviewer unavailable. Manual Opus arbitration required.",
            reviewerModel: modelUsed,
            reviewedAt: new Date().toISOString(),
        },
        providerName: "openai",
        modelUsed,
        fallbackUsed: true,
        latencyMs: 0,
        errorCode,
        rawResponseSummary,
    };
}
/* ── V1 ↔ V2 mapping helpers ───────────────────────────── */
export function v1InputToV2(input) {
    return {
        architectureDraft: {
            adrId: input.architectureDraft.adrId,
            title: input.architectureDraft.title,
            context: input.architectureDraft.context,
            decision: input.architectureDraft.decision,
            moduleBoundaries: input.architectureDraft.moduleBoundaries,
            interfaces: input.architectureDraft.interfaces,
            invariants: input.architectureDraft.invariants,
            acceptanceCriteria: input.architectureDraft.acceptanceCriteria,
        },
        existingMilestones: input.existingMilestones,
        systemInvariants: input.systemInvariants,
        evalBaseline: {
            testCount: input.evalBaseline.testCount,
            evalScenarioCount: input.evalBaseline.evalCount,
            typecheckStatus: "UNKNOWN",
        },
        routingContext: {
            primaryArchitect: "claude-opus",
            executionChain: ["deepseek-v4-pro", "deepseek-v4-flash"],
            reviewPurpose: "FREEZE_GATE",
        },
    };
}
export function v2OutputToV1(v2) {
    const severityMap = {
        CRITICAL: "critical",
        HIGH: "high",
        MEDIUM: "medium",
        LOW: "low",
    };
    return {
        verdict: v2.verdict,
        topRisks: v2.topRisks.map((r) => ({
            dimension: "hidden_assumptions",
            severity: severityMap[r.severity] ?? "medium",
            description: r.description,
            location: "architecture",
            recommendation: r.description,
        })),
        hiddenAssumptions: v2.hiddenAssumptions,
        missingInterfaces: v2.missingInterfaces,
        invariantGaps: v2.invariantGaps,
        couplingRisks: v2.couplingRisks,
        simplifications: v2.simplificationOpportunities,
        requiredChanges: v2.requiredChangesBeforeFreeze,
        optionalImprovements: v2.optionalImprovements,
        finalRecommendation: v2.finalRecommendation,
        reviewer: "openai",
        reviewedAt: v2.reviewedAt,
    };
}
//# sourceMappingURL=cognitive-reviewer-provider.js.map