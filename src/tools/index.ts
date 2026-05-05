import type { LLMMessage } from "../llm.js";

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
    `\nCall a tool by writing: {"tool":"${defs[0]?.name}","args":{...}}\n`
  );
}

export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const entry = registry.get(name);
  if (!entry) throw new Error(`Unknown tool: ${name}`);
  return entry.handler(args, ctx);
}
