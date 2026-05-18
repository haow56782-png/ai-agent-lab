import { logger } from "../logger.js";
import { beginSpan, endSpan } from "../tracer.js";
import { recordToolCall } from "../telemetry.js";
const registry = new Map();
export function registerTool(def, handler) {
    registry.set(def.name, { def, handler });
}
export function getToolDefinitions() {
    return Array.from(registry.values()).map((e) => e.def);
}
/** Format tools into a system-message block for the LLM */
export function renderToolInstructions() {
    const defs = getToolDefinitions();
    if (defs.length === 0)
        return "";
    return (`\n## Available Tools\n` +
        defs
            .map((t) => `- **${t.name}**: ${t.description}`)
            .join("\n") +
        `\nCall a tool by writing: {"tool":"<name>","args":{...}}\n`);
}
/** Wrap a promise with a timeout. If the timeout fires, the promise is rejected. */
async function withTimeout(promise, ms, name) {
    if (!ms || ms <= 0)
        return promise;
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Tool "${name}" timed out after ${ms}ms`)), ms);
    });
    try {
        return await Promise.race([promise, timeout]);
    }
    finally {
        clearTimeout(timer);
    }
}
export async function executeToolCall(name, args, ctx) {
    const span = beginSpan(`tool.${name}`, { args });
    const start = performance.now();
    logger.debug("tool.call", { tool: name, args });
    try {
        const entry = registry.get(name);
        if (!entry)
            throw new Error(`Unknown tool: ${name}`);
        const result = await withTimeout(entry.handler(args, ctx), ctx.toolTimeoutMs, name);
        const latencyMs = Math.round(performance.now() - start);
        logger.debug("tool.success", { tool: name, latencyMs });
        recordToolCall({ name, latencyMs, success: true });
        endSpan(span, { latencyMs, success: true });
        return result;
    }
    catch (err) {
        const latencyMs = Math.round(performance.now() - start);
        const error = err instanceof Error ? err.message : String(err);
        logger.error("tool.failed", { tool: name, error, latencyMs });
        recordToolCall({ name, latencyMs, success: false, error });
        endSpan(span, { latencyMs, success: false, error });
        throw err;
    }
}
//# sourceMappingURL=index.js.map