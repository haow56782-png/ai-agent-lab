import { describe, it, expect } from "vitest";
import { createStateStore } from "../../src/state/index.js";
import type { StateStore } from "../../src/state/types.js";

describe("SqliteStateStore", () => {
  async function makeStore(dbPath?: string): Promise<StateStore> {
    const store = createStateStore({ dbPath: dbPath ?? ":memory:" });
    await store.init();
    return store;
  }

  // ─── Sessions ─────────────────────────────────────────

  describe("sessions", () => {
    it("should save and load a session", async () => {
      const store = await makeStore();
      try {
        await store.saveSession({
          id: "s1",
          traceId: "trace-1",
          startedAt: "2026-05-06T10:00:00Z",
        });
        const loaded = await store.loadSession("s1");
        expect(loaded).not.toBeNull();
        expect(loaded!.id).toBe("s1");
        expect(loaded!.traceId).toBe("trace-1");
      } finally {
        await store.close();
      }
    });

    it("should return null for missing session", async () => {
      const store = await makeStore();
      try {
        const loaded = await store.loadSession("nonexistent");
        expect(loaded).toBeNull();
      } finally {
        await store.close();
      }
    });

    it("should list sessions in reverse chronological order", async () => {
      const store = await makeStore();
      try {
        await store.saveSession({ id: "s1", startedAt: "2026-05-06T10:00:00Z" });
        await store.saveSession({ id: "s2", startedAt: "2026-05-06T11:00:00Z" });
        await store.saveSession({ id: "s3", startedAt: "2026-05-06T09:00:00Z" });
        const list = await store.listSessions();
        expect(list.map((s) => s.id)).toEqual(["s2", "s1", "s3"]);
      } finally {
        await store.close();
      }
    });

    it("should respect limit and offset", async () => {
      const store = await makeStore();
      try {
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
      } finally {
        await store.close();
      }
    });

    it("should update existing session on save", async () => {
      const store = await makeStore();
      try {
        await store.saveSession({ id: "s1", startedAt: "2026-05-06T10:00:00Z" });
        await store.saveSession({
          id: "s1",
          startedAt: "2026-05-06T10:00:00Z",
          endedAt: "2026-05-06T10:30:00Z",
        });
        const loaded = await store.loadSession("s1");
        expect(loaded!.endedAt).toBe("2026-05-06T10:30:00Z");
      } finally {
        await store.close();
      }
    });
  });

  // ─── Workflow Runs ────────────────────────────────────

  describe("workflow runs", () => {
    it("should save and list workflow runs", async () => {
      const store = await makeStore();
      try {
        await store.saveSession({ id: "s1", startedAt: "2026-05-06T10:00:00Z" });
        await store.saveWorkflowRun({
          id: "w1", sessionId: "s1", task: "Test prediction",
          stages: 3, status: "completed",
          startedAt: "2026-05-06T10:00:00Z",
        });
        const list = await store.listWorkflowRuns();
        expect(list).toHaveLength(1);
        expect(list[0]!.task).toBe("Test prediction");
      } finally {
        await store.close();
      }
    });

    it("should update existing workflow run", async () => {
      const store = await makeStore();
      try {
        await store.saveSession({ id: "s1", startedAt: "2026-05-06T10:00:00Z" });
        await store.saveWorkflowRun({
          id: "w1", sessionId: "s1", task: "Task A",
          stages: 3, status: "running",
          startedAt: "2026-05-06T10:00:00Z",
        });
        await store.saveWorkflowRun({
          id: "w1", sessionId: "s1", task: "Task A",
          stages: 4, status: "completed",
          startedAt: "2026-05-06T10:00:00Z",
          endedAt: "2026-05-06T10:05:00Z",
        });
        const list = await store.listWorkflowRuns();
        expect(list).toHaveLength(1);
        expect(list[0]!.status).toBe("completed");
      } finally {
        await store.close();
      }
    });
  });

  // ─── Task Runs ────────────────────────────────────────

  describe("task runs", () => {
    it("should save and list task runs by session", async () => {
      const store = await makeStore();
      try {
        await store.saveSession({ id: "s1", startedAt: "2026-05-06T10:00:00Z" });
        await store.saveSession({ id: "s2", startedAt: "2026-05-06T11:00:00Z" });
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
      } finally {
        await store.close();
      }
    });
  });

  // ─── Eval History ─────────────────────────────────────

  describe("eval history", () => {
    it("should append and list eval history", async () => {
      const store = await makeStore();
      try {
        await store.appendEvalHistory({
          id: "e1", scenario: "prediction-basic",
          result: JSON.stringify({ accuracy: 0.85 }),
          totalTasks: 10, passed: 8, failed: 2, avgScore: 0.8,
          runAt: "2026-05-06T10:00:00Z",
        });
        await store.appendEvalHistory({
          id: "e2", scenario: "prediction-edge",
          result: JSON.stringify({ accuracy: 0.75 }),
          totalTasks: 5, passed: 4, failed: 1, avgScore: 0.75,
          runAt: "2026-05-06T11:00:00Z",
        });
        const list = await store.listEvalHistory();
        expect(list).toHaveLength(2);
        expect(list[0]!.id).toBe("e2");
      } finally {
        await store.close();
      }
    });
  });

  // ─── Trace Spans ──────────────────────────────────────

  describe("trace spans", () => {
    it("should save and query recent traces", async () => {
      const store = await makeStore();
      try {
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
      } finally {
        await store.close();
      }
    });

    it("should query traces by traceId ordered by startMs", async () => {
      const store = await makeStore();
      try {
        await store.saveTraceSpan({
          id: "sp1", traceId: "trace-abc", spanId: "a",
          name: "step2", startMs: 2000,
        });
        await store.saveTraceSpan({
          id: "sp2", traceId: "trace-abc", spanId: "b",
          name: "step1", startMs: 1000,
        });
        const traces = await store.queryTracesByTraceId("trace-abc");
        expect(traces).toHaveLength(2);
        expect(traces[0]!.name).toBe("step1");
        expect(traces[1]!.name).toBe("step2");
      } finally {
        await store.close();
      }
    });
  });

  // ─── Metrics Snapshots ────────────────────────────────

  describe("metrics snapshots", () => {
    it("should save and list snapshots", async () => {
      const store = await makeStore();
      try {
        await store.saveMetricsSnapshot({
          id: "m1", model: "deepseek-chat",
          llmCalls: 10, toolCalls: 3, totalTokens: 45000,
          snapshotAt: "2026-05-06T10:00:00Z",
        });
        const list = await store.listMetricsSnapshots();
        expect(list).toHaveLength(1);
        expect(list[0]!.model).toBe("deepseek-chat");
      } finally {
        await store.close();
      }
    });

    it("should filter by sessionId", async () => {
      const store = await makeStore();
      try {
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
        const all = await store.listMetricsSnapshots();
        expect(all).toHaveLength(2);
      } finally {
        await store.close();
      }
    });
  });

  // ─── Migration ──────────────────────────────────────

  describe("migrations", () => {
    it("should run migrations on init", async () => {
      const store = createStateStore({ dbPath: ":memory:" });
      await store.init();
      try {
        // Verify tables exist by running operations
        await store.saveSession({ id: "s1", startedAt: "2026-05-06T10:00:00Z" });
        await store.saveTraceSpan({
          id: "sp1", traceId: "t1", spanId: "a",
          name: "test", startMs: 100,
        });
        await store.appendEvalHistory({
          id: "e1", scenario: "test", result: "{}",
          totalTasks: 1, passed: 1, failed: 0,
          runAt: "2026-05-06T10:00:00Z",
        });
        const sessions = await store.listSessions();
        expect(sessions).toHaveLength(1);
        const traces = await store.queryRecentTraces();
        expect(traces).toHaveLength(1);
        const evals = await store.listEvalHistory();
        expect(evals).toHaveLength(1);
      } finally {
        await store.close();
      }
    });

    it("should be idempotent across multiple init calls", async () => {
      const store = createStateStore({ dbPath: ":memory:" });
      await store.init();
      await store.init(); // second init should be safe
      await store.saveSession({ id: "s1", startedAt: "2026-05-06T10:00:00Z" });
      const loaded = await store.loadSession("s1");
      expect(loaded).not.toBeNull();
      await store.close();
    });
  });

  // ─── File-based DB ──────────────────────────────────

  describe("file-based database", () => {
    it("should persist data to a file and reload it", async () => {
      const dbPath = "/tmp/vib-test-state.db";
      // Write
      const store1 = createStateStore({ dbPath });
      await store1.init();
      await store1.saveSession({ id: "persist-1", startedAt: "2026-05-06T10:00:00Z" });
      await store1.close();

      // Read back
      const store2 = createStateStore({ dbPath });
      await store2.init();
      try {
        const loaded = await store2.loadSession("persist-1");
        expect(loaded).not.toBeNull();
        expect(loaded!.id).toBe("persist-1");
      } finally {
        await store2.close();
      }
    });
  });
});
