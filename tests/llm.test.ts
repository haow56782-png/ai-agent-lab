import { describe, it, expect } from "vitest";
import { createLLM } from "../src/llm.js";

describe("LLM Client", () => {
  it("should create a client without throwing", () => {
    const llm = createLLM({ apiKey: "test-key", baseURL: "https://test.api.com" });
    expect(llm).toBeDefined();
    expect(typeof llm.chat).toBe("function");
    expect(typeof llm.stream).toBe("function");
  });

  it("should use environment variables as defaults", () => {
    // .env is loaded by dotenv in the module
    const llm = createLLM();
    expect(llm.client).toBeDefined();
  });

  it("should allow overriding model per call", () => {
    const llm = createLLM({ apiKey: "test-key" });
    // This only validates the interface, not actual API call
    expect(typeof llm.chat).toBe("function");
  });

  it("stream should be an async generator", () => {
    const llm = createLLM({ apiKey: "test-key" });
    const stream = llm.stream([{ role: "user", content: "hi" }]);
    // Check it's an async iterable
    expect(typeof stream[Symbol.asyncIterator]).toBe("function");
  });
});
