/** ============================================================
 *  VIB Capability Protocol v0.1 ↔ addyosmani/agent-skills
 *  — Type definitions
 *  ============================================================ */
export interface AddyosmaniSkill {
    /** Lowercase, hyphen-separated directory name (e.g. "test-driven-development") */
    name: string;
    /** One-sentence description followed by "Use when..." usage guidance */
    description: string;
}
export interface VibInputField {
    name: string;
    type: string;
    required: boolean;
    description: string;
}
export interface VibOutputField {
    name: string;
    type: string;
    description: string;
    alwaysPresent: boolean;
}
export interface VibToolDecl {
    name: string;
    purpose: string;
    required: boolean;
}
export interface VibVerificationGate {
    id: string;
    description: string;
    type: "schema" | "invariant" | "existence" | "threshold" | "manual";
    severity: "critical" | "major" | "minor";
}
export interface VibFailureMode {
    when: string;
    code: string;
    recoverable: boolean;
    recovery: string;
}
export interface VibFallbackDecl {
    strategy: "retry" | "alternative" | "degrade" | "abort";
    plan: string;
}
export interface VibHandoffDecl {
    to: string;
    when: string;
    payload: string;
}
export interface VibCostTracking {
    estimatedTokens?: number;
    estimatedTimeMs?: number;
    recordFields?: {
        field: string;
        description: string;
    }[];
}
export interface VibMemoryDecl {
    required: string[];
    ttl: string;
}
export interface VibCapability {
    name: string;
    description: string;
    category: string;
    version: string;
    inputs: VibInputField[];
    outputs: VibOutputField[];
    tools: VibToolDecl[];
    verification: VibVerificationGate[];
    failure_modes: VibFailureMode[];
    owner?: string;
    memory?: VibMemoryDecl;
    workflow?: string;
    fallback?: VibFallbackDecl;
    handoff?: VibHandoffDecl[];
    cost_tracking?: VibCostTracking;
}
export interface UnmappedFieldWarning {
    /** The VIB field name that has no addyosmani equivalent (or vice versa) */
    field: string;
    /** Human-readable explanation of what happened */
    reason: string;
}
export interface ConversionResult<T> {
    /** true when the 2 core fields (name, description) survived intact */
    success: boolean;
    /** The converted skill data */
    data: T;
    /** Non-fatal diagnostics about dropped or synthesized fields */
    warnings: UnmappedFieldWarning[];
}
//# sourceMappingURL=types.d.ts.map