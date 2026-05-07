import { describe, it, expect } from "vitest";
import { classifyTask, selectModel, boundaryRequiresOpus, BOUNDARY_ENFORCEMENT_MESSAGE } from "../src/boundary.js";
import { createAgent } from "../src/agent.js";
import type { ExecutionBoundary } from "../src/governance/review/external-review-policy.js";

describe("classifyTask", () => {
  it("implementation task → E0", () => {
    const result = classifyTask("I want to play dice with bankroll 500");
    expect(result.boundary).toBe("E0");
    expect(result.recommendedExecutor).toBe("deepseek");
    expect(result.requiresPlan).toBe(false);
    expect(result.requiresArbitration).toBe(false);
  });

  it("test-only task → E0", () => {
    const result = classifyTask("Run the test suite for the prediction module");
    expect(result.boundary).toBe("E0");
  });

  it("governance invariant task → E3", () => {
    const result = classifyTask("Update the security governance invariant rules");
    expect(result.boundary).toBe("E3");
    expect(result.recommendedExecutor).toBe("claude-opus");
    expect(result.requiresPlan).toBe(true);
    expect(result.requiresArbitration).toBe(true);
  });

  it("model routing protocol task → E3", () => {
    const result = classifyTask("Change the model routing protocol to support GPT-5");
    expect(result.boundary).toBe("E3");
  });

  it("freeze gate task → E3", () => {
    const result = classifyTask("Modify the freeze gate state machine transitions");
    expect(result.boundary).toBe("E3");
  });

  it("arbitration ownership task → E3", () => {
    const result = classifyTask("Who holds arbitration authority for this domain");
    expect(result.boundary).toBe("E3");
  });

  it("review policy task → E2", () => {
    const result = classifyTask("Update the external review policy for L2 triggers");
    expect(result.boundary).toBe("E2");
    expect(result.recommendedExecutor).toBe("claude-opus");
    expect(result.requiresPlan).toBe(true);
    expect(result.requiresArbitration).toBe(false);
  });

  it("drift detection task → E2", () => {
    const result = classifyTask("Change the architecture drift detection logic");
    expect(result.boundary).toBe("E2");
  });

  it("review runner task → E2", () => {
    const result = classifyTask("Fix the review runner flow for cost guard");
    expect(result.boundary).toBe("E2");
  });

  it("empty input → E0", () => {
    const result = classifyTask("");
    expect(result.boundary).toBe("E0");
  });

  it("unrecognized input → E0", () => {
    const result = classifyTask("Hello, how are you?");
    expect(result.boundary).toBe("E0");
  });

  it("secret management task → E3", () => {
    const result = classifyTask("Update how API keys are managed in the secret boundary");
    expect(result.boundary).toBe("E3");
  });

  it("architecture diff task → E2", () => {
    const result = classifyTask("Add new rules to the architecture diff check");
    expect(result.boundary).toBe("E2");
  });
});

describe("selectModel", () => {
  it("E0 → deepseek", () => {
    expect(selectModel("E0" as ExecutionBoundary)).toBe("deepseek");
  });

  it("E1 → deepseek", () => {
    expect(selectModel("E1" as ExecutionBoundary)).toBe("deepseek");
  });

  it("E2 → opus when configured", () => {
    expect(selectModel("E2" as ExecutionBoundary, "claude-opus-4-5")).toBe("claude-opus-4-5");
  });

  it("E3 → opus when configured", () => {
    expect(selectModel("E3" as ExecutionBoundary, "claude-opus-4-5")).toBe("claude-opus-4-5");
  });

  it("E2 → deepseek when opus not configured", () => {
    expect(selectModel("E2" as ExecutionBoundary)).toBe("deepseek");
  });

  it("E3 → deepseek when opus not configured", () => {
    expect(selectModel("E3" as ExecutionBoundary)).toBe("deepseek");
  });
});

describe("boundaryRequiresOpus", () => {
  it("E0 → false", () => expect(boundaryRequiresOpus("E0" as ExecutionBoundary)).toBe(false));
  it("E1 → false", () => expect(boundaryRequiresOpus("E1" as ExecutionBoundary)).toBe(false));
  it("E2 → true", () => expect(boundaryRequiresOpus("E2" as ExecutionBoundary)).toBe(true));
  it("E3 → true", () => expect(boundaryRequiresOpus("E3" as ExecutionBoundary)).toBe(true));
});

describe("Agent boundary integration", () => {
  it("E0 task with mock LLM passes through normally", async () => {
    const agent = createAgent({
      projectRoot: "/tmp",
      enableBoundaryRouting: true,
      llm: {
        chat: async () => "mock response",
        stream: async function* () { yield "mock"; },
        client: {} as ReturnType<typeof import("../src/llm.js").createLLM>["client"],
      } as ReturnType<typeof import("../src/llm.js").createLLM>,
    });
    const response = await agent.run("play dice with bankroll 500");
    expect(response).toBe("mock response");
  });

  it("E3 task without Opus returns enforcement message", async () => {
    const agent = createAgent({
      projectRoot: "/tmp",
      enableBoundaryRouting: true,
      // no opusModel set
      llm: {
        chat: async () => "should not be called",
        stream: async function* () { yield "should not be called"; },
        client: {} as ReturnType<typeof import("../src/llm.js").createLLM>["client"],
      } as ReturnType<typeof import("../src/llm.js").createLLM>,
    });
    const response = await agent.run("change the model routing protocol");
    expect(response).toContain("E2/E3 boundary");
    expect(response).toContain("Set LLM_OPUS_MODEL");
  });

  it("E2 task without Opus returns enforcement message", async () => {
    const agent = createAgent({
      projectRoot: "/tmp",
      enableBoundaryRouting: true,
      llm: {
        chat: async () => "should not be called",
        stream: async function* () { yield "should not be called"; },
        client: {} as ReturnType<typeof import("../src/llm.js").createLLM>["client"],
      } as ReturnType<typeof import("../src/llm.js").createLLM>,
    });
    const response = await agent.run("update the external review policy");
    expect(response).toContain("E2/E3 boundary");
  });

  it("E3 task with Opus configured routes to Opus model", async () => {
    let capturedModel: string | undefined;
    const agent = createAgent({
      projectRoot: "/tmp",
      enableBoundaryRouting: true,
      opusModel: "claude-opus-test",
      llm: {
        chat: async (_messages: unknown[], overrides?: { model?: string }) => {
          capturedModel = overrides?.model;
          return "opus response";
        },
        stream: async function* () { yield "mock"; },
        client: {} as ReturnType<typeof import("../src/llm.js").createLLM>["client"],
      } as ReturnType<typeof import("../src/llm.js").createLLM>,
    });
    const response = await agent.run("change the model routing protocol");
    expect(capturedModel).toBe("claude-opus-test");
    expect(response).toBe("opus response");
  });

  it("E2 task with Opus configured routes to Opus model", async () => {
    let capturedModel: string | undefined;
    const agent = createAgent({
      projectRoot: "/tmp",
      enableBoundaryRouting: true,
      opusModel: "claude-opus-test",
      llm: {
        chat: async (_messages: unknown[], overrides?: { model?: string }) => {
          capturedModel = overrides?.model;
          return "opus plan response";
        },
        stream: async function* () { yield "mock"; },
        client: {} as ReturnType<typeof import("../src/llm.js").createLLM>["client"],
      } as ReturnType<typeof import("../src/llm.js").createLLM>,
    });
    const response = await agent.run("update the external review policy");
    expect(capturedModel).toBe("claude-opus-test");
    expect(response).toBe("opus plan response");
  });

  it("boundary routing disabled: E3 task executes normally", async () => {
    const agent = createAgent({
      projectRoot: "/tmp",
      enableBoundaryRouting: false, // boundary routing OFF
      llm: {
        chat: async () => "deepseek response",
        stream: async function* () { yield "mock"; },
        client: {} as ReturnType<typeof import("../src/llm.js").createLLM>["client"],
      } as ReturnType<typeof import("../src/llm.js").createLLM>,
    });
    const response = await agent.run("change the model routing protocol");
    expect(response).toBe("deepseek response");
  });

  it("E0 task still works with opusModel configured", async () => {
    let capturedModel: string | undefined;
    const agent = createAgent({
      projectRoot: "/tmp",
      enableBoundaryRouting: true,
      opusModel: "claude-opus-test", // configured but E0 doesn't need it
      llm: {
        chat: async (_messages: unknown[], overrides?: { model?: string }) => {
          capturedModel = overrides?.model;
          return "deepseek response";
        },
        stream: async function* () { yield "mock"; },
        client: {} as ReturnType<typeof import("../src/llm.js").createLLM>["client"],
      } as ReturnType<typeof import("../src/llm.js").createLLM>,
    });
    const response = await agent.run("play dice");
    // E0 → model override is "deepseek" which is the default — no override passed
    expect(capturedModel).toBeUndefined();
    expect(response).toBe("deepseek response");
  });
});
