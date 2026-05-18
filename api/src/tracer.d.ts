/**
 * VIB AI — Execution Tracer
 *
 * Creates nested spans for agent execution. Useful for understanding
 * where time is spent and for debugging multi-step agent flows.
 *
 * traceId is generated per-session. Each span has:
 *   - name (e.g. "llm.chat", "tool.predict_game")
 *   - start/end timestamps
 *   - optional metadata
 *   - parent-child nesting via depth
 */
export interface Span {
    name: string;
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    startMs: number;
    endMs?: number;
    durationMs?: number;
    metadata: Record<string, unknown>;
}
export declare function generateId(): string;
export declare function beginTrace(): string;
export declare function getCurrentTraceId(): string | undefined;
export declare function beginSpan(name: string, metadata?: Record<string, unknown>): Span;
export declare function endSpan(span: Span, metadata?: Record<string, unknown>): void;
export declare function getSpans(): Span[];
export declare function formatTrace(spans?: Span[]): string;
/** Persist current spans to a JSON file */
export declare function saveTrace(filePath: string): Promise<void>;
/** Load spans from a JSON file and return formatted trace */
export declare function loadTrace(filePath: string): Promise<string | null>;
//# sourceMappingURL=tracer.d.ts.map