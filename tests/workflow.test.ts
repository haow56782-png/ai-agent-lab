import { describe, it, expect } from "vitest";
import { runWorkflow } from "../src/workflow.js";

describe("Workflow", () => {
  it("should complete a workflow cycle", async () => {
    // NOTE: this is an integration test that calls the real DeepSeek API
    const result = await runWorkflow("say hello in one word", {
      systemPrompt: "You are a helpful assistant. Keep responses brief.",
    });

    expect(result).toBeDefined();
    expect(typeof result.plan).toBe("string");
    expect(typeof result.output).toBe("string");
    expect(typeof result.review).toBe("string");
    expect(result.stages).toBeGreaterThanOrEqual(3);
  }, 30000);
});
