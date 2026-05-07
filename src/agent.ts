import type { LLMMessage } from "./llm.js";
import { createLLM } from "./llm.js";
import { executeToolCall, renderToolInstructions } from "./tools/index.js";
import { logger } from "./logger.js";
import { beginTrace, beginSpan, endSpan } from "./tracer.js";
import { setSession } from "./telemetry.js";
import { get as getConfig } from "./config.js";
import { classifyTask, selectModel, boundaryRequiresOpus, BOUNDARY_ENFORCEMENT_MESSAGE } from "./boundary.js";

export interface AgentConfig {
  projectRoot?: string;
  systemPrompt?: string;
  maxIterations?: number;
  sessionId?: string;
  /** Injectable LLM client for testing. Falls back to createLLM() if omitted. */
  llm?: ReturnType<typeof createLLM>;
  /** Enable E0–E3 boundary-aware model selection in run(). */
  enableBoundaryRouting?: boolean;
  /** Opus model name for E2/E3 execution. Falls through to DeepSeek if unset. */
  opusModel?: string;
}

export function createAgent(config: AgentConfig = {}) {
  const projectRoot = config.projectRoot ?? process.cwd();
  const maxIterations = config.maxIterations ?? getConfig<number>("agent.maxIterations");
  const llm = config.llm ?? createLLM();
  const enableBoundaryRouting = config.enableBoundaryRouting ?? false;
  const opusModel = config.opusModel ?? getConfig<string | undefined>("llm.opusModel");
  const ctx = {
    projectRoot,
    designSystemPath: projectRoot,
    toolTimeoutMs: getConfig<number>("llm.timeoutMs"),
  };

  if (config.sessionId) {
    setSession(config.sessionId);
  }

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
    const traceId = beginTrace();
    logger.setTraceId(traceId);
    logger.info("agent.run.start", { input: userInput, maxIterations });

    // E0–E3 boundary classification and model selection
    let effectiveModel: string | undefined;
    if (enableBoundaryRouting) {
      const bd = classifyTask(userInput);
      const model = selectModel(bd.boundary, opusModel);
      logger.info("agent.boundary", {
        boundary: bd.boundary,
        recommendedExecutor: bd.recommendedExecutor,
        model,
        requiresPlan: bd.requiresPlan,
        requiresArbitration: bd.requiresArbitration,
      });

      if (boundaryRequiresOpus(bd.boundary) && !opusModel) {
        logger.warn("agent.boundary.enforced", {
          boundary: bd.boundary,
          message: "E2/E3 blocked — no Opus model configured",
        });
        return BOUNDARY_ENFORCEMENT_MESSAGE;
      }

      // Only pass model override for non-default (E2/E3) boundaries
      if (bd.boundary === "E2" || bd.boundary === "E3") {
        effectiveModel = opusModel;
      }
    }

    const messages: LLMMessage[] = [
      { role: "system", content: defaultSystem },
      { role: "user", content: userInput },
    ];

    for (let i = 0; i < maxIterations; i++) {
      const iterSpan = beginSpan("agent.iteration", { iteration: i + 1 });
      logger.info("agent.iteration", { iteration: i + 1 });

      let response: string;
      try {
        response = await llm.chat(messages, effectiveModel ? { model: effectiveModel } : undefined);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error("agent.llm_failed", { error, iteration: i + 1 });
        endSpan(iterSpan, { resolved: false, error });
        return `[Agent error: ${error}]`;
      }
      messages.push({ role: "assistant", content: response });

      // Check for tool call pattern: {"tool":"...","args":{...}}
      const toolMatch = response.match(/\{"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{.*?\})\s*\}/s);
      if (!toolMatch) {
        endSpan(iterSpan, { resolved: true });
        logger.info("agent.run.complete", { iterations: i + 1, traceId });
        return response;
      }

      const toolName = toolMatch[1]!;
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolMatch[2]!);
      } catch {
        endSpan(iterSpan, { resolved: true });
        logger.info("agent.run.complete", { iterations: i + 1, traceId });
        return response; // malformed — return as-is
      }

      try {
        const result = await executeToolCall(toolName, args, ctx);
        messages.push({
          role: "user",
          content: `Tool "${toolName}" returned:\n\`\`\`\n${result}\n\`\`\`\nContinue with the task.`,
        });
      } catch (err) {
        logger.error("agent.tool_error", { tool: toolName, error: String(err) });
        messages.push({
          role: "user",
          content: `Tool "${toolName}" error: ${err}`,
        });
      }

      endSpan(iterSpan, { resolved: false });
    }

    logger.warn("agent.max_iterations", { maxIterations, traceId });
    return "Max iterations reached without resolution.";
  }

  /** Stream the agent response */
  async function* runStream(userInput: string): AsyncGenerator<string> {
    const traceId = beginTrace();
    logger.setTraceId(traceId);
    logger.info("agent.stream.start", { input: userInput, maxIterations });

    // E0–E3 boundary classification and model selection
    let effectiveModel: string | undefined;
    if (enableBoundaryRouting) {
      const bd = classifyTask(userInput);
      const model = selectModel(bd.boundary, opusModel);
      logger.info("agent.stream.boundary", {
        boundary: bd.boundary,
        recommendedExecutor: bd.recommendedExecutor,
        model,
      });

      if (boundaryRequiresOpus(bd.boundary) && !opusModel) {
        yield BOUNDARY_ENFORCEMENT_MESSAGE;
        return;
      }

      // Only pass model override for non-default (E2/E3) boundaries
      if (bd.boundary === "E2" || bd.boundary === "E3") {
        effectiveModel = opusModel;
      }
    }

    const messages: LLMMessage[] = [
      { role: "system", content: defaultSystem },
      { role: "user", content: userInput },
    ];

    for (let i = 0; i < maxIterations; i++) {
      const iterSpan = beginSpan("agent.iteration", { iteration: i + 1 });

      let response: string;
      try {
        response = await llm.chat(messages, effectiveModel ? { model: effectiveModel } : undefined);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        logger.error("agent.llm_failed", { error, iteration: i + 1 });
        endSpan(iterSpan, { resolved: false, error });
        yield `[Agent error: ${error}]`;
        return;
      }
      messages.push({ role: "assistant", content: response });

      const toolMatch = response.match(/\{"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{.*?\})\s*\}/s);
      if (!toolMatch) {
        endSpan(iterSpan, { resolved: true });
        logger.info("agent.stream.complete", { iterations: i + 1 });
        yield response;
        return;
      }

      const toolName = toolMatch[1]!;
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolMatch[2]!);
      } catch {
        endSpan(iterSpan, { resolved: true });
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
        logger.error("agent.tool_error", { tool: toolName, error: String(err) });
        messages.push({
          role: "user",
          content: `Tool "${toolName}" error: ${err}`,
        });
      }

      endSpan(iterSpan, { resolved: false });
    }
  }

  return { run, runStream };
}
