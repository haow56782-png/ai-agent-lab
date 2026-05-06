import "dotenv/config";
import { createAgent } from "./agent.js";
import { createLLM } from "./llm.js";
import { runWorkflow } from "./workflow.js";
import { createInterface } from "node:readline/promises";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const LAST_RUN_DIR = join(tmpdir(), "vib-ai-agent");
const LAST_TRACE_FILE = join(LAST_RUN_DIR, "last-trace.json");
const LAST_METRICS_FILE = join(LAST_RUN_DIR, "last-metrics.json");

// Register all tools (side-effect imports)
import "./tools/design-system.js";
import "./tools/game-prediction.js";

const MODE = process.argv[2] ?? "repl";

async function main() {
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
    default:
      console.log(`Usage: npm run dev [repl|once|workflow|eval|tasks|check|log|metrics|trace] [param...]`);
  }
}

/** Interactive REPL */
async function replMode() {
  const agent = createAgent();
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log(`╭─────────────────────────────────────────────╮`);
  console.log(`│   VIB AI Agent  v1.0                        │`);
  console.log(`│   Type "exit" to quit, "/tools" to list     │`);
  console.log(`╰─────────────────────────────────────────────╯`);

  while (true) {
    const input = await rl.question("\n❯ ");
    const trimmed = input.trim();

    if (trimmed === "exit" || trimmed === "quit") {
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
    if (!trimmed) continue;

    const response = await agent.run(trimmed);
    console.log(`\n${response}`);
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
  } catch (err) {
    console.error("[persist] failed:", err);
  }
}

/** Single-shot mode: run one prompt and print result */
async function onceMode(prompt: string) {
  if (!prompt) {
    console.error("Error: provide a prompt. Usage: npm run dev once <prompt>");
    process.exit(1);
  }
  const agent = createAgent();
  try {
    const response = await agent.run(prompt);
    console.log(response);
  } finally {
    await persistRunData();
  }
}

/** Workflow mode: Plan → Execute → Review → Refine */
async function workflowMode(task: string) {
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
  await persistRunData();
}

/** Eval mode: run evaluation scenarios */
async function evalMode(scenario: string) {
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
  const { runEval } = await import("../evals/runner.js");
  await runEval(scenario);
}

/** Log mode: tail recent structured log lines */
function logMode(n: number) {
  // Re-run the last command and pipe stderr through grep for structured logs
  const args = process.argv.slice(3);
  if (args.length > 0 && !isNaN(Number(args[0]))) args.shift(); // pop the count
  const cmd = process.argv[1]!;
  const child = spawn(process.execPath, ["--no-warnings", cmd, "once", ...args], {
    stdio: ["inherit", "inherit", "pipe"],
  });
  let buffer = "";
  child.stderr!.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.includes('"t":')) {
        try {
          const parsed = JSON.parse(line);
          console.log(`${parsed.t} [${parsed.l}] ${parsed.m}${parsed.data ? " " + JSON.stringify(parsed.data) : ""}`);
        } catch {
          console.log(line);
        }
      }
    }
  });
  child.on("exit", () => {
    if (buffer) console.log(buffer);
  });
}

/** Load persisted trace data from last run */
async function loadLastTrace(): Promise<string | null> {
  try {
    const { loadTrace } = await import("./tracer.js");
    return await loadTrace(LAST_TRACE_FILE);
  } catch { return null; }
}

/** Load persisted metrics from last run */
async function loadLastMetrics(): Promise<string | null> {
  try {
    const { formatMetrics, loadMetrics } = await import("./telemetry.js");
    const data = await loadMetrics(LAST_METRICS_FILE);
    if (!data || (data.llmCalls.length === 0 && data.toolCalls.length === 0)) return null;
    return formatMetrics(data);
  } catch { return null; }
}

/** Metrics mode: display session metrics */
async function metricsMode() {
  const { formatMetrics, getSessionMetrics } = await import("./telemetry.js");

  // Try in-memory first (REPL session), fall back to persisted data
  const mem = getSessionMetrics();
  if (mem.llmCalls.length > 0 || mem.toolCalls.length > 0) {
    console.log(formatMetrics());
    const { getSpans } = await import("./tracer.js");
    const spans = getSpans();
    if (spans.length > 0) {
      const { formatTrace } = await import("./tracer.js");
      console.log();
      console.log(formatTrace());
    }
    return;
  }

  const persisted = await loadLastMetrics();
  if (persisted) {
    console.log(persisted);
    const trace = await loadLastTrace();
    if (trace) {
      console.log();
      console.log(trace);
    }
  } else {
    console.log("No metrics recorded.");
  }
}

/** Trace mode: show full execution trace */
async function traceMode() {
  const { formatTrace, getSpans } = await import("./tracer.js");

  // Try in-memory first, fall back to persisted
  if (getSpans().length > 0) {
    console.log(formatTrace());
    return;
  }

  const persisted = await loadLastTrace();
  if (persisted) {
    console.log(persisted);
  } else {
    console.log("No spans recorded.");
  }
}

/** Tasks mode: list registered tasks from catalog */
async function tasksMode() {
  try {
    const catalog = JSON.parse(
      await readFile(new URL("../tasks/catalog.json", import.meta.url), "utf-8"),
    );
    console.log(`\nTask Catalog v${catalog.version}`);
    console.log(`─`.repeat(40));
    for (const task of catalog.tasks) {
      const tags = (task.tags as string[]).join(", ");
      console.log(`  ${task.id}  ${task.name}`);
      console.log(`       ${task.description}`);
      console.log(`       [${tags}]`);
      console.log();
    }
    console.log(`${catalog.tasks.length} tasks registered.`);
  } catch (err) {
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
    } else {
      console.log(`⚠️  LLM responded but unexpected: ${reply}`);
    }
  } catch (err) {
    console.error("❌ LLM connection failed:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
