import { describe, it, expect } from "vitest";

// Skip in CI — requires DEEPSEEK_API_KEY for real API calls
const it_ci = process.env.CI ? it.skip : it;
import { runWorkflow } from "../src/workflow.js";

describe("Workflow", () => {
  it_ci("should complete a workflow cycle", async () => {
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
