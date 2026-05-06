import { describe, it, expect } from "vitest";
import { MemoryStateStore } from "../../src/state/memory-store.js";

describe("MemoryStateStore", () => {
  function makeStore() {
    return new MemoryStateStore();
  }

  // ─── Sessions ─────────────────────────────────────────

  describe("sessions", () => {
    it("should save and load a session", async () => {
      const store = makeStore();
      await store.init();
      await store.saveSession({
        id: "s1",
        traceId: "trace-1",
        startedAt: "2026-05-06T10:00:00Z",
      });
      const loaded = await store.loadSession("s1");
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe("s1");
      expect(loaded!.traceId).toBe("trace-1");
    });

    it("should return null for missing session", async () => {
      const store = makeStore();
      await store.init();
      const loaded = await store.loadSession("nonexistent");
      expect(loaded).toBeNull();
    });

    it("should list sessions in reverse chronological order", async () => {
      const store = makeStore();
      await store.init();
      await store.saveSession({ id: "s1", startedAt: "2026-05-06T10:00:00Z" });
      await store.saveSession({ id: "s2", startedAt: "2026-05-06T11:00:00Z" });
      await store.saveSession({ id: "s3", startedAt: "2026-05-06T09:00:00Z" });
      const list = await store.listSessions();
      expect(list.map((s) => s.id)).toEqual(["s2", "s1", "s3"]);
    });

    it("should respect limit and offset", async () => {
      const store = makeStore();
      await store.init();
      for (let i = 1; i <= 10; i++) {
        const iso = `2026-05-06T${String(i).padStart(2, "0")}:00:00Z`;
        await store.saveSession({ id: `s${i}`, startedAt: iso });
      }
      const page1 = await store.listSessions(3, 0);
      expect(page1).toHaveLength(3);
      expect(page1[0]!.id).toBe("s10");
      const page2 = await store.listSessions(3, 3);
      expect(page2).toHaveLength(3);
      expect(page2[0]!.id).toBe("s7");
    });

    it("should update existing session on save", async () => {
      const store = makeStore();
      await store.init();
      await store.saveSession({
        id: "s1",
        startedAt: "2026-05-06T10:00:00Z",
      });
      await store.saveSession({
        id: "s1",
        startedAt: "2026-05-06T10:00:00Z",
        endedAt: "2026-05-06T10:30:00Z",
      });
      const loaded = await store.loadSession("s1");
      expect(loaded!.endedAt).toBe("2026-05-06T10:30:00Z");
    });
  });

  // ─── Workflow Runs ────────────────────────────────────

  describe("workflow runs", () => {
    it("should save and list workflow runs", async () => {
      const store = makeStore();
      await store.init();
      await store.saveWorkflowRun({
        id: "w1",
        sessionId: "s1",
        task: "Test prediction",
        stages: 3,
        status: "completed",
        startedAt: "2026-05-06T10:00:00Z",
      });
      const list = await store.listWorkflowRuns();
      expect(list).toHaveLength(1);
      expect(list[0]!.task).toBe("Test prediction");
    });

    it("should update existing workflow run", async () => {
      const store = makeStore();
      await store.init();
      await store.saveWorkflowRun({
        id: "w1",
        sessionId: "s1",
        task: "Task A",
        stages: 3,
        status: "running",
        startedAt: "2026-05-06T10:00:00Z",
      });
      await store.saveWorkflowRun({
        id: "w1",
        sessionId: "s1",
        task: "Task A",
        stages: 4,
        status: "completed",
        startedAt: "2026-05-06T10:00:00Z",
        endedAt: "2026-05-06T10:05:00Z",
      });
      const list = await store.listWorkflowRuns();
      expect(list).toHaveLength(1);
      expect(list[0]!.status).toBe("completed");
    });
  });

  // ─── Task Runs ────────────────────────────────────────

  describe("task runs", () => {
    it("should save and list task runs by session", async () => {
      const store = makeStore();
      await store.init();
      await store.saveTaskRun({
        id: "t1", sessionId: "s1", taskId: "TASK-001",
        status: "completed", startedAt: "2026-05-06T10:00:00Z",
      });
      await store.saveTaskRun({
        id: "t2", sessionId: "s1", taskId: "TASK-002",
        status: "running", startedAt: "2026-05-06T10:01:00Z",
      });
      await store.saveTaskRun({
        id: "t3", sessionId: "s2", taskId: "TASK-001",
        status: "pending", startedAt: "2026-05-06T11:00:00Z",
      });
      const list = await store.listTaskRuns("s1");
      expect(list).toHaveLength(2);
      expect(list.every((r) => r.sessionId === "s1")).toBe(true);
    });
  });

  // ─── Eval History ─────────────────────────────────────

  describe("eval history", () => {
    it("should append and list eval history", async () => {
      const store = makeStore();
      await store.init();
      await store.appendEvalHistory({
        id: "e1",
        scenario: "prediction-basic",
        result: JSON.stringify({ accuracy: 0.85 }),
        totalTasks: 10,
        passed: 8,
        failed: 2,
        avgScore: 0.8,
        runAt: "2026-05-06T10:00:00Z",
      });
      await store.appendEvalHistory({
        id: "e2",
        scenario: "prediction-edge",
        result: JSON.stringify({ accuracy: 0.75 }),
        totalTasks: 5,
        passed: 4,
        failed: 1,
        avgScore: 0.75,
        runAt: "2026-05-06T11:00:00Z",
      });
      const list = await store.listEvalHistory();
      expect(list).toHaveLength(2);
      expect(list[0]!.id).toBe("e2"); // most recent first
    });
  });

  // ─── Trace Spans ──────────────────────────────────────

  describe("trace spans", () => {
    it("should save and query recent traces", async () => {
      const store = makeStore();
      await store.init();
      await store.saveTraceSpan({
        id: "sp1", traceId: "t1", spanId: "a",
        name: "llm.chat", startMs: 1000,
      });
      await store.saveTraceSpan({
        id: "sp2", traceId: "t1", spanId: "b",
        name: "tool.predict", startMs: 2000,
      });
      const recent = await store.queryRecentTraces();
      expect(recent).toHaveLength(2);
    });

    it("should query traces by traceId ordered by startMs", async () => {
      const store = makeStore();
      await store.init();
      await store.saveTraceSpan({
        id: "sp1", traceId: "trace-abc", spanId: "a",
        name: "step2", startMs: 2000,
      });
      await store.saveTraceSpan({
        id: "sp2", traceId: "trace-abc", spanId: "b",
        name: "step1", startMs: 1000,
      });
      await store.saveTraceSpan({
        id: "sp3", traceId: "trace-xyz", spanId: "c",
        name: "other", startMs: 500,
      });
      const traces = await store.queryTracesByTraceId("trace-abc");
      expect(traces).toHaveLength(2);
      expect(traces[0]!.name).toBe("step1");
      expect(traces[1]!.name).toBe("step2");
    });
  });

  // ─── Metrics Snapshots ────────────────────────────────

  describe("metrics snapshots", () => {
    it("should save and list snapshots", async () => {
      const store = makeStore();
      await store.init();
      await store.saveMetricsSnapshot({
        id: "m1", sessionId: "s1", model: "deepseek-chat",
        llmCalls: 10, toolCalls: 3, totalTokens: 45000,
        snapshotAt: "2026-05-06T10:00:00Z",
      });
      const list = await store.listMetricsSnapshots();
      expect(list).toHaveLength(1);
      expect(list[0]!.model).toBe("deepseek-chat");
    });

    it("should filter by sessionId", async () => {
      const store = makeStore();
      await store.init();
      await store.saveMetricsSnapshot({
        id: "m1", sessionId: "s1", model: "deepseek-chat",
        llmCalls: 10, toolCalls: 3, totalTokens: 45000,
        snapshotAt: "2026-05-06T10:00:00Z",
      });
      await store.saveMetricsSnapshot({
        id: "m2", sessionId: "s2", model: "gpt-4",
        llmCalls: 5, toolCalls: 1, totalTokens: 20000,
        snapshotAt: "2026-05-06T11:00:00Z",
      });
      const s1Snapshots = await store.listMetricsSnapshots("s1");
      expect(s1Snapshots).toHaveLength(1);
      expect(s1Snapshots[0]!.sessionId).toBe("s1");
      const allSnapshots = await store.listMetricsSnapshots();
      expect(allSnapshots).toHaveLength(2);
    });
  });

  // ─── Close ──────────────────────────────────────────

  describe("close", () => {
    it("should clear all data on close", async () => {
      const store = makeStore();
      await store.init();
      await store.saveSession({ id: "s1", startedAt: "2026-05-06T10:00:00Z" });
      expect((await store.listSessions()).length).toBeGreaterThan(0);
      await store.close();
      // After close, data is gone and new data can be added
      expect((await store.listSessions()).length).toBe(0);
    });
  });
});
