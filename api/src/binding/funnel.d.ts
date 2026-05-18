/**
 * VIB AI — Binding Conversion Funnel Analyzer
 *
 * Processes RuntimeEvent arrays from BindingSessions to produce
 * stage-by-stage conversion funnel reports. Each stage pair tracks
 * how many sessions entered vs completed vs dropped.
 */
import type { BindingState, RuntimeEvent } from "./types.js";
export interface StageFunnel {
    stage: BindingState;
    entered: number;
    completed: number;
    failed: number;
    /** Sessions that reached the next stage (continuous flow). */
    progressed: number;
    conversionRate: number;
    dropoffRate: number;
}
export interface FunnelReport {
    totalSessions: number;
    successfulSessions: number;
    successRate: number;
    stages: StageFunnel[];
    /** Sorted by dropoff rate desc — biggest leaks first. */
    topDropoffs: Array<{
        stage: BindingState;
        dropoffRate: number;
        failedCount: number;
    }>;
    generatedAt: string;
}
export declare function analyzeFunnel(events: RuntimeEvent[][]): FunnelReport;
export declare function formatFunnelReport(report: FunnelReport): string;
//# sourceMappingURL=funnel.d.ts.map