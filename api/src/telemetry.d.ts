/**
 * VIB AI — Telemetry / Metrics Collector
 *
 * Collects runtime metrics across agent sessions:
 *   - LLM call count, latency, token usage
 *   - Tool call count, latency
 *   - Session summary
 *
 * Metrics are in-memory and reset on process restart.
 */
export interface LLMCallRecord {
    model: string;
    latencyMs: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    success: boolean;
    error?: string;
}
export interface ToolCallRecord {
    name: string;
    latencyMs: number;
    success: boolean;
    error?: string;
}
export interface SessionMetrics {
    llmCalls: LLMCallRecord[];
    toolCalls: ToolCallRecord[];
}
export declare function setSession(id: string): void;
export declare function recordLLMCall(record: LLMCallRecord): void;
export declare function recordToolCall(record: ToolCallRecord): void;
export declare function getSessionMetrics(id?: string): SessionMetrics;
export declare function formatMetrics(idOrSession?: string | SessionMetrics): string;
/** Persist session metrics to a JSON file */
export declare function saveMetrics(filePath: string): Promise<void>;
/** Load metrics from a JSON file */
export declare function loadMetrics(filePath: string): Promise<SessionMetrics | null>;
//# sourceMappingURL=telemetry.d.ts.map