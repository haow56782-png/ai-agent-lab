import { describe, it, expect, vi } from "vitest";
import { runWorkflow } from "../../src/workflow.js";

describe("Workflow Capability", () => {
  it("should complete all stages even with minimal input", async () => {
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

  it("should include refined stage when review finds issues", async () => {
    const result = await runWorkflow("reply with the word hello only", {
      systemPrompt: "You are critical. In your review, always mention the word 'issue'.",
    });

    expect(result.stages).toBeGreaterThanOrEqual(3);

    // If review included "issue", refined should exist
    if (result.review.toLowerCase().includes("issue")) {
      expect(result.refined).toBeTruthy();
    }
  }, 20000);
});
