import "dotenv/config";
import { get as getConfig } from "./config.js";
import { createAgent } from "./agent.js";
import { createLLM } from "./llm.js";
import { runWorkflow } from "./workflow.js";
import { createInterface } from "node:readline/promises";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { createStateStore } from "./state/index.js";
const LAST_RUN_DIR = join(tmpdir(), "vib-ai-agent");
const LAST_TRACE_FILE = join(LAST_RUN_DIR, "last-trace.json");
const LAST_METRICS_FILE = join(LAST_RUN_DIR, "last-metrics.json");
const STATE_STORE_ENABLED = process.env.STATE_STORE_ENABLED === "true";
let stateStore;
// Register all tools (side-effect imports)
import "./tools/design-system.js";
import "./tools/game-prediction.js";
const MODE = process.argv[2] ?? "repl";
async function main() {
    if (STATE_STORE_ENABLED) {
        stateStore = createStateStore();
        await stateStore.init();
    }
    try {
        switch (MODE) {
            case "repl":
                await replMode();
                break;
            case "once":
                await onceMode(process.argv.slice(3).join(" "));
                break;
            case "workflow":
                await workflowMode(process.argv.slice(3).join(" "));
                break;
            case "eval":
                await evalMode(process.argv[3] ?? "all");
                break;
            case "tasks":
                await tasksMode();
                break;
            case "check":
                await checkMode();
                break;
            case "log":
                await logMode(parseInt(process.argv[3] ?? "50", 10));
                break;
            case "metrics":
                await metricsMode();
                break;
            case "trace":
                await traceMode();
                break;
            case "vib-flow-demo":
                await vibFlowDemoMode();
                break;
            default:
                console.log(`Usage: npm run dev [repl|once|workflow|eval|tasks|check|log|metrics|trace|vib-flow-demo]`);
        }
    }
    finally {
        if (stateStore) {
            await stateStore.close();
        }
    }
}
/** Interactive REPL */
async function replMode() {
    const agent = createAgent({
        enableBoundaryRouting: true,
        opusModel: getConfig("llm.opusModel"),
    });
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    console.log(`╭─────────────────────────────────────────────╮`);
    console.log(`│   VIB AI Agent  v1.0                        │`);
    console.log(`│   Type "exit" to quit, "/tools" to list     │`);
    console.log(`╰─────────────────────────────────────────────╯`);
    while (true) {
        const input = await rl.question("\n❯ ");
        const trimmed = input.trim();
        if (trimmed === "exit" || trimmed === "quit") {
            await persistToStateStore();
            await persistRunData();
            break;
        }
        if (trimmed === "/tools") {
            const { getToolDefinitions } = await import("./tools/index.js");
            for (const t of getToolDefinitions()) {
                console.log(`  ${t.name} — ${t.description}`);
            }
            continue;
        }
        if (!trimmed)
            continue;
        const response = await agent.run(trimmed);
        console.log(`\n${response}`);
        await persistToStateStore();
    }
    rl.close();
}
/** Persist current trace and metrics to disk for cross-process access */
async function persistRunData() {
    try {
        const { saveTrace } = await import("./tracer.js");
        const { saveMetrics } = await import("./telemetry.js");
        await Promise.all([
            saveTrace(LAST_TRACE_FILE),
            saveMetrics(LAST_METRICS_FILE),
        ]);
    }
    catch (err) {
        console.error("[persist] failed:", err);
    }
}
/** Persist trace spans and metrics snapshot to StateStore (if enabled). */
async function persistToStateStore() {
    if (!stateStore)
        return;
    try {
        const { getSpans, generateId } = await import("./tracer.js");
        const { getSessionMetrics } = await import("./telemetry.js");
        const spans = getSpans();
        for (const span of spans) {
            await stateStore.saveTraceSpan({
                id: span.spanId,
                traceId: span.traceId,
                spanId: span.spanId,
                parentSpanId: span.parentSpanId,
                name: span.name,
                startMs: span.startMs,
                endMs: span.endMs,
                durationMs: span.durationMs,
                metadata: span.metadata && Object.keys(span.metadata).length > 0
                    ? JSON.stringify(span.metadata)
                    : undefined,
            });
        }
        const metrics = getSessionMetrics();
        const lc = metrics.llmCalls;
        if (lc.length > 0) {
            const totalTokens = lc.reduce((s, r) => s + r.totalTokens, 0);
            const successCount = lc.filter((r) => r.success).length;
            const avgLatencyMs = Math.round(lc.reduce((a, b) => a + b.latencyMs, 0) / lc.length);
            await stateStore.saveMetricsSnapshot({
                id: generateId(),
                model: lc[lc.length - 1].model,
                llmCalls: lc.length,
                toolCalls: metrics.toolCalls.length,
                totalTokens,
                avgLatencyMs: isNaN(avgLatencyMs) ? undefined : avgLatencyMs,
                successRate: successCount / lc.length,
                snapshotAt: new Date().toISOString(),
            });
        }
    }
    catch (err) {
        console.error("[state-store] persist failed:", err);
    }
}
/** Single-shot mode: run one prompt and print result */
async function onceMode(prompt) {
    if (!prompt) {
        console.error("Error: provide a prompt. Usage: npm run dev once <prompt>");
        process.exit(1);
    }
    const agent = createAgent({
        enableBoundaryRouting: true,
        opusModel: getConfig("llm.opusModel"),
    });
    try {
        const response = await agent.run(prompt);
        console.log(response);
    }
    finally {
        await persistToStateStore();
        await persistRunData();
    }
}
/** Workflow mode: Plan → Execute → Review → Refine */
async function workflowMode(task) {
    if (!task) {
        console.error("Error: provide a task. Usage: npm run dev workflow <task>");
        process.exit(1);
    }
    const result = await runWorkflow(task);
    console.log(`\n## Plan\n${result.plan}`);
    console.log(`\n## Output\n${result.output}`);
    console.log(`\n## Review\n${result.review}`);
    if (result.refined) {
        console.log(`\n## Refined\n${result.refined}`);
    }
    console.log(`\n[Stages: ${result.stages}]`);
    await persistToStateStore();
    await persistRunData();
}
/** Eval mode: run evaluation scenarios */
async function evalMode(scenario) {
    if (scenario === "load-test") {
        const { runLoadTest } = await import("../evals/scenarios/load-test.js");
        const result = await runLoadTest();
        console.log(`Load Test Results:`);
        console.log(`  Total:     ${result.total}`);
        console.log(`  Passed:    ${result.passed}`);
        console.log(`  Avg:       ${result.avgLatencyMs}ms`);
        console.log(`  P50:       ${result.p50Ms}ms`);
        console.log(`  P95:       ${result.p95Ms}ms`);
        console.log(`  P99:       ${result.p99Ms}ms`);
        return;
    }
    if (scenario === "fixtures") {
        const { runFixtureRegression, formatFixtureReport } = await import("../evals/fixtures/index.js");
        const report = await runFixtureRegression();
        console.log(formatFixtureReport(report));
        return;
    }
    const { runEval } = await import("../evals/runner.js");
    await runEval(scenario);
}
/** Log mode: tail recent structured log lines */
function logMode(n) {
    // Re-run the last command and pipe stderr through grep for structured logs
    const args = process.argv.slice(3);
    if (args.length > 0 && !isNaN(Number(args[0])))
        args.shift(); // pop the count
    const cmd = process.argv[1];
    const child = spawn(process.execPath, ["--no-warnings", cmd, "once", ...args], {
        stdio: ["inherit", "inherit", "pipe"],
    });
    let buffer = "";
    child.stderr.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
            if (line.includes('"t":')) {
                try {
                    const parsed = JSON.parse(line);
                    console.log(`${parsed.t} [${parsed.l}] ${parsed.m}${parsed.data ? " " + JSON.stringify(parsed.data) : ""}`);
                }
                catch {
                    console.log(line);
                }
            }
        }
    });
    child.on("exit", () => {
        if (buffer)
            console.log(buffer);
    });
}
/** Load persisted trace data from last run */
async function loadLastTrace() {
    try {
        const { loadTrace } = await import("./tracer.js");
        return await loadTrace(LAST_TRACE_FILE);
    }
    catch {
        return null;
    }
}
/** Load persisted metrics from last run */
async function loadLastMetrics() {
    try {
        const { formatMetrics, loadMetrics } = await import("./telemetry.js");
        const data = await loadMetrics(LAST_METRICS_FILE);
        if (!data || (data.llmCalls.length === 0 && data.toolCalls.length === 0))
            return null;
        return formatMetrics(data);
    }
    catch {
        return null;
    }
}
/** Metrics mode: display session metrics */
async function metricsMode() {
    const { formatMetrics, getSessionMetrics } = await import("./telemetry.js");
    const { formatTrace, getSpans } = await import("./tracer.js");
    // Try in-memory first (REPL session)
    const mem = getSessionMetrics();
    if (mem.llmCalls.length > 0 || mem.toolCalls.length > 0) {
        console.log(formatMetrics());
        const spans = getSpans();
        if (spans.length > 0) {
            console.log();
            console.log(formatTrace());
        }
        return;
    }
    // Try StateStore
    if (stateStore) {
        try {
            const snapshots = await stateStore.listMetricsSnapshots(undefined, 1);
            if (snapshots.length > 0) {
                const s = snapshots[0];
                console.log([
                    `── LLM Calls ──────────────────────`,
                    `  Count:          ${s.llmCalls}`,
                    `  Avg Latency:    ${s.avgLatencyMs != null ? `${s.avgLatencyMs}ms` : "—"}`,
                    `  Success Rate:   ${s.successRate != null ? `${Math.round(s.successRate * 100)}%` : "—"}`,
                    `  Total Tokens:   ${s.totalTokens.toLocaleString()}`,
                    `  Last Model:     ${s.model}`,
                    ``,
                    `── Tool Calls ─────────────────────`,
                    `  Count:          ${s.toolCalls}`,
                ].join("\n"));
                // Show trace from state store too
                const records = await stateStore.queryRecentTraces(50);
                if (records.length > 0) {
                    const displaySpans = records.map((r) => ({
                        name: r.name,
                        traceId: r.traceId,
                        spanId: r.spanId,
                        parentSpanId: r.parentSpanId,
                        startMs: r.startMs,
                        endMs: r.endMs,
                        durationMs: r.durationMs,
                        metadata: r.metadata ? JSON.parse(r.metadata) : {},
                    }));
                    console.log();
                    console.log(formatTrace(displaySpans));
                }
                return;
            }
        }
        catch { }
    }
    // Fallback to /tmp JSON
    const persisted = await loadLastMetrics();
    if (persisted) {
        console.log(persisted);
        const trace = await loadLastTrace();
        if (trace) {
            console.log();
            console.log(trace);
        }
    }
    else {
        console.log("No metrics recorded.");
    }
}
/** Trace mode: show full execution trace */
async function traceMode() {
    const { formatTrace, getSpans } = await import("./tracer.js");
    // Try in-memory first (REPL session)
    if (getSpans().length > 0) {
        console.log(formatTrace());
        return;
    }
    // Try StateStore
    if (stateStore) {
        try {
            const records = await stateStore.queryRecentTraces(50);
            if (records.length > 0) {
                const spans = records.map((r) => ({
                    name: r.name,
                    traceId: r.traceId,
                    spanId: r.spanId,
                    parentSpanId: r.parentSpanId,
                    startMs: r.startMs,
                    endMs: r.endMs,
                    durationMs: r.durationMs,
                    metadata: r.metadata ? JSON.parse(r.metadata) : {},
                }));
                console.log(formatTrace(spans));
                return;
            }
        }
        catch { }
    }
    // Fallback to /tmp JSON
    const persisted = await loadLastTrace();
    if (persisted) {
        console.log(persisted);
    }
    else {
        console.log("No spans recorded.");
    }
}
/** Tasks mode: list registered tasks from catalog */
async function tasksMode() {
    try {
        const catalog = JSON.parse(await readFile(new URL("../tasks/catalog.json", import.meta.url), "utf-8"));
        console.log(`\nTask Catalog v${catalog.version}`);
        console.log(`─`.repeat(40));
        for (const task of catalog.tasks) {
            const tags = task.tags.join(", ");
            console.log(`  ${task.id}  ${task.name}`);
            console.log(`       ${task.description}`);
            console.log(`       [${tags}]`);
            console.log();
        }
        console.log(`${catalog.tasks.length} tasks registered.`);
    }
    catch (err) {
        console.error("Failed to load task catalog:", err);
    }
}
/** Check mode: verify LLM connectivity */
async function checkMode() {
    try {
        const llm = createLLM({ temperature: 0, maxTokens: 128 });
        const reply = await llm.chat([
            { role: "user", content: "Reply with exactly: OK" },
        ]);
        if (reply.trim() === "OK") {
            console.log("✅ LLM connection OK");
        }
        else {
            console.log(`⚠️  LLM responded but unexpected: ${reply}`);
        }
    }
    catch (err) {
        console.error("❌ LLM connection failed:", err);
        process.exit(1);
    }
}
/** VIB Agent Runtime Flow Demo */
async function vibFlowDemoMode() {
    const { createInterface } = await import("node:readline/promises");
    const { runBindingWorkflow } = await import("./binding/workflow.js");
    const { createStateStore } = await import("./state/index.js");
    const store = createStateStore();
    await store.init();
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    console.log(`\n╭──────────────────────────────────────────────────╮`);
    console.log(`│   VIB Agent Runtime Flow Demo                   │`);
    console.log(`│                                                  │`);
    console.log(`│   Enter a game site URL to start binding, or     │`);
    console.log(`│   type one of the demo presets below:            │`);
    console.log(`│                                                  │`);
    console.log(`│     demo:success       Happy path (PG Soft)      │`);
    console.log(`│     demo:invalid       Invalid URL               │`);
    console.log(`│     demo:unsupported   Unsupported site          │`);
    console.log(`│     demo:auth-reject   Authorization rejected    │`);
    console.log(`│     demo:fetch-fail    Account fetch failed      │`);
    console.log(`│     demo:signal-fail   Signal generation failed  │`);
    console.log(`│     quit               Exit                      │`);
    console.log(`╰──────────────────────────────────────────────────╯\n`);
    let running = true;
    while (running) {
        const input = await rl.question("❯ ");
        const trimmed = input.trim();
        if (trimmed === "quit" || trimmed === "exit") {
            running = false;
            continue;
        }
        if (!trimmed)
            continue;
        // Map demo presets to failure modes and URLs
        let url = trimmed;
        let failureMode;
        if (trimmed === "demo:success") {
            url = "https://www.pgsoft.com/game";
        }
        else if (trimmed === "demo:invalid") {
            failureMode = "INVALID_URL";
        }
        else if (trimmed === "demo:unsupported") {
            failureMode = "UNSUPPORTED_SITE";
        }
        else if (trimmed === "demo:auth-reject") {
            url = "https://www.pgsoft.com/game";
            failureMode = "AUTH_REJECTED";
        }
        else if (trimmed === "demo:fetch-fail") {
            url = "https://www.pgsoft.com/game";
            failureMode = "ACCOUNT_FETCH_FAILED";
        }
        else if (trimmed === "demo:signal-fail") {
            url = "https://www.pgsoft.com/game";
            failureMode = "SIGNAL_GENERATION_FAILED";
        }
        else if (trimmed === "demo:") {
            continue;
        }
        const result = await runBindingWorkflow({
            url,
            failureMode: failureMode,
            confirmAuth: async () => {
                const ans = await rl.question("    Authorize this application? (y/n): ");
                return ans.trim().toLowerCase() === "y";
            },
            confirmBind: async () => {
                const ans = await rl.question("    Confirm account binding? (y/n): ");
                return ans.trim().toLowerCase() === "y";
            },
        }, store);
        if (!result.success) {
            console.log(`  💡 Tip: ${getFailureTip(result.session.failure)}\n`);
        }
    }
    rl.close();
    await store.close();
}
function getFailureTip(failure) {
    const tips = {
        INVALID_URL: "Make sure the URL includes http:// or https://",
        UNSUPPORTED_SITE: "Try a site from: PG Soft, JILI, Spade Gaming",
        AUTH_REJECTED: "Authorization is required to read game account data",
        AUTH_FAILED: "The OAuth provider is unavailable — try again later",
        ACCOUNT_FETCH_FAILED: "The game platform might be under maintenance",
        BIND_FAILED: "The binding could not be saved — check storage",
        SIGNAL_GENERATION_FAILED: "The AI model had insufficient data to generate a signal",
    };
    return tips[failure] ?? "Unknown error";
}
main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map