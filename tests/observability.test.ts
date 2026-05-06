import { describe, it, expect, beforeEach } from "vitest";
import { get as getConfig } from "../src/config.js";
import { logger } from "../src/logger.js";
import { beginTrace, beginSpan, endSpan, getSpans } from "../src/tracer.js";
import { recordLLMCall, recordToolCall, formatMetrics, getSessionMetrics, setSession } from "../src/telemetry.js";

describe("Config", () => {
  it("should return default values", () => {
    expect(getConfig<number>("llm.temperature")).toBe(0.7);
    expect(getConfig<number>("llm.maxTokens")).toBe(4096);
    expect(getConfig<string>("llm.model")).toBe("deepseek-chat");
    expect(getConfig<number>("llm.timeoutMs")).toBe(30000);
    expect(getConfig<number>("llm.retry.max")).toBe(3);
    expect(getConfig<number>("agent.maxIterations")).toBe(10);
  });
});

describe("Logger", () => {
  it("should have expected log methods", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("should accept traceId", () => {
    logger.setTraceId("test-trace");
    logger.info("test.message", { key: "value" });
    logger.setTraceId(undefined);
  });
});

describe("Tracer", () => {
  beforeEach(() => {
    // Reset by starting a fresh trace
    beginTrace();
  });

  it("should create and end spans", () => {
    const span = beginSpan("test.span", { foo: "bar" });
    expect(span.name).toBe("test.span");
    expect(span.metadata.foo).toBe("bar");
    expect(span.spanId).toBeTruthy();
    expect(span.startMs).toBeGreaterThan(0);

    endSpan(span, { result: "ok" });
    expect(span.durationMs).toBeGreaterThanOrEqual(0);
    expect(span.endMs).toBeGreaterThan(0);
    expect(span.metadata.result).toBe("ok");
  });

  it("should nest spans via stack", () => {
    const parent = beginSpan("parent");
    const child = beginSpan("child");
    expect(child.parentSpanId).toBe(parent.spanId);
    endSpan(child);
    endSpan(parent);
  });

  it("should record spans", () => {
    beginTrace();
    beginSpan("span1");
    beginSpan("span2");
    const spans = getSpans();
    expect(spans.length).toBe(2);
  });
});

let testCounter = 0;

describe("Telemetry", () => {
  beforeEach(() => {
    setSession(`test-${testCounter++}`);
  });

  it("should record LLM calls", () => {
    recordLLMCall({
      model: "deepseek-chat",
      latencyMs: 100,
      promptTokens: 50,
      completionTokens: 30,
      totalTokens: 80,
      success: true,
    });

    const metrics = getSessionMetrics();
    expect(metrics.llmCalls).toHaveLength(1);
    expect(metrics.llmCalls[0]!.model).toBe("deepseek-chat");
    expect(metrics.llmCalls[0]!.totalTokens).toBe(80);
  });

  it("should record tool calls", () => {
    recordToolCall({
      name: "predict_game",
      latencyMs: 200,
      success: true,
    });

    const metrics = getSessionMetrics();
    expect(metrics.toolCalls).toHaveLength(1);
    expect(metrics.toolCalls[0]!.name).toBe("predict_game");
  });

  it("should record failed calls", () => {
    recordLLMCall({
      model: "deepseek-chat",
      latencyMs: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      success: false,
      error: "rate limit exceeded",
    });

    const metrics = getSessionMetrics();
    expect(metrics.llmCalls[0]!.success).toBe(false);
    expect(metrics.llmCalls[0]!.error).toBe("rate limit exceeded");
  });

  it("should format metrics report", () => {
    recordLLMCall({
      model: "deepseek-chat",
      latencyMs: 150,
      promptTokens: 50,
      completionTokens: 30,
      totalTokens: 80,
      success: true,
    });
    recordToolCall({
      name: "predict_game",
      latencyMs: 200,
      success: true,
    });

    const report = formatMetrics();
    expect(report).toContain("LLM Calls");
    expect(report).toContain("Tool Calls");
    expect(report).not.toContain("No metrics recorded.");
  });

  it("should return empty for unknown session", () => {
    const metrics = getSessionMetrics("nonexistent");
    expect(metrics.llmCalls).toHaveLength(0);
    expect(metrics.toolCalls).toHaveLength(0);
  });
});
