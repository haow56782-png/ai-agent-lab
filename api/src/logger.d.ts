/**
 * VIB AI — Structured Logger
 *
 * Outputs JSONL (one JSON object per line) to stderr.
 * This keeps stdout clean for agent responses and tool outputs.
 *
 * Usage:
 *   logger.info("agent.run.start", { input, traceId })
 *   logger.warn("llm.retry", { attempt, error })
 *   logger.error("tool.failed", { tool, error })
 *
 * View:
 *   npm run dev 2> >(grep '{"t":' | jq .)
 */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";
export interface LogEntry {
    t: string;
    l: LogLevel;
    m: string;
    traceId?: string;
    data?: Record<string, unknown>;
}
export declare function setTraceId(id?: string): void;
export declare function getTraceId(): string | undefined;
export declare const logger: {
    setTraceId: (id?: string) => void;
    debug: (msg: string, data?: Record<string, unknown>) => void;
    info: (msg: string, data?: Record<string, unknown>) => void;
    warn: (msg: string, data?: Record<string, unknown>) => void;
    error: (msg: string, data?: Record<string, unknown>) => void;
};
//# sourceMappingURL=logger.d.ts.map