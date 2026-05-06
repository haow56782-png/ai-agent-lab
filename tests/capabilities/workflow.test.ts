import { describe, it, expect, vi } from "vitest";

// Skip in CI — requires DEEPSEEK_API_KEY for real API calls
const it_ci = process.env.CI ? it.skip : it;
import { runWorkflow } from "../../src/workflow.js";

describe("Workflow Capability", () => {
  it_ci("should complete all stages even with minimal input", async () => {
    // Uses a concise system prompt to keep LLM calls fast
    const result = await runWorkflow("say hello", {
      systemPrompt: "You are terse. Keep responses under 10 words.",
    });

    expect(result).toBeDefined();
    expect(result.plan).toBeTruthy();
    expect(result.output).toBeTruthy();
    expect(result.review).toBeTruthy();
    expect(result.stages).toBeGreaterThanOrEqual(3);
  }, 30000);

  it_ci("should handle any refinement decision gracefully", async () => {
    // This test validates that the workflow completes regardless of
    // whether refinement triggers. The refine-or-not logic itself
    // is tested deterministically in tests/workflow.test.ts.
    const result = await runWorkflow("reply with the word hello only", {
      systemPrompt: "You are terse. Keep responses under 10 words.",
    });

    expect(result).toBeDefined();
    expect(typeof result.plan).toBe("string");
    expect(typeof result.output).toBe("string");
    expect(typeof result.review).toBe("string");
    expect(result.stages).toBeGreaterThanOrEqual(3);

    // Refinement may or may not fire — both are valid outcomes
    if (result.refined) {
      expect(typeof result.refined).toBe("string");
    }
  }, 20000);
});
