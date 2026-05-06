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

import { logger } from "./logger.js";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname } from "node:path";

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

let currentTraceId: string | undefined;
let currentSpans: Span[] = [];
let spanStack: string[] = []; // stack of spanIds

export function generateId(): string {
  return randomBytes(4).toString("hex");
}

export function beginTrace(): string {
  currentTraceId = generateId();
  currentSpans = [];
  spanStack = [];
  return currentTraceId;
}

export function getCurrentTraceId(): string | undefined {
  return currentTraceId;
}

export function beginSpan(name: string, metadata?: Record<string, unknown>): Span {
  const traceId = currentTraceId ?? beginTrace();
  const spanId = generateId();
  const parentSpanId = spanStack.length > 0 ? spanStack[spanStack.length - 1] : undefined;

  const span: Span = {
    name,
    traceId,
    spanId,
    parentSpanId,
    startMs: performance.now(),
    metadata: metadata ?? {},
  };

  currentSpans.push(span);
  spanStack.push(spanId);

  logger.debug(`span.start`, { name, spanId, parentSpanId, traceId });
  return span;
}

export function endSpan(span: Span, metadata?: Record<string, unknown>) {
  span.endMs = performance.now();
  span.durationMs = Math.round(span.endMs - span.startMs);
  if (metadata) Object.assign(span.metadata, metadata);

  // Pop from stack
  const idx = spanStack.lastIndexOf(span.spanId);
  if (idx !== -1) spanStack.splice(idx, 1);

  logger.debug(`span.end`, {
    name: span.name,
    spanId: span.spanId,
    durationMs: span.durationMs,
    ...metadata,
  });
}

export function getSpans(): Span[] {
  return [...currentSpans];
}

export function formatTrace(spans?: Span[]): string {
  const data = spans ?? currentSpans;
  if (data.length === 0) return "No spans recorded.";

  const traceId = data[0]?.traceId ?? "N/A";
  const lines: string[] = [`Trace: ${traceId}`, ""];
  const sorted = [...data].sort((a, b) => a.startMs - b.startMs);

  // Build depth map in one pass: parent starts before child, so
  // by the time we reach a span its parent depth is already known.
  const depths = new Map<string, number>();
  for (const span of sorted) {
    depths.set(span.spanId, span.parentSpanId ? (depths.get(span.parentSpanId) ?? 0) + 1 : 0);
  }

  for (const span of sorted) {
    const depth = depths.get(span.spanId) ?? 0;
    const indent = "  ".repeat(depth);
    const dur = span.durationMs != null ? `${span.durationMs}ms` : "running";
    const meta = Object.keys(span.metadata).length > 0
      ? ` ${JSON.stringify(span.metadata)}`
      : "";
    lines.push(`${indent}─ ${span.name} (${dur})${meta}`);
  }

  lines.push("", `Total: ${data.length} spans`);
  return lines.join("\n");
}

/** Persist current spans to a JSON file */
export async function saveTrace(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(currentSpans, null, 2), "utf-8");
}

/** Load spans from a JSON file and return formatted trace */
export async function loadTrace(filePath: string): Promise<string | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const spans: Span[] = JSON.parse(raw);
    if (!Array.isArray(spans) || spans.length === 0) return null;
    return formatTrace(spans);
  } catch { return null; }
}
