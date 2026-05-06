import { describe, it, expect, vi } from "vitest";

describe("Config env override", () => {
  it("should read env var when set before module load", async () => {
    process.env.LLM_TEMPERATURE = "0.1";
    vi.resetModules();
    const { get } = await import("../src/config.js");
    expect(get<number>("llm.temperature")).toBe(0.1);
    delete process.env.LLM_TEMPERATURE;
  });
});
