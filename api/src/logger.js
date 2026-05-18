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
const LEVEL_NUM = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};
const ENABLED = LEVEL_NUM[(getConfig("log.level"))] ?? 1;
let _traceId;
export function setTraceId(id) {
    _traceId = id;
}
export function getTraceId() {
    return _traceId;
}
function log(level, message, data) {
    if (LEVEL_NUM[level] < ENABLED)
        return;
    const entry = {
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
    setTraceId: (id) => { _traceId = id; },
    debug: (msg, data) => log("DEBUG", msg, data),
    info: (msg, data) => log("INFO", msg, data),
    warn: (msg, data) => log("WARN", msg, data),
    error: (msg, data) => log("ERROR", msg, data),
};
//# sourceMappingURL=logger.js.map