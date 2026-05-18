/**
 * VIB AI — Binding Failure Aggregation Report
 *
 * Analyzes failure patterns across binding sessions: which failure types
 * occur most often, which providers fail most, and which stages are the
 * biggest sources of lost sessions.
 */
import type { RuntimeEvent } from "./types.js";
export interface FailureCount {
    failure: string;
    count: number;
    percentage: number;
}
export interface ProviderFailure {
    provider: string;
    totalSessions: number;
    failedSessions: number;
    failureRate: number;
    topFailure: string;
}
export interface FailureReport {
    totalSessions: number;
    totalFailures: number;
    overallFailureRate: number;
    byType: FailureCount[];
    byProvider: ProviderFailure[];
    topThree: FailureCount[];
    generatedAt: string;
}
export declare function aggregateFailures(sessions: Array<{
    events: RuntimeEvent[];
    provider?: string;
    success: boolean;
}>): FailureReport;
export declare function formatFailureReport(report: FailureReport): string;
//# sourceMappingURL=failure-report.d.ts.map