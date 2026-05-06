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

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname } from "node:path";

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

const sessions = new Map<string, SessionMetrics>();

let currentSessionId = "global";

export function setSession(id: string) {
  currentSessionId = id;
  if (!sessions.has(id)) sessions.set(id, { llmCalls: [], toolCalls: [] });
}

function getSession(): SessionMetrics {
  if (!sessions.has(currentSessionId)) {
    sessions.set(currentSessionId, { llmCalls: [], toolCalls: [] });
  }
  return sessions.get(currentSessionId)!;
}

export function recordLLMCall(record: LLMCallRecord) {
  getSession().llmCalls.push(record);
}

export function recordToolCall(record: ToolCallRecord) {
  getSession().toolCalls.push(record);
}

export function getSessionMetrics(id?: string): SessionMetrics {
  return sessions.get(id ?? currentSessionId) ?? { llmCalls: [], toolCalls: [] };
}

export function formatMetrics(idOrSession?: string | SessionMetrics): string {
  const s = typeof idOrSession === "object" ? idOrSession : getSessionMetrics(idOrSession);
  const lc = s.llmCalls;
  const tc = s.toolCalls;

  if (lc.length === 0 && tc.length === 0) return "No metrics recorded.";

  const avgLatency = (arr: Array<{ latencyMs: number }>) =>
    arr.length > 0
      ? `${Math.round(arr.reduce((a, b) => a + b.latencyMs, 0) / arr.length)}ms`
      : "—";

  const successRate = (arr: Array<{ success: boolean }>) =>
    arr.length > 0
      ? `${Math.round((arr.filter((x) => x.success).length / arr.length) * 100)}%`
      : "—";

  const totalTokens = lc.reduce((s, r) => s + r.totalTokens, 0);

  const lines: string[] = [
    `── LLM Calls ──────────────────────`,
    `  Count:          ${lc.length}`,
    `  Avg Latency:    ${avgLatency(lc)}`,
    `  Success Rate:   ${successRate(lc)}`,
    `  Total Tokens:   ${totalTokens.toLocaleString()}`,
    lc.length > 0 ? `  Last Model:     ${lc[lc.length - 1].model}` : "",
    ``,
    `── Tool Calls ─────────────────────`,
    `  Count:          ${tc.length}`,
    `  Avg Latency:    ${avgLatency(tc)}`,
    `  Success Rate:   ${successRate(tc)}`,
  ];

  // Per-tool breakdown
  const toolNames = [...new Set(tc.map((t) => t.name))];
  if (toolNames.length > 0) {
    lines.push(``, `── Per-Tool Breakdown ────────────────`);
    for (const name of toolNames) {
      const calls = tc.filter((t) => t.name === name);
      lines.push(
        `  ${name}: ${calls.length} calls, ${avgLatency(calls)} avg, ${successRate(calls)} success`,
      );
    }
  }

  return lines.filter(Boolean).join("\n");
}

/** Persist session metrics to a JSON file */
export async function saveMetrics(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(getSessionMetrics(), null, 2), "utf-8");
}

/** Load metrics from a JSON file */
export async function loadMetrics(filePath: string): Promise<SessionMetrics | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as SessionMetrics;
  } catch { return null; }
}
