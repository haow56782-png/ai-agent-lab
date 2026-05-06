import { describe, it, expect } from "vitest";
import { runBindingWorkflow } from "../../src/binding/workflow.js";
import { MemoryStateStore } from "../../src/state/memory-store.js";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe("Binding Workflow", () => {
  // ─── Happy Path ──────────────────────────────────────────

  describe("happy path", () => {
    it("should complete full flow with PG Soft URL", async () => {
      const result = await runBindingWorkflow({
        url: "https://www.pgsoft.com/game-123",
      });

      expect(result.success).toBe(true);
      expect(result.session.state).toBe("SIGNAL_READY");
      expect(result.session.provider).toBe("PG_SOFT");
      expect(result.session.account).toBeDefined();
      expect(result.session.account!.gameAccountId).toBe("pg_acc_abc123");
      expect(result.session.signal).toBeDefined();
      expect(result.session.signal!.confidence).toBeGreaterThan(0);
      expect(result.events.length).toBeGreaterThan(10);
    });

    it("should complete full flow with JILI URL", async () => {
      const result = await runBindingWorkflow({
        url: "https://www.jili.com/slots",
      });

      expect(result.success).toBe(true);
      expect(result.session.state).toBe("SIGNAL_READY");
      expect(result.session.provider).toBe("JILI");
      expect(result.session.account!.gameAccountId).toBe("jili_acc_xyz789");
    });
  });

  // ─── Failure Cases ───────────────────────────────────────

  describe("failure cases", () => {
    it("should fail on invalid URL (empty)", async () => {
      const result = await runBindingWorkflow({ url: "" });
      expect(result.success).toBe(false);
      expect(result.session.failure).toBe("INVALID_URL");
    });

    it("should fail on invalid URL (no protocol)", async () => {
      const result = await runBindingWorkflow({
        url: "not-a-url",
      });
      expect(result.success).toBe(false);
      expect(result.session.failure).toBe("INVALID_URL");
      expect(result.session.error).toContain("http");
    });

    it("should fail on invalid URL (garbage)", async () => {
      const result = await runBindingWorkflow({
        url: "://",
      });
      expect(result.success).toBe(false);
      expect(result.session.failure).toBe("INVALID_URL");
    });

    it("should fail on unsupported site", async () => {
      const result = await runBindingWorkflow({
        url: "https://www.unknown-site.com/game",
      });
      expect(result.success).toBe(false);
      expect(result.session.failure).toBe("UNSUPPORTED_SITE");
      expect(result.session.error).toContain("Unsupported site");
    });

    it("should fail on auth rejection", async () => {
      const result = await runBindingWorkflow({
        url: "https://www.pgsoft.com/game",
        confirmAuth: async () => false,
      });
      expect(result.success).toBe(false);
      expect(result.session.failure).toBe("AUTH_REJECTED");
      expect(result.session.error).toContain("declined");
    });

    it("should fail on account fetch failure", async () => {
      const result = await runBindingWorkflow({
        url: "https://www.pgsoft.com/game",
        failureMode: "ACCOUNT_FETCH_FAILED",
      });
      expect(result.success).toBe(false);
      expect(result.session.failure).toBe("ACCOUNT_FETCH_FAILED");
      expect(result.session.error).toContain("503");
    });

    it("should fail on signal generation failure", async () => {
      const result = await runBindingWorkflow({
        url: "https://www.pgsoft.com/game",
        failureMode: "SIGNAL_GENERATION_FAILED",
      });
      expect(result.success).toBe(false);
      expect(result.session.failure).toBe("SIGNAL_GENERATION_FAILED");
    });

    it("should fail on auth reject via failure mode", async () => {
      const result = await runBindingWorkflow({
        url: "https://www.pgsoft.com/game",
        failureMode: "AUTH_REJECTED",
      });
      expect(result.success).toBe(false);
      expect(result.session.failure).toBe("AUTH_REJECTED");
    });

    it("auth-reject path must go through site recognition before rejection", async () => {
      const result = await runBindingWorkflow({
        url: "https://www.pgsoft.com/game",
        failureMode: "AUTH_REJECTED",
      });

      const stages = result.events.map((e) => `${e.stage}:${e.status}`);
      const joined = stages.join(", ");

      // Site was recognized before hitting the auth stage
      expect(joined).toContain("SITE_RECOGNIZED:completed");
      expect(joined).toContain("THIRD_PARTY_AUTHORIZING:entered");
      expect(joined).toContain("AUTH_REJECTED:failed");

      // Must NOT be classified as unsupported site
      expect(result.session.failure).toBe("AUTH_REJECTED");
      expect(result.session.failure).not.toBe("UNSUPPORTED_SITE");

      // Provider was identified
      expect(result.session.provider).toBe("PG_SOFT");
    });
  });

  // ─── StateStore Persistence ──────────────────────────────

  describe("StateStore persistence", () => {
    it("should persist binding session to StateStore", async () => {
      const store = new MemoryStateStore();
      await store.init();

      const result = await runBindingWorkflow(
        { url: "https://www.pgsoft.com/game" },
        store,
      );

      expect(result.success).toBe(true);

      // Verify session was saved
      const session = await store.loadSession(result.session.sessionId);
      expect(session).not.toBeNull();
      expect(session!.id).toBe(result.session.sessionId);
      expect(session!.endedAt).toBeDefined();
      expect(session!.metadata).toContain("binding");
      expect(session!.metadata).toContain("SIGNAL_READY");
    });

    it("should persist trace spans for each stage", async () => {
      const store = new MemoryStateStore();
      await store.init();

      const result = await runBindingWorkflow(
        { url: "https://www.jili.com/slots" },
        store,
      );

      expect(result.success).toBe(true);

      // Verify trace spans were saved (4 stages use transition())
      const traces = await store.queryTracesByTraceId(result.session.sessionId);
      expect(traces.length).toBeGreaterThanOrEqual(4);
      expect(traces.some((t) => t.name === "binding.site_recognized")).toBe(true);
      expect(traces.some((t) => t.name === "binding.signal_ready")).toBe(true);
    });

    it("should persist failed binding state", async () => {
      const store = new MemoryStateStore();
      await store.init();

      const result = await runBindingWorkflow(
        { url: "not-a-valid-url" },
        store,
      );

      expect(result.success).toBe(false);
      expect(result.session.failure).toBe("INVALID_URL");

      // Verify failed session was saved
      const session = await store.loadSession(result.session.sessionId);
      expect(session).not.toBeNull();
      expect(session!.metadata).toContain("INVALID_URL");
    });

    it("should trace failed stages", async () => {
      const store = new MemoryStateStore();
      await store.init();

      const result = await runBindingWorkflow(
        { url: "https://www.pgsoft.com/game", failureMode: "ACCOUNT_FETCH_FAILED" },
        store,
      );

      expect(result.success).toBe(false);

      const traces = await store.queryTracesByTraceId(result.session.sessionId);
      expect(traces.length).toBeGreaterThan(0);

      // Should have the failed stage trace
      const fetchSpan = traces.find((t) => t.name === "binding.account_fetch_failed");
      expect(fetchSpan).toBeDefined();
    });
  });

  // ─── Runtime Events ──────────────────────────────────────

  describe("runtime events", () => {
    it("should emit events in correct order", async () => {
      const result = await runBindingWorkflow({
        url: "https://www.pgsoft.com/game",
      });

      const stages = result.events
        .filter((e) => e.status === "entered")
        .map((e) => e.stage);

      // The entered events should follow the flow order
      expect(stages[0]).toBe("INIT");
      expect(stages.slice(1)).toContain("URL_INPUT");
      expect(stages).toContain("SITE_RECOGNIZING");
      expect(stages).toContain("SITE_RECOGNIZING");
      expect(stages).toContain("SITE_RECOGNIZED");
      expect(stages).toContain("SIGNAL_READY");
    });

    it("should include failure events", async () => {
      const result = await runBindingWorkflow({
        url: "https://unknown.xyz",
      });

      const failedEvents = result.events.filter((e) => e.status === "failed");
      expect(failedEvents.length).toBeGreaterThan(0);
      expect(failedEvents[0]!.stage).toBe("UNSUPPORTED_SITE");
      expect(failedEvents[0]!.error).toBeDefined();
    });

    it("should include timing info in events", async () => {
      const result = await runBindingWorkflow({
        url: "https://www.pgsoft.com/game",
      });

      const completed = result.events.filter((e) => e.status === "completed");
      expect(completed.length).toBeGreaterThan(0);
      for (const event of completed) {
        expect(event.durationMs).toBeGreaterThanOrEqual(0);
        expect(event.timestamp).toBeDefined();
      }
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────

  describe("edge cases", () => {
    it("should handle URL with trailing whitespace", async () => {
      const result = await runBindingWorkflow({
        url: "  https://www.pgsoft.com/game  ",
      });
      expect(result.success).toBe(true);
    });

    it("should handle unsupported site with demo prefix", async () => {
      const result = await runBindingWorkflow({
        url: "demo:unsupported",
        failureMode: "UNSUPPORTED_SITE",
      });
      expect(result.success).toBe(false);
      expect(result.session.failure).toBe("UNSUPPORTED_SITE");
    });

    it("should handle binding declined", async () => {
      const result = await runBindingWorkflow({
        url: "https://www.pgsoft.com/game",
        confirmBind: async () => false,
      });
      expect(result.success).toBe(false);
      expect(result.session.failure).toBe("BIND_FAILED");
    });
  });
});
