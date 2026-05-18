/**
 * VIB AI — Binding Failure Aggregation Report
 *
 * Analyzes failure patterns across binding sessions: which failure types
 * occur most often, which providers fail most, and which stages are the
 * biggest sources of lost sessions.
 */
// ─── Aggregator ────────────────────────────────────
const FAILURE_STATES = [
    "INVALID_URL",
    "UNSUPPORTED_SITE",
    "AUTH_REJECTED",
    "AUTH_FAILED",
    "ACCOUNT_FETCH_FAILED",
    "BIND_FAILED",
    "SIGNAL_GENERATION_FAILED",
];
export function aggregateFailures(sessions) {
    const totalSessions = sessions.length;
    const failedSessions = sessions.filter((s) => !s.success);
    const totalFailures = failedSessions.length;
    // By failure type
    const failureTypeCount = new Map();
    for (const session of failedSessions) {
        const failEvent = session.events.find((e) => e.status === "failed");
        if (failEvent) {
            failureTypeCount.set(failEvent.stage, (failureTypeCount.get(failEvent.stage) ?? 0) + 1);
        }
    }
    const byType = Array.from(failureTypeCount.entries())
        .map(([failure, count]) => ({
        failure,
        count,
        percentage: totalFailures > 0
            ? Math.round((count / totalFailures) * 10000) / 100
            : 0,
    }))
        .sort((a, b) => b.count - a.count);
    // By provider
    const providerMap = new Map();
    for (const session of sessions) {
        const provider = session.provider ?? "unknown";
        let entry = providerMap.get(provider);
        if (!entry) {
            entry = { total: 0, failed: 0, failures: new Map() };
            providerMap.set(provider, entry);
        }
        entry.total++;
        if (!session.success) {
            entry.failed++;
            const failEvent = session.events.find((e) => e.status === "failed");
            if (failEvent) {
                entry.failures.set(failEvent.stage, (entry.failures.get(failEvent.stage) ?? 0) + 1);
            }
        }
    }
    const byProvider = Array.from(providerMap.entries())
        .map(([provider, data]) => {
        const topFailure = data.failures.size > 0
            ? Array.from(data.failures.entries()).sort((a, b) => b[1] - a[1])[0][0]
            : "none";
        return {
            provider,
            totalSessions: data.total,
            failedSessions: data.failed,
            failureRate: data.total > 0
                ? Math.round((data.failed / data.total) * 10000) / 100
                : 0,
            topFailure,
        };
    })
        .sort((a, b) => b.failureRate - a.failureRate);
    return {
        totalSessions,
        totalFailures,
        overallFailureRate: totalSessions > 0
            ? Math.round((totalFailures / totalSessions) * 10000) / 100
            : 0,
        byType,
        byProvider,
        topThree: byType.slice(0, 3),
        generatedAt: new Date().toISOString(),
    };
}
// ─── Format ────────────────────────────────────────
export function formatFailureReport(report) {
    const lines = [
        `── Binding Failure Report ────────────`,
        `  Total Sessions:  ${report.totalSessions}`,
        `  Failed:          ${report.totalFailures}`,
        `  Failure Rate:    ${report.overallFailureRate}%`,
    ];
    if (report.byType.length > 0) {
        lines.push(``, `── By Failure Type ─────────────────────`);
        for (const f of report.byType) {
            const bar = "█".repeat(Math.max(1, Math.round(f.percentage / 5)));
            lines.push(`  ${f.failure.padEnd(26)} ${String(f.count).padEnd(4)} ` +
                `${f.percentage.toFixed(1).padStart(5)}% ${bar}`);
        }
    }
    if (report.topThree.length > 0) {
        lines.push(``, `  Top 3 Failure Types:`);
        for (const f of report.topThree) {
            lines.push(`    ${f.failure} — ${f.count} times (${f.percentage}%)`);
        }
    }
    if (report.byProvider.length > 0) {
        lines.push(``, `── By Provider ─────────────────────────`);
        for (const p of report.byProvider) {
            const bar = "█".repeat(Math.min(20, Math.max(1, Math.round(p.failureRate / 5))));
            lines.push(`  ${p.provider.padEnd(16)} ${String(p.failedSessions).padEnd(3)}/${String(p.totalSessions).padEnd(3)} ` +
                `fail (${p.failureRate}%) ${bar}  top: ${p.topFailure}`);
        }
    }
    return lines.join("\n");
}
//# sourceMappingURL=failure-report.js.map