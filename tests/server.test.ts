import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/server/app.js";
import { InMemoryTaskStore, InMemorySignalStore } from "../src/server/stores/in-memory.js";
import type { TaskStore, SignalStore } from "../src/server/stores/types.js";

describe("API Server", () => {
  const { app, taskStore, signalStore, reportStore } = createApp();

  // ─── Health ────────────────────────────────────────────────

  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("vib-ai-agent-api");
  });

  // ─── Agent Analyze ─────────────────────────────────────────

  it("POST /api/agent/analyze creates task", async () => {
    const res = await request(app)
      .post("/api/agent/analyze")
      .send({ url: "https://example.com/game" });

    expect(res.status).toBe(201);
    expect(res.body.taskId).toBeDefined();
    expect(res.body.status).toBe("CREATED");
    expect(res.body.message).toContain("created");
  });

  it("invalid url returns VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/agent/analyze")
      .send({ url: "" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.requestId).toBeDefined();
  });

  it("missing url field returns VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/agent/analyze")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("malformed url returns VALIDATION_ERROR", async () => {
    const res = await request(app)
      .post("/api/agent/analyze")
      .send({ url: "not-a-valid-url" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("extra fields in request are accepted", async () => {
    const res = await request(app)
      .post("/api/agent/analyze")
      .send({
        url: "https://example.com/game",
        gameId: "dice-001",
        platform: "demo",
        userId: "test-user",
      });

    expect(res.status).toBe(201);
    expect(res.body.taskId).toBeDefined();
  });

  it("/analyze does not trigger billing (contract: zero credits/charge side-effects)", async () => {
    // This is a contract test: POST /api/agent/analyze creates a task
    // but does NOT interact with any billing/credits system.
    // See agent.controller.ts and task.service.ts for billing notes.
    const res = await request(app)
      .post("/api/agent/analyze")
      .send({ url: "https://example.com/game" });

    expect(res.status).toBe(201);
    // Response shape: only taskId, status, message — no billing fields
    expect(Object.keys(res.body)).toEqual(["taskId", "status", "message"]);
    expect(res.body).not.toHaveProperty("credits");
    expect(res.body).not.toHaveProperty("balance");
    expect(res.body).not.toHaveProperty("charge");
  });

  // ─── Tasks ─────────────────────────────────────────────────

  it("GET /api/tasks/:taskId returns task", async () => {
    const create = await request(app)
      .post("/api/agent/analyze")
      .send({ url: "https://example.com/game" });

    const res = await request(app).get(`/api/tasks/${create.body.taskId}`);
    expect(res.status).toBe(200);
    expect(res.body.taskId).toBe(create.body.taskId);
    expect(res.body.status).toBeDefined();
    expect(res.body.progress).toBeDefined();
  });

  it("unknown task returns TASK_NOT_FOUND", async () => {
    const res = await request(app).get("/api/tasks/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("TASK_NOT_FOUND");
  });

  // ─── Signals ──────────────────────────────────────────────

  it("GET /api/signals/:signalId returns 404 for unknown", async () => {
    const res = await request(app).get("/api/signals/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("SIGNAL_NOT_FOUND");
  });

  // ─── Reports ──────────────────────────────────────────────

  it("GET /api/reports/:reportId returns 404 for unknown", async () => {
    const res = await request(app).get("/api/reports/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("REPORT_NOT_FOUND");
  });

  // ─── Error Response Shape ─────────────────────────────────

  it("response includes requestId on error", async () => {
    const res = await request(app).get("/api/tasks/does-not-exist");
    expect(res.body.error.requestId).toBeDefined();
    expect(typeof res.body.error.requestId).toBe("string");
  });

  // ─── P0: Full Lifecycle ─────────────────────────────────────

  it("P0: full lifecycle CREATED → ANALYZING → COMPLETED with result structure", async () => {
    const create = await request(app)
      .post("/api/agent/analyze")
      .send({ url: "https://example.com/game" });

    expect(create.status).toBe(201);
    const taskId = create.body.taskId;

    // Poll until terminal state (max 30s)
    const start = Date.now();
    let getRes = await request(app).get(`/api/tasks/${taskId}`);
    while (
      (getRes.body.status === "CREATED" || getRes.body.status === "ANALYZING") &&
      Date.now() - start < 30000
    ) {
      await new Promise((r) => setTimeout(r, 500));
      getRes = await request(app).get(`/api/tasks/${taskId}`);
    }

    // Field schema consistency
    const baseFields = ["taskId", "status", "progress", "currentStep", "createdAt", "updatedAt"];
    for (const f of baseFields) {
      expect(getRes.body).toHaveProperty(f);
    }

    if (getRes.body.status === "COMPLETED") {
      expect(getRes.body.progress).toBe(100);
      expect(getRes.body.currentStep).toBe("Analysis complete");
      expect(getRes.body.result).toBeDefined();
      expect(typeof getRes.body.result).toBe("string");
      expect(getRes.body.result.length).toBeGreaterThan(0);
    } else if (getRes.body.status === "FAILED") {
      expect(getRes.body.currentStep).toContain("Error");
      expect(getRes.body.result).toBeUndefined();
    } else {
      // Guard: if still running after 30s, mark as infrastructure issue
      expect(getRes.body.status).toMatch(/COMPLETED|FAILED/);
    }
  });

  // ─── P0: FAILED Task Structure ───────────────────────────────

  it("P0: FAILED task returns HTTP 200 with error info inside task (not HTTP error)", async () => {
    const now = new Date().toISOString();
    await taskStore.createTask({
      taskId: "p0-failed-task",
      url: "https://example.com/game",
      userId: "test-user",
      status: "FAILED",
      progress: 50,
      currentStep: "Error: LLM API call failed",
      createdAt: now,
      updatedAt: now,
    });

    const res = await request(app).get("/api/tasks/p0-failed-task");

    // HTTP 200, not 500
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("FAILED");
    expect(res.body.currentStep).toContain("Error");
    // Verify it's NOT the HTTP error envelope
    expect(res.body.error).toBeUndefined();
    // Regular task fields still present
    expect(res.body.taskId).toBe("p0-failed-task");
    expect(res.body.progress).toBe(50);
    expect(res.body.result).toBeUndefined();
  });

  // ─── P0: Idempotency ─────────────────────────────────────────

  it("P0: same URL in quick succession creates distinct taskIds", async () => {
    const [res1, res2] = await Promise.all([
      request(app).post("/api/agent/analyze").send({ url: "https://example.com/game" }),
      request(app).post("/api/agent/analyze").send({ url: "https://example.com/game" }),
    ]);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res1.body.taskId).toBeDefined();
    expect(res2.body.taskId).toBeDefined();
    // Currently non-idempotent — each call creates a new task
    expect(res1.body.taskId).not.toBe(res2.body.taskId);
  });

  // ─── P0: Abnormal URLs ─────────────────────────────────────

  describe("P0: abnormal URL rejection", () => {
    it("rejects ftp:// scheme", async () => {
      const res = await request(app)
        .post("/api/agent/analyze")
        .send({ url: "ftp://example.com/game" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("scheme");
    });

    it("rejects file:// scheme", async () => {
      const res = await request(app)
        .post("/api/agent/analyze")
        .send({ url: "file:///etc/passwd" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects overly long URL", async () => {
      const longUrl = "https://example.com/" + "a".repeat(4096);
      const res = await request(app)
        .post("/api/agent/analyze")
        .send({ url: longUrl });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("characters");
    });

    it("rejects incomplete URL (http:// only)", async () => {
      const res = await request(app)
        .post("/api/agent/analyze")
        .send({ url: "http://" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ─── P0: Progress Monotonic + Field Schema ─────────────────

  it("P0: progress is monotonic non-decreasing and field schema consistent across states", async () => {
    const create = await request(app)
      .post("/api/agent/analyze")
      .send({ url: "https://example.com/game" });

    const taskId = create.body.taskId;
    const snapshots: Record<string, unknown>[] = [];

    // Initial snapshot
    snapshots.push(await request(app).get(`/api/tasks/${taskId}`).then((r) => r.body));

    // Poll until terminal state
    const start = Date.now();
    while (Date.now() - start < 30000) {
      await new Promise((r) => setTimeout(r, 1000));
      const body = await request(app).get(`/api/tasks/${taskId}`).then((r) => r.body);
      snapshots.push(body);
      if (body.status === "COMPLETED" || body.status === "FAILED") break;
    }

    // Progress monotonic non-decreasing
    const progresses = snapshots.map((s) => s.progress as number);
    for (let i = 1; i < progresses.length; i++) {
      expect(progresses[i]).toBeGreaterThanOrEqual(progresses[i - 1]);
    }

    // Field schema consistent across all snapshots
    const requiredFields = ["taskId", "status", "progress", "currentStep", "createdAt", "updatedAt"];
    for (const snapshot of snapshots) {
      for (const field of requiredFields) {
        expect(snapshot).toHaveProperty(field);
      }
    }

    // result only appears on COMPLETED tasks
    const completedSnapshot = snapshots.find((s) => s.status === "COMPLETED");
    if (completedSnapshot) {
      expect(completedSnapshot).toHaveProperty("result");
      expect(typeof completedSnapshot.result).toBe("string");
    }
  });

  // ─── Architecture ─────────────────────────────────────────

  it("controllers do not contain agent business logic", async () => {
    // Controllers delegate to services — verify by example
    const { analyzeHandler } = await import("../src/server/controllers/agent.controller.js");
    const handler = analyzeHandler(taskStore);
    // handler is a middleware factory, not inline business logic
    expect(typeof handler).toBe("function");
    // handler returns an async middleware function
    const result = handler({} as any, {} as any, (() => {}) as any);
    expect(result).toBeInstanceOf(Promise);
  });

  it("task store can be replaced by interface", () => {
    // InMemoryTaskStore implements TaskStore interface
    const store: TaskStore = new InMemoryTaskStore();
    expect(store.createTask).toBeDefined();
    expect(store.getTask).toBeDefined();
    expect(store.updateTask).toBeDefined();
    expect(store.listTasks).toBeDefined();
  });

  it("signal store can be replaced by interface", () => {
    const store: SignalStore = new InMemorySignalStore();
    expect(store.createSignal).toBeDefined();
    expect(store.getSignal).toBeDefined();
  });
});
