/**
 * Signal Output Contract — Unified, structured, auditable protocol
 * for all prediction / decision / simulation tool outputs.
 *
 * Every tool that produces a signal (prediction, decision, simulation)
 * MUST output this contract. This ensures:
 *   - Structured, machine-readable results
 *   - Consistent field naming across tools
 *   - Audit trail (timing, cost guard, reviewer requirements)
 *   - Eval stability — no reliance on natural-language keyword matching
 *
 * ============================================================
 *  P3.2 Signal Output Contract & Decision Evidence Protocol
 * ============================================================ */
export type SignalDomain = "prediction" | "decision" | "simulation";
export type SignalAction = "enter" | "wait" | "avoid" | "review" | "unknown";
export type SignalRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
export type SignalDirection = "up" | "down" | "neutral" | "unknown";
export interface SignalFactor {
    name: string;
    value: unknown;
    weight: number;
    explanation: string;
}
export interface SignalEvidence {
    key: string;
    value: unknown;
    source?: string;
    weight?: number;
}
export interface SignalOutcome {
    label: string;
    confidence: number;
    probability?: number;
    direction?: SignalDirection;
}
export interface SignalTiming {
    generated_at: string;
    valid_until?: string;
    time_horizon?: string;
}
export interface SignalRisk {
    risk_level: SignalRiskLevel;
    warnings: string[];
    failure_modes: string[];
}
export interface SignalDecision {
    recommendation: string;
    action: SignalAction;
    reason: string;
}
export interface SignalAudit {
    trace_id?: string;
    cost_guard_applied: boolean;
    reviewer_required: boolean;
}
export interface SignalOutputContract {
    signal_id: string;
    domain: SignalDomain;
    tool_name: string;
    outcome: SignalOutcome;
    evidence: SignalEvidence[];
    factors: SignalFactor[];
    timing: SignalTiming;
    risk: SignalRisk;
    decision: SignalDecision;
    audit: SignalAudit;
    /** Optional extended data — tool-specific fields NOT covered by the contract. */
    _raw?: Record<string, unknown>;
}
/**
 * Generate a deterministic-ish signal ID.
 * Format: SIG-{timestamp-hex}-{counter}
 */
export declare function generateSignalId(): string;
/**
 * Reset the signal ID counter (for testing).
 */
export declare function resetSignalIdCounter(): void;
/**
 * Validate a SignalOutputContract at runtime.
 * Returns an array of validation error messages (empty = valid).
 */
export declare function validateSignalContract(signal: SignalOutputContract | undefined | null): string[];
//# sourceMappingURL=signal-output-contract.d.ts.map