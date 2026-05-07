import { describe, it, expect } from "vitest";
import { InMemoryMemoryStore } from "../../src/game-prediction/memory/store.js";
import { buildMemoryContext, recordAndRebuild } from "../../src/game-prediction/memory/index.js";
import { retrieveEvents } from "../../src/game-prediction/memory/retrieval.js";
import { buildProfile } from "../../src/game-prediction/memory/player-profile.js";
import { buildSemanticMemory } from "../../src/game-prediction/memory/semantic-memory.js";
import { buildSessionMemory } from "../../src/game-prediction/memory/session-memory.js";
import type { MemoryEvent, MemoryIdentity, RetrievalQuery } from "../../src/game-prediction/memory/types.js";

/* ─── Helpers ─── */

function makeIdentity(overrides: Partial<MemoryIdentity> = {}): MemoryIdentity {
  return {
    playerId: "player-test-1",
    userId: "user-test-1",
    accountId: "acc-test-1",
    sessionId: "session-test-1",
    ...overrides,
  };
}

function makePredictionEvent(
  overrides: Partial<MemoryEvent> = {},
): MemoryEvent {
  return {
    id: `pred-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    playerId: "player-test-1",
    sessionId: "session-test-1",
    type: "prediction_result",
    timestamp: new Date().toISOString(),
    data: {
      result: "win",
      strategyName: "low-volatility-farming",
      bankrollImpactPercent: 0.02,
    },
    ...overrides,
  };
}

function makeTiltEvent(
  overrides: Partial<MemoryEvent> = {},
): MemoryEvent {
  return {
    id: `tilt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    playerId: "player-test-1",
    sessionId: "session-test-1",
    type: "tilt_detected",
    timestamp: new Date().toISOString(),
    data: { tiltScore: 0.6 },
    ...overrides,
  };
}

function makeStopEvent(overrides: Partial<MemoryEvent> = {}): MemoryEvent {
  return {
    id: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    playerId: "player-test-1",
    sessionId: "session-test-1",
    type: "stop_session",
    timestamp: new Date().toISOString(),
    data: { reason: "Risk limit reached" },
    ...overrides,
  };
}

function makeCalibrationEvent(overrides: Partial<MemoryEvent> = {}): MemoryEvent {
  return {
    id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    playerId: "player-test-1",
    sessionId: "session-test-1",
    type: "calibration_update",
    timestamp: new Date().toISOString(),
    data: {
      calibratedConfidence: 0.7,
      brierScore: 0.12,
      rollingAccuracy: 0.75,
    },
    ...overrides,
  };
}

const FORBIDDEN = ["guaranteed", "certain win", "sure profit", "必赚", "稳赢", "保证盈利"];

function hasForbidden(text: string): string[] {
  return FORBIDDEN.filter((word) => text.toLowerCase().includes(word.toLowerCase()));
}

/* ════════════════════════════════════════════════════════════
   Store — append-only integrity
   ════════════════════════════════════════════════════════════ */

describe("MemoryStore — append-only integrity", () => {
  it("rejects duplicate event IDs", async () => {
    const store = new InMemoryMemoryStore();
    const event = makePredictionEvent({ id: "dup-1" });
    await store.appendEvent(event);
    await expect(store.appendEvent(event)).rejects.toThrow("Duplicate event id");
  });

  it("preserves event order by timestamp", async () => {
    const store = new InMemoryMemoryStore();
    const e1 = makePredictionEvent({ id: "e1", timestamp: "2026-01-01T00:00:00Z" });
    const e2 = makePredictionEvent({ id: "e2", timestamp: "2026-01-02T00:00:00Z" });
    const e3 = makePredictionEvent({ id: "e3", timestamp: "2026-01-03T00:00:00Z" });

    await store.appendEvent(e2);
    await store.appendEvent(e3);
    await store.appendEvent(e1);

    const events = await store.getEventsByPlayer("player-test-1");
    expect(events[0].id).toBe("e1");
    expect(events[1].id).toBe("e2");
    expect(events[2].id).toBe("e3");
  });

  it("returns empty array for unknown player", async () => {
    const store = new InMemoryMemoryStore();
    const events = await store.getEventsByPlayer("unknown");
    expect(events).toEqual([]);
  });
});

/* ════════════════════════════════════════════════════════════
   Deterministic replay
   ════════════════════════════════════════════════════════════ */

describe("Deterministic replay", () => {
  it("same events produce same profile", async () => {
    const store1 = new InMemoryMemoryStore();
    const store2 = new InMemoryMemoryStore();

    const events = [
      makePredictionEvent({ id: "a", timestamp: "2026-01-01T00:00:00Z", data: { result: "win", strategyName: "s1", bankrollImpactPercent: 0.02 } }),
      makePredictionEvent({ id: "b", timestamp: "2026-01-02T00:00:00Z", data: { result: "loss", strategyName: "s1", bankrollImpactPercent: 0.05 } }),
      makePredictionEvent({ id: "c", timestamp: "2026-01-03T00:00:00Z", data: { result: "win", strategyName: "s2", bankrollImpactPercent: 0.03 } }),
    ];

    for (const e of events) {
      await store1.appendEvent(e);
      await store2.appendEvent(e);
    }

    const { events: evts1 } = await store1.replay("player-test-1");
    const { events: evts2 } = await store2.replay("player-test-1");

    expect(evts1).toEqual(evts2);

    // Build profiles — should be identical
    const profile1 = buildProfile("player-test-1", evts1);
    const profile2 = buildProfile("player-test-1", evts2);
    expect(profile1.totalPredictions).toBe(profile2.totalPredictions);
    expect(profile1.totalWins).toBe(profile2.totalWins);
  });

  it("buildMemoryContext is deterministic", async () => {
    const store = new InMemoryMemoryStore();
    const identity = makeIdentity();
    const event = makePredictionEvent({ id: "det-test" });
    await store.appendEvent(event);

    const ctx1 = await buildMemoryContext(store, identity, 1000, 1000);
    const ctx2 = await buildMemoryContext(store, identity, 1000, 1000);

    expect(ctx1.session.totalBets).toBe(ctx2.session.totalBets);
    expect(ctx1.semantic.riskScore).toBe(ctx2.semantic.riskScore);
    expect(ctx1.persistentWarnings).toEqual(ctx2.persistentWarnings);
  });
});

/* ════════════════════════════════════════════════════════════
   Repeated tilt → risk escalation
   ════════════════════════════════════════════════════════════ */

describe("Repeated tilt → risk escalation", () => {
  it("single tilt event does not trigger escalation", async () => {
    const store = new InMemoryMemoryStore();
    const identity = makeIdentity();

    await store.appendEvent(makeTiltEvent({ id: "t1" }));
    const ctx = await buildMemoryContext(store, identity, 1000, 1000);

    expect(ctx.semantic.riskEscalationLevel).not.toBe("critical");
  });

  it("multiple tilt events across sessions increase risk score", async () => {
    const store = new InMemoryMemoryStore();
    const identity = makeIdentity({ playerId: "tilt-test" });

    // 3 sessions with tilt events
    for (let s = 0; s < 3; s++) {
      const sessionId = `tilt-session-${s}`;
      for (let t = 0; t < 2; t++) {
        await store.appendEvent(makeTiltEvent({
          id: `tilt-${s}-${t}`,
          playerId: "tilt-test",
          sessionId,
          timestamp: `2026-01-0${s + 1}T00:00:0${t}Z`,
        }));
      }
      // Add some prediction events so sessions have data
      await store.appendEvent(makePredictionEvent({
        id: `pred-${s}`,
        playerId: "tilt-test",
        sessionId,
        timestamp: `2026-01-0${s + 1}T00:01:00Z`,
      }));
    }

    const ctx = await buildMemoryContext(store, identity, 1000, 1000);
    // Tilt frequency should be high
    expect(ctx.semantic.tiltPropensity).toBeGreaterThan(0);
    // Should have risk warnings
    expect(ctx.semantic.persistentWarnings.length).toBeGreaterThan(0);
  });
});

/* ════════════════════════════════════════════════════════════
   Session summarization
   ════════════════════════════════════════════════════════════ */

describe("Session summarization", () => {
  it("summary contains key session metrics", async () => {
    const store = new InMemoryMemoryStore();
    const identity = makeIdentity();

    await store.appendEvent(makePredictionEvent({
      id: "summary-win",
      data: { result: "win", strategyName: "s1", bankrollImpactPercent: 0.02 },
    }));
    await store.appendEvent(makePredictionEvent({
      id: "summary-loss",
      data: { result: "loss", strategyName: "s1", bankrollImpactPercent: 0.05 },
    }));
    await store.appendEvent(makePredictionEvent({
      id: "summary-win2",
      data: { result: "win", strategyName: "s1", bankrollImpactPercent: 0.03 },
    }));

    const ctx = await buildMemoryContext(store, identity, 1050, 1000);

    expect(ctx.session.totalBets).toBe(3);
    expect(ctx.session.wins).toBe(2);
    expect(ctx.session.losses).toBe(1);
    expect(ctx.summary.length).toBeGreaterThan(0);
    expect(ctx.summary).toContain("bets");
    expect(ctx.summary).toContain("win rate");
  });

  it("recommendedConstraints reflect semantic state", async () => {
    const store = new InMemoryMemoryStore();
    const identity = makeIdentity();

    // High tilt frequency + multiple stops
    for (let i = 0; i < 4; i++) {
      await store.appendEvent(makeStopEvent({
        id: `stop-${i}`,
        timestamp: `2026-01-0${i + 1}T00:00:00Z`,
      }));
    }

    const ctx = await buildMemoryContext(store, identity, 1000, 1000);
    expect(ctx.recommendedConstraints.length).toBeGreaterThan(0);
  });
});

/* ════════════════════════════════════════════════════════════
   Retrieval ranking
   ════════════════════════════════════════════════════════════ */

describe("Retrieval ranking", () => {
  it("latest strategy returns most recent events", () => {
    const events = [
      makePredictionEvent({ id: "old", timestamp: "2026-01-01T00:00:00Z" }),
      makePredictionEvent({ id: "mid", timestamp: "2026-01-02T00:00:00Z" }),
      makePredictionEvent({ id: "new", timestamp: "2026-01-03T00:00:00Z" }),
    ];

    const query: RetrievalQuery = { strategy: "latest", playerId: "p1", limit: 2 };
    const result = retrieveEvents(events, query);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("new");
    expect(result[1].id).toBe("mid");
  });

  it("risk-priority ranks tilt/stop above predictions", () => {
    const events = [
      makePredictionEvent({ id: "p1", timestamp: "2026-01-03T00:00:00Z" }),
      makeTiltEvent({ id: "t1", timestamp: "2026-01-01T00:00:00Z" }),
      makeStopEvent({ id: "s1", timestamp: "2026-01-02T00:00:00Z" }),
    ];

    const query: RetrievalQuery = { strategy: "risk-priority", playerId: "p1" };
    const result = retrieveEvents(events, query);
    // stop_session (priority 4) and tilt_detected (priority 5) should come before prediction_result (priority 1)
    expect(result[0].type).toBe("tilt_detected");
    expect(result[1].type).toBe("stop_session");
  });

  it("strategy-priority filters by strategy name", () => {
    const events = [
      makePredictionEvent({ id: "p1", timestamp: "2026-01-01T00:00:00Z", data: { result: "win", strategyName: "s1" } }),
      makePredictionEvent({ id: "p2", timestamp: "2026-01-02T00:00:00Z", data: { result: "loss", strategyName: "s2" } }),
      makePredictionEvent({ id: "p3", timestamp: "2026-01-03T00:00:00Z", data: { result: "win", strategyName: "s1" } }),
    ];

    const query: RetrievalQuery = { strategy: "strategy-priority", playerId: "p1", strategyName: "s1" };
    const result = retrieveEvents(events, query);
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.data.strategyName === "s1")).toBe(true);
  });

  it("event-priority filters by event type", () => {
    const events = [
      makeTiltEvent({ id: "t1" }),
      makePredictionEvent({ id: "p1" }),
      makeTiltEvent({ id: "t2" }),
    ];

    const query: RetrievalQuery = { strategy: "event-priority", playerId: "p1", eventType: "tilt_detected" };
    const result = retrieveEvents(events, query);
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.type === "tilt_detected")).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════
   Cross-session recovery by playerId
   ════════════════════════════════════════════════════════════ */

describe("Cross-session recovery by playerId", () => {
  it("new sessionId with same playerId recovers profile", async () => {
    const store = new InMemoryMemoryStore();

    // Session 1: record events
    const identity1 = makeIdentity({ sessionId: "session-1" });
    await store.appendEvent(makePredictionEvent({
      id: "s1-p1", playerId: "player-test-1", sessionId: "session-1",
      data: { result: "win", strategyName: "s1", bankrollImpactPercent: 0.02 },
    }));
    await store.appendEvent(makeTiltEvent({
      id: "s1-t1", playerId: "player-test-1", sessionId: "session-1",
    }));
    await buildMemoryContext(store, identity1, 1020, 1000);

    // Session 2: different sessionId, same playerId
    const identity2 = makeIdentity({ sessionId: "session-2" });
    const ctx2 = await buildMemoryContext(store, identity2, 1000, 1000);

    // Profile should be recovered from session 1
    expect(ctx2.playerProfile).not.toBeNull();
    expect(ctx2.playerProfile!.totalPredictions).toBe(1);
    expect(ctx2.semantic.tiltPropensity).toBeGreaterThan(0);
  });

  it("different playerId produces different context", async () => {
    const store = new InMemoryMemoryStore();

    const identity1 = makeIdentity({ playerId: "player-a", sessionId: "s-a" });
    await store.appendEvent(makePredictionEvent({
      id: "pa-p1", playerId: "player-a", sessionId: "s-a",
      data: { result: "win", strategyName: "s1", bankrollImpactPercent: 0.02 },
    }));

    const identity2 = makeIdentity({ playerId: "player-b", sessionId: "s-b" });
    await store.appendEvent(makeTiltEvent({
      id: "pb-t1", playerId: "player-b", sessionId: "s-b",
    }));

    const ctxA = await buildMemoryContext(store, identity1, 1000, 1000);
    const ctxB = await buildMemoryContext(store, identity2, 1000, 1000);

    expect(ctxA.playerProfile!.totalPredictions).toBe(1);
    expect(ctxB.playerProfile!.totalPredictions).toBe(0);
    expect(ctxA.session.sessionId).toBe("s-a");
    expect(ctxB.session.sessionId).toBe("s-b");
  });
});

/* ════════════════════════════════════════════════════════════
   Confidence trend persistence
   ════════════════════════════════════════════════════════════ */

describe("Confidence trend persistence", () => {
  it("calibration events build confidence trend", async () => {
    const store = new InMemoryMemoryStore();
    const identity = makeIdentity();

    await store.appendEvent(makeCalibrationEvent({
      id: "cal-1", data: { calibratedConfidence: 0.6, brierScore: 0.15, rollingAccuracy: 0.7 },
    }));
    await store.appendEvent(makeCalibrationEvent({
      id: "cal-2", data: { calibratedConfidence: 0.65, brierScore: 0.12, rollingAccuracy: 0.75 },
    }));
    await store.appendEvent(makeCalibrationEvent({
      id: "cal-3", data: { calibratedConfidence: 0.7, brierScore: 0.1, rollingAccuracy: 0.8 },
    }));

    const ctx = await buildMemoryContext(store, identity, 1000, 1000);
    expect(ctx.playerProfile!.confidenceTrend).toEqual([0.6, 0.65, 0.7]);
    expect(ctx.playerProfile!.brierScoreTrend).toEqual([0.15, 0.12, 0.1]);
    expect(ctx.playerProfile!.rollingAccuracyTrend).toEqual([0.7, 0.75, 0.8]);
  });
});

/* ════════════════════════════════════════════════════════════
   recordAndRebuild integration
   ════════════════════════════════════════════════════════════ */

describe("recordAndRebuild integration", () => {
  it("appends event and returns updated context", async () => {
    const store = new InMemoryMemoryStore();
    const identity = makeIdentity();

    const event = makePredictionEvent({ id: "rr-test" });
    const ctx = await recordAndRebuild(store, identity, event, 1020, 1000);

    expect(ctx.session.totalBets).toBe(1);
    expect(ctx.playerProfile!.totalPredictions).toBe(1);
  });

  it("multiple recordAndRebuild calls accumulate state", async () => {
    const store = new InMemoryMemoryStore();
    const identity = makeIdentity();

    for (let i = 0; i < 5; i++) {
      const event = makePredictionEvent({
        id: `rr-${i}`,
        data: { result: i < 3 ? "win" : "loss", strategyName: "s1", bankrollImpactPercent: 0.02 },
      });
      await store.appendEvent(event);
    }

    const ctx = await buildMemoryContext(store, identity, 1100, 1000);
    expect(ctx.session.totalBets).toBe(5);
    expect(ctx.playerProfile!.totalWins).toBe(3);
    expect(ctx.playerProfile!.totalLosses).toBe(2);
  });
});

/* ════════════════════════════════════════════════════════════
   Memory context output contract
   ════════════════════════════════════════════════════════════ */

describe("Memory context output contract", () => {
  it("contains all required fields", async () => {
    const store = new InMemoryMemoryStore();
    const identity = makeIdentity();

    const ctx = await buildMemoryContext(store, identity, 1000, 1000);

    expect(ctx.identity).toBeDefined();
    expect(ctx.identity.playerId).toBe("player-test-1");
    expect(ctx.session).toBeDefined();
    expect(ctx.episodic).toBeDefined();
    expect(ctx.semantic).toBeDefined();
    expect(typeof ctx.summary).toBe("string");
    expect(Array.isArray(ctx.recommendedConstraints)).toBe(true);
    expect(Array.isArray(ctx.persistentWarnings)).toBe(true);
  });

  it("no forbidden language in context", async () => {
    const store = new InMemoryMemoryStore();
    const identity = makeIdentity();

    await store.appendEvent(makeTiltEvent({ id: "fl-t1" }));
    await store.appendEvent(makeStopEvent({ id: "fl-s1" }));

    const ctx = await buildMemoryContext(store, identity, 1000, 1000);
    const text = `${ctx.summary} ${ctx.persistentWarnings.join(" ")} ${ctx.recommendedConstraints.join(" ")}`.toLowerCase();
    const found = FORBIDDEN.filter((w) => text.includes(w.toLowerCase()));
    expect(found).toEqual([]);
  });
});
