import { describe, it, expect } from "vitest";
import { createAgent } from "../src/agent.js";
import { registerTool } from "../src/tools/index.js";

/** Create a mock LLM with configurable behavior. */
function createMockLLM(options: {
  responses?: string[];
  failOnCall?: number;
  failWith?: string;
}) {
  let callCount = 0;
  return {
    chat: async () => {
      const current = callCount++;
      if (options.failOnCall !== undefined && current >= options.failOnCall) {
        throw new Error(options.failWith ?? "Mock LLM failure");
      }
      if (options.responses) {
        return options.responses[current] ?? "ok";
      }
      return "Mock response";
    },
    stream: async function* () {
      if (options.failOnCall !== undefined && options.failOnCall <= 0) {
        throw new Error(options.failWith ?? "Mock LLM failure");
      }
      yield "mock";
    },
    client: {} as ReturnType<typeof import("../src/llm.js").createLLM>["client"],
  } as ReturnType<typeof import("../src/llm.js").createLLM>;
}

describe("Agent", () => {
  it("should create agent without throwing", () => {
    const agent = createAgent({ projectRoot: "/tmp" });
    expect(agent).toBeDefined();
    expect(typeof agent.run).toBe("function");
    expect(typeof agent.runStream).toBe("function");
  });

  it("should accept custom system prompt", () => {
    const agent = createAgent({
      systemPrompt: "Custom system prompt",
      projectRoot: "/tmp",
    });
    expect(agent).toBeDefined();
  });

  it("runStream should return async generator", () => {
    const agent = createAgent({ projectRoot: "/tmp" });
    const stream = agent.runStream("test");
    expect(typeof stream[Symbol.asyncIterator]).toBe("function");
  });

  // ─── Graceful Degradation ────────────────────────────────

  describe("graceful degradation", () => {
    it("should return graceful fallback on LLM failure", async () => {
      const agent = createAgent({
        projectRoot: "/tmp",
        llm: createMockLLM({ failOnCall: 0, failWith: "API rate limited" }),
      });
      const response = await agent.run("test input");
      expect(response).toContain("Agent error");
      expect(response).toContain("API rate limited");
    });

    it("should handle tool call error gracefully and continue", async () => {
      registerTool(
        {
          name: "erratic_tool",
          description: "Tool that errors",
          parameters: { type: "object", properties: {}, required: [] },
        },
        async () => {
          throw new Error("Tool internal error");
        },
      );

      const agent = createAgent({
        projectRoot: "/tmp",
        llm: createMockLLM({
          responses: [
            '{"tool":"erratic_tool","args":{}}',
            "Here is the final answer after tool error.",
          ],
        }),
        maxIterations: 3,
      });
      const response = await agent.run("test");
      // Agent should recover from tool error and produce final answer
      expect(response).toContain("final answer");
    });

    it("should handle tool timeout and continue iteration", async () => {
      registerTool(
        {
          name: "timeout_recovery",
          description: "Tool for timeout recovery test",
          parameters: { type: "object", properties: {}, required: [] },
        },
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return "done";
        },
      );

      const agent = createAgent({
        projectRoot: "/tmp",
        llm: createMockLLM({
          responses: [
            '{"tool":"timeout_recovery","args":{}}',
            "Recovered after timeout.",
          ],
        }),
        maxIterations: 3,
      });
      const response = await agent.run("test");
      expect(response).toContain("Recovered after timeout");
    });
  });
});
