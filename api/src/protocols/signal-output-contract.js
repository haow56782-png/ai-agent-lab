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
/* ── Helpers ─────────────────────────────────────────────── */
let _signalIdCounter = 0;
/**
 * Generate a deterministic-ish signal ID.
 * Format: SIG-{timestamp-hex}-{counter}
 */
export function generateSignalId() {
    _signalIdCounter++;
    const ts = Date.now().toString(16).slice(-6);
    return `SIG-${ts}-${String(_signalIdCounter).padStart(4, "0")}`;
}
/**
 * Reset the signal ID counter (for testing).
 */
export function resetSignalIdCounter() {
    _signalIdCounter = 0;
}
/**
 * Validate a SignalOutputContract at runtime.
 * Returns an array of validation error messages (empty = valid).
 */
export function validateSignalContract(signal) {
    const errors = [];
    if (!signal || typeof signal !== "object") {
        errors.push("signal is required and must be an object");
        return errors;
    }
    // signal_id
    if (!signal.signal_id || typeof signal.signal_id !== "string") {
        errors.push("signal_id is required and must be a string");
    }
    // domain
    const validDomains = ["prediction", "decision", "simulation"];
    if (!validDomains.includes(signal.domain)) {
        errors.push(`domain must be one of: ${validDomains.join(", ")}`);
    }
    // tool_name
    if (!signal.tool_name || typeof signal.tool_name !== "string") {
        errors.push("tool_name is required and must be a string");
    }
    // outcome
    if (!signal.outcome) {
        errors.push("outcome is required");
    }
    else {
        if (!signal.outcome.label)
            errors.push("outcome.label is required");
        if (typeof signal.outcome.confidence !== "number") {
            errors.push("outcome.confidence must be a number");
        }
        else if (signal.outcome.confidence < 0 || signal.outcome.confidence > 1) {
            errors.push("outcome.confidence must be between 0 and 1");
        }
    }
    // timing
    if (!signal.timing) {
        errors.push("timing is required");
    }
    else {
        if (!signal.timing.generated_at) {
            errors.push("timing.generated_at is required");
        }
        else if (isNaN(Date.parse(signal.timing.generated_at))) {
            errors.push("timing.generated_at must be a valid ISO-8601 timestamp");
        }
    }
    // risk
    if (!signal.risk) {
        errors.push("risk is required");
    }
    else {
        const validRiskLevels = ["LOW", "MEDIUM", "HIGH", "EXTREME"];
        if (!validRiskLevels.includes(signal.risk.risk_level)) {
            errors.push(`risk.risk_level must be one of: ${validRiskLevels.join(", ")}`);
        }
    }
    // decision
    if (!signal.decision) {
        errors.push("decision is required");
    }
    else {
        const validActions = ["enter", "wait", "avoid", "review", "unknown"];
        if (!validActions.includes(signal.decision.action)) {
            errors.push(`decision.action must be one of: ${validActions.join(", ")}`);
        }
        if (!signal.decision.recommendation)
            errors.push("decision.recommendation is required");
        if (!signal.decision.reason)
            errors.push("decision.reason is required");
    }
    // audit
    if (!signal.audit) {
        errors.push("audit is required");
    }
    else {
        if (typeof signal.audit.cost_guard_applied !== "boolean") {
            errors.push("audit.cost_guard_applied must be a boolean");
        }
        if (typeof signal.audit.reviewer_required !== "boolean") {
            errors.push("audit.reviewer_required must be a boolean");
        }
    }
    // factors — at least one recommended
    if (signal.factors && signal.factors.length > 0) {
        for (let i = 0; i < signal.factors.length; i++) {
            const f = signal.factors[i];
            if (!f.name)
                errors.push(`factors[${i}].name is required`);
            if (typeof f.weight !== "number" || f.weight < 0 || f.weight > 1) {
                errors.push(`factors[${i}].weight must be a number between 0 and 1`);
            }
            if (!f.explanation)
                errors.push(`factors[${i}].explanation is required`);
        }
    }
    // evidence — basic structural check
    if (signal.evidence) {
        for (let i = 0; i < signal.evidence.length; i++) {
            const e = signal.evidence[i];
            if (!e.key)
                errors.push(`evidence[${i}].key is required`);
            if (e.value === undefined || e.value === null) {
                errors.push(`evidence[${i}].value is required`);
            }
        }
    }
    return errors;
}
//# sourceMappingURL=signal-output-contract.js.map