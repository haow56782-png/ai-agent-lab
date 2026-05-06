import { describe, it, expect } from "vitest";
import { createStateStore, MemoryStateStore } from "../../src/state/index.js";

describe("StateStore Agent Integration", () => {
  // ─── Trace Span Persistence ───────────────────────────────

  describe("trace span persistence", () => {
    it("should persist spans via MemoryStateStore and read them back", async () => {
      const store = new MemoryStateStore();
      await store.init();

      const spans = [
        { id: "sp1", traceId: "t1", spanId: "a", name: "agent.start", startMs: 100 },
        { id: "sp2", traceId: "t1", spanId: "b", name: "llm.chat", startMs: 200, parentSpanId: "a" },
        { id: "sp3", traceId: "t1", spanId: "c", name: "agent.end", startMs: 300 },
      ];
      for (const s of spans) await store.saveTraceSpan(s);

      const loaded = await store.queryRecentTraces();
      expect(loaded).toHaveLength(3);
      // queryRecentTraces returns most recent first (descending startMs)
      expect(loaded[0]!.name).toBe("agent.end");
      expect(loaded[1]!.name).toBe("llm.chat");
      expect(loaded[1]!.parentSpanId).toBe("a");
    });

    it("should persist spans with metadata", async () => {
      const store = new MemoryStateStore();
      await store.init();

      await store.saveTraceSpan({
        id: "sp1", traceId: "t1", spanId: "a",
        name: "llm.chat", startMs: 0,
        metadata: JSON.stringify({ model: "deepseek-chat", tokens: 150 }),
      });

      const loaded = await store.queryRecentTraces();
      expect(loaded[0]!.metadata).toBe('{"model":"deepseek-chat","tokens":150}');
    });

    it("should handle empty trace query", async () => {
      const store = new MemoryStateStore();
      await store.init();

      const loaded = await store.queryRecentTraces();
      expect(loaded).toHaveLength(0);
    });
  });

  // ─── Metrics Snapshot Persistence ─────────────────────────

  describe("metrics snapshot persistence", () => {
    it("should persist snapshots via MemoryStateStore and read them back", async () => {
      const store = new MemoryStateStore();
      await store.init();

      await store.saveMetricsSnapshot({
        id: "m1", model: "deepseek-chat",
        llmCalls: 5, toolCalls: 2, totalTokens: 15000,
        avgLatencyMs: 1200, successRate: 1.0,
        snapshotAt: "2026-05-06T12:00:00Z",
      });

      const list = await store.listMetricsSnapshots();
      expect(list).toHaveLength(1);
      expect(list[0]!.llmCalls).toBe(5);
      expect(list[0]!.avgLatencyMs).toBe(1200);
      expect(list[0]!.successRate).toBe(1.0);
    });

    it("should filter snapshots by sessionId", async () => {
      const store = new MemoryStateStore();
      await store.init();

      await store.saveMetricsSnapshot({
        id: "m1", sessionId: "s1", model: "m1",
        llmCalls: 1, toolCalls: 0, totalTokens: 100,
        snapshotAt: "2026-05-06T12:00:00Z",
      });
      await store.saveMetricsSnapshot({
        id: "m2", model: "m2",
        llmCalls: 2, toolCalls: 0, totalTokens: 200,
        snapshotAt: "2026-05-06T12:01:00Z",
      });

      expect(await store.listMetricsSnapshots("s1")).toHaveLength(1);
      expect(await store.listMetricsSnapshots()).toHaveLength(2);
    });
  });

  // ─── SQLite Integration ───────────────────────────────────

  describe("SQLite persistence integration", () => {
    it("should persist traces through SQLite and read them back", async () => {
      const store = createStateStore({ dbPath: ":memory:" });
      await store.init();

      await store.saveTraceSpan({
        id: "sp1", traceId: "tr1", spanId: "s1",
        name: "test", startMs: 100, durationMs: 50,
      });

      const traces = await store.queryRecentTraces();
      expect(traces).toHaveLength(1);
      expect(traces[0]!.name).toBe("test");
      expect(traces[0]!.durationMs).toBe(50);

      await store.close();
    });

    it("should persist metrics through SQLite and read them back", async () => {
      const store = createStateStore({ dbPath: ":memory:" });
      await store.init();

      await store.saveMetricsSnapshot({
        id: "m1", model: "deepseek-chat",
        llmCalls: 3, toolCalls: 1, totalTokens: 5000,
        snapshotAt: "2026-05-06T12:00:00Z",
      });

      const list = await store.listMetricsSnapshots();
      expect(list).toHaveLength(1);
      expect(list[0]!.model).toBe("deepseek-chat");

      await store.close();
    });

    it("should handle closed database gracefully (fallback path)", async () => {
      const store = createStateStore({ dbPath: ":memory:" });
      await store.init();
      await store.close();

      await expect(store.queryRecentTraces()).rejects.toThrow();
      await expect(store.listMetricsSnapshots()).rejects.toThrow();
    });
  });
});
