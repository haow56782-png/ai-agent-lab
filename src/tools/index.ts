import { logger } from "../logger.js";
import { beginSpan, endSpan } from "../tracer.js";
import { recordToolCall } from "../telemetry.js";

export interface ToolDefinition {
  /** Tool name — used by LLM to invoke */
  name: string;
  /** Description — tells LLM when to use this tool */
  description: string;
  /** JSON Schema for parameters */
  parameters: Record<string, unknown>;
}

export interface ToolContext {
  projectRoot: string;
  designSystemPath: string;
  /** Injected file system interface — allows testability */
  fs?: {
    readFile(path: string): Promise<string>;
  };
  [key: string]: unknown;
}

export type ToolHandler = (
  args: Record<string, unknown>,
  ctx: ToolContext,
) => Promise<string>;

const registry = new Map<string, { def: ToolDefinition; handler: ToolHandler }>();

export function registerTool(def: ToolDefinition, handler: ToolHandler) {
  registry.set(def.name, { def, handler });
}

export function getToolDefinitions(): ToolDefinition[] {
  return Array.from(registry.values()).map((e) => e.def);
}

/** Format tools into a system-message block for the LLM */
export function renderToolInstructions(): string {
  const defs = getToolDefinitions();
  if (defs.length === 0) return "";
  return (
    `\n## Available Tools\n` +
    defs
      .map((t) => `- **${t.name}**: ${t.description}`)
      .join("\n") +
    `\nCall a tool by writing: {"tool":"<name>","args":{...}}\n`
  );
}

export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const span = beginSpan(`tool.${name}`, { args });
  const start = performance.now();

  logger.debug("tool.call", { tool: name, args });

  try {
    const entry = registry.get(name);
    if (!entry) throw new Error(`Unknown tool: ${name}`);

    const result = await entry.handler(args, ctx);
    const latencyMs = Math.round(performance.now() - start);

    logger.debug("tool.success", { tool: name, latencyMs });
    recordToolCall({ name, latencyMs, success: true });
    endSpan(span, { latencyMs, success: true });

    return result;
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const error = err instanceof Error ? err.message : String(err);

    logger.error("tool.failed", { tool: name, error, latencyMs });
    recordToolCall({ name, latencyMs, success: false, error });
    endSpan(span, { latencyMs, success: false, error });

    throw err;
  }
}
