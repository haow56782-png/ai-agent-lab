import type { LLMMessage } from "./llm.js";
import { createLLM } from "./llm.js";
import { executeToolCall, renderToolInstructions } from "./tools/index.js";

export interface AgentConfig {
  projectRoot?: string;
  systemPrompt?: string;
  maxIterations?: number;
}

export function createAgent(config: AgentConfig = {}) {
  const projectRoot = config.projectRoot ?? process.cwd();
  const maxIterations = config.maxIterations ?? 10;
  const llm = createLLM();
  const ctx = {
    projectRoot,
    designSystemPath: projectRoot,
  };

  const defaultSystem =
    config.systemPrompt ??
    [
      `You are VIB AI Agent — an intelligent game prediction platform agent.`,
      `You run on a Mac with: Claude Code (planner) + DeepSeek API (executor) + OpenClaw (skills).`,
      ``,
      `## Behavior`,
      `- Analyze tasks step by step before acting`,
      `- Use available tools to gather information and execute actions`,
      `- If a tool call fails, try an alternative approach`,
      `- Respond in the same language as the user's input`,
      renderToolInstructions(),
    ].join("\n");

  /** Main interaction: user message in → agent response out */
  async function run(userInput: string): Promise<string> {
    const messages: LLMMessage[] = [
      { role: "system", content: defaultSystem },
      { role: "user", content: userInput },
    ];

    for (let i = 0; i < maxIterations; i++) {
      const response = await llm.chat(messages);
      messages.push({ role: "assistant", content: response });

      // Check for tool call pattern: {"tool":"...","args":{...}}
      const toolMatch = response.match(/\{"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{.*?\})\s*\}/s);
      if (!toolMatch) {
        // No tool call — return final response
        return response;
      }

      const toolName = toolMatch[1]!;
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolMatch[2]!);
      } catch {
        return response; // malformed — return as-is
      }

      try {
        const result = await executeToolCall(toolName, args, ctx);
        messages.push({
          role: "user",
          content: `Tool "${toolName}" returned:\n\`\`\`\n${result}\n\`\`\`\nContinue with the task.`,
        });
      } catch (err) {
        messages.push({
          role: "user",
          content: `Tool "${toolName}" error: ${err}`,
        });
      }
    }

    return "Max iterations reached without resolution.";
  }

  /** Stream the agent response */
  async function* runStream(userInput: string): AsyncGenerator<string> {
    const messages: LLMMessage[] = [
      { role: "system", content: defaultSystem },
      { role: "user", content: userInput },
    ];

    for (let i = 0; i < maxIterations; i++) {
      const response = await llm.chat(messages);
      messages.push({ role: "assistant", content: response });

      const toolMatch = response.match(/\{"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{.*?\})\s*\}/s);
      if (!toolMatch) {
        yield response;
        return;
      }

      const toolName = toolMatch[1]!;
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolMatch[2]!);
      } catch {
        yield response;
        return;
      }

      try {
        const result = await executeToolCall(toolName, args, ctx);
        messages.push({
          role: "user",
          content: `Tool "${toolName}" returned:\n\`\`\`\n${result}\n\`\`\`\nContinue.`,
        });
      } catch (err) {
        messages.push({
          role: "user",
          content: `Tool "${toolName}" error: ${err}`,
        });
      }
    }
  }

  return { run, runStream };
}
