/**
 * VIB AI — Binding Conversion Funnel Analyzer
 *
 * Processes RuntimeEvent arrays from BindingSessions to produce
 * stage-by-stage conversion funnel reports. Each stage pair tracks
 * how many sessions entered vs completed vs dropped.
 */
// ─── Analyzer ──────────────────────────────────────
function stageOrder(stage) {
    const order = [
        "INIT",
        "URL_INPUT",
        "INVALID_URL",
        "SITE_RECOGNIZING",
        "UNSUPPORTED_SITE",
        "SITE_RECOGNIZED",
        "AUTH_CONFIRM_REQUIRED",
        "AUTH_REJECTED",
        "THIRD_PARTY_AUTHORIZING",
        "AUTH_FAILED",
        "ACCOUNT_INFO_FETCHING",
        "ACCOUNT_FETCH_FAILED",
        "ACCOUNT_BIND_CONFIRM",
        "BIND_FAILED",
        "ACCOUNT_BOUND",
        "AGENT_ANALYZING",
        "SIGNAL_GENERATION_FAILED",
        "SIGNAL_READY",
    ];
    const idx = order.indexOf(stage);
    return idx >= 0 ? idx : 999;
}
/** The main flow path (success and failure stages interleaved). */
const MAIN_FLOW = [
    "INIT",
    "URL_INPUT",
    "SITE_RECOGNIZING",
    "SITE_RECOGNIZED",
    "THIRD_PARTY_AUTHORIZING",
    "ACCOUNT_INFO_FETCHING",
    "ACCOUNT_BIND_CONFIRM",
    "ACCOUNT_BOUND",
    "AGENT_ANALYZING",
    "SIGNAL_READY",
];
/** Failure states that terminate the flow. */
const FAILURE_STATES = new Set([
    "INVALID_URL",
    "UNSUPPORTED_SITE",
    "AUTH_REJECTED",
    "AUTH_FAILED",
    "ACCOUNT_FETCH_FAILED",
    "BIND_FAILED",
    "SIGNAL_GENERATION_FAILED",
]);
export function analyzeFunnel(events) {
    const totalSessions = events.length;
    let successfulSessions = 0;
    // Count: for each main flow stage, how many sessions entered/completed it
    const entered = new Map();
    const completed = new Map();
    const failed = new Map();
    for (const sessionEvents of events) {
        let reachedSignalReady = false;
        const seen = new Set();
        for (const evt of sessionEvents) {
            seen.add(evt.stage);
            if (evt.status === "entered") {
                entered.set(evt.stage, (entered.get(evt.stage) ?? 0) + 1);
            }
            else if (evt.status === "completed" && MAIN_FLOW.includes(evt.stage)) {
                completed.set(evt.stage, (completed.get(evt.stage) ?? 0) + 1);
            }
            else if (evt.status === "failed") {
                failed.set(evt.stage, (failed.get(evt.stage) ?? 0) + 1);
            }
            if (evt.stage === "SIGNAL_READY" && evt.status === "completed") {
                reachedSignalReady = true;
            }
        }
        if (reachedSignalReady)
            successfulSessions++;
    }
    // Build stage funnels for the main flow
    const stages = [];
    for (let i = 0; i < MAIN_FLOW.length; i++) {
        const stage = MAIN_FLOW[i];
        const nextStage = i < MAIN_FLOW.length - 1 ? MAIN_FLOW[i + 1] : undefined;
        const enteredCount = entered.get(stage) ?? 0;
        const completedCount = completed.get(stage) ?? 0;
        const failedCount = failed.get(stage) ?? 0;
        const progressedCount = nextStage ? (entered.get(nextStage) ?? 0) : completedCount;
        const conversionRate = enteredCount > 0 ? progressedCount / enteredCount : 0;
        stages.push({
            stage,
            entered: enteredCount,
            completed: completedCount,
            failed: failedCount,
            progressed: progressedCount,
            conversionRate: Math.round(conversionRate * 100) / 100,
            dropoffRate: Math.round((1 - conversionRate) * 100) / 100,
        });
    }
    // Top dropoffs (largest dropoff rate, excluding terminal stages)
    const topDropoffs = stages
        .filter((s) => !FAILURE_STATES.has(s.stage) && s.stage !== "SIGNAL_READY")
        .sort((a, b) => b.dropoffRate - a.dropoffRate)
        .slice(0, 5)
        .map((s) => ({
        stage: s.stage,
        dropoffRate: s.dropoffRate,
        failedCount: failed.get(s.stage) ?? 0,
    }));
    return {
        totalSessions,
        successfulSessions,
        successRate: totalSessions > 0
            ? Math.round((successfulSessions / totalSessions) * 100) / 100
            : 0,
        stages,
        topDropoffs,
        generatedAt: new Date().toISOString(),
    };
}
// ─── Format ────────────────────────────────────────
export function formatFunnelReport(report) {
    const lines = [
        `── Binding Conversion Funnel ─────────`,
        `  Total Sessions:  ${report.totalSessions}`,
        `  Successful:      ${report.successfulSessions} (${(report.successRate * 100).toFixed(0)}%)`,
        ``,
        `  Stage Flow:`,
        `  ${"Stage".padEnd(28)} Entered  Completed  Failed  →Next  Conv%  Drop%`,
        `  ${"─".repeat(75)}`,
    ];
    for (const s of report.stages) {
        lines.push(`  ${s.stage.padEnd(28)} ${String(s.entered).padEnd(7)} ` +
            `${String(s.completed).padEnd(9)} ${String(s.failed).padEnd(6)} ` +
            `${String(s.progressed).padEnd(5)} ${(s.conversionRate * 100).toFixed(0).padEnd(3)}% ` +
            `${(s.dropoffRate * 100).toFixed(0).padEnd(3)}%`);
    }
    if (report.topDropoffs.length > 0) {
        lines.push(``, `  Top Dropoffs (biggest leaks):`);
        for (const d of report.topDropoffs) {
            lines.push(`    ${d.stage.padEnd(28)} ` +
                `${(d.dropoffRate * 100).toFixed(0)}% drop, ` +
                `${d.failedCount} failures`);
        }
    }
    return lines.join("\n");
}
//# sourceMappingURL=funnel.js.map