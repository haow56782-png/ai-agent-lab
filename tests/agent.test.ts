import { describe, it, expect } from "vitest";
import { createAgent } from "../src/agent.js";

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
});
