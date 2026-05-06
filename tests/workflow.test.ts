import { describe, it, expect } from "vitest";

// Skip in CI — requires DEEPSEEK_API_KEY for real API calls
const it_ci = process.env.CI ? it.skip : it;
import { runWorkflow, needsRefinement } from "../src/workflow.js";

describe("needsRefinement", () => {
  it("should return false for negation patterns", () => {
    expect(needsRefinement("No issues found, looks good")).toBe(false);
    expect(needsRefinement("I found no errors in the code")).toBe(false);
    expect(needsRefinement("Everything looks good, no fix needed")).toBe(false);
    expect(needsRefinement("No bug detected, all clear")).toBe(false);
  });

  it("should return false for clean reviews", () => {
    expect(needsRefinement("The output is correct and complete.")).toBe(false);
    expect(needsRefinement("Good work, approved.")).toBe(false);
  });

  it("should return true for genuine issue mentions", () => {
    expect(needsRefinement("Issue: the output is missing error handling")).toBe(true);
    expect(needsRefinement("Found a bug in the logic")).toBe(true);
    expect(needsRefinement("The formatting is incorrect")).toBe(true);
    expect(needsRefinement("Need to fix the timeout handling")).toBe(true);
  });

  it("should return true for mixed content with real issues", () => {
    const review = "The code compiles but there is an error in the edge case handling";
    expect(needsRefinement(review)).toBe(true);
  });
});

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
