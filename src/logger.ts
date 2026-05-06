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

import { get as getConfig } from "./config.js";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_NUM: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const ENABLED = LEVEL_NUM[(getConfig<LogLevel>("log.level"))] ?? 1;

export interface LogEntry {
  t: string;       // timestamp (ISO-8601)
  l: LogLevel;     // level
  m: string;       // message
  traceId?: string;
  data?: Record<string, unknown>;
}

let _traceId: string | undefined;

export function setTraceId(id?: string) {
  _traceId = id;
}

export function getTraceId(): string | undefined {
  return _traceId;
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  if (LEVEL_NUM[level] < ENABLED) return;

  const entry: LogEntry = {
    t: new Date().toISOString(),
    l: level,
    m: message,
    traceId: _traceId,
    data,
  };

  // Write to stderr as JSONL
  process.stderr.write(JSON.stringify(entry) + "\n");
}

export const logger = {
  setTraceId: (id?: string) => { _traceId = id; },
  debug: (msg: string, data?: Record<string, unknown>) => log("DEBUG", msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log("INFO", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log("WARN", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log("ERROR", msg, data),
};
