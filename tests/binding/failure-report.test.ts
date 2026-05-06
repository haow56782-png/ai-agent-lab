import { describe, it, expect } from "vitest";
import {
  aggregateFailures,
  formatFailureReport,
} from "../../src/binding/failure-report.js";
import type { RuntimeEvent } from "../../src/binding/types.js";

function event(stage: string, status: RuntimeEvent["status"]): RuntimeEvent {
  return {
    stage: stage as any,
    timestamp: new Date().toISOString(),
    status,
  };
}

function makeSession(
  success: boolean,
  provider: string,
  failStage?: string,
) {
  const events: RuntimeEvent[] = [
    event("INIT", "entered"),
    event("INIT", "completed"),
    event("URL_INPUT", "entered"),
    event("URL_INPUT", "completed"),
  ];
  if (!success && failStage) {
    events.push(event(failStage as any, "failed"));
  } else if (success) {
    events.push(event("SIGNAL_READY", "completed"));
  }
  return { events, provider, success };
}

describe("aggregateFailures", () => {
  it("should return zero failures when all sessions succeed", () => {
    const sessions = [
      makeSession(true, "PG_SOFT"),
      makeSession(true, "JILI"),
    ];
    const report = aggregateFailures(sessions);

    expect(report.totalSessions).toBe(2);
    expect(report.totalFailures).toBe(0);
    expect(report.overallFailureRate).toBe(0);
    expect(report.byType).toHaveLength(0);
  });

  it("should count failures by type", () => {
    const sessions = [
      makeSession(false, "PG_SOFT", "AUTH_REJECTED"),
      makeSession(false, "PG_SOFT", "AUTH_REJECTED"),
      makeSession(false, "JILI", "ACCOUNT_FETCH_FAILED"),
      makeSession(true, "PG_SOFT"),
    ];
    const report = aggregateFailures(sessions);

    expect(report.totalFailures).toBe(3);
    expect(report.overallFailureRate).toBe(75);

    const authRej = report.byType.find((f) => f.failure === "AUTH_REJECTED")!;
    expect(authRej.count).toBe(2);
    expect(authRej.percentage).toBeCloseTo(66.67, 0);

    const fetchFail = report.byType.find(
      (f) => f.failure === "ACCOUNT_FETCH_FAILED",
    )!;
    expect(fetchFail.count).toBe(1);
  });

  it("should identify top three failures", () => {
    const sessions = [
      makeSession(false, "PG_SOFT", "AUTH_REJECTED"),
      makeSession(false, "PG_SOFT", "AUTH_REJECTED"),
      makeSession(false, "JILI", "ACCOUNT_FETCH_FAILED"),
      makeSession(false, "JILI", "INVALID_URL"),
    ];
    const report = aggregateFailures(sessions);

    expect(report.topThree).toHaveLength(3);
    expect(report.topThree[0]!.failure).toBe("AUTH_REJECTED");
  });

  it("should group by provider with failure rates", () => {
    const sessions = [
      makeSession(false, "PG_SOFT", "AUTH_REJECTED"),
      makeSession(true, "PG_SOFT"),
      makeSession(false, "JILI", "SIGNAL_GENERATION_FAILED"),
    ];
    const report = aggregateFailures(sessions);

    expect(report.byProvider).toHaveLength(2);

    const pg = report.byProvider.find((p) => p.provider === "PG_SOFT")!;
    expect(pg.totalSessions).toBe(2);
    expect(pg.failedSessions).toBe(1);
    expect(pg.failureRate).toBe(50);
    expect(pg.topFailure).toBe("AUTH_REJECTED");

    const jili = report.byProvider.find((p) => p.provider === "JILI")!;
    expect(jili.totalSessions).toBe(1);
    expect(jili.failedSessions).toBe(1);
    expect(jili.failureRate).toBe(100);
  });

  it("should handle empty sessions", () => {
    const report = aggregateFailures([]);
    expect(report.totalSessions).toBe(0);
    expect(report.totalFailures).toBe(0);
    expect(report.overallFailureRate).toBe(0);
    expect(report.byProvider).toHaveLength(0);
  });

  it("should sort by type descending by count", () => {
    const sessions = [
      makeSession(false, "PG_SOFT", "AUTH_REJECTED"),
      makeSession(false, "PG_SOFT", "AUTH_REJECTED"),
      makeSession(false, "PG_SOFT", "AUTH_REJECTED"),
      makeSession(false, "JILI", "INVALID_URL"),
      makeSession(false, "JILI", "INVALID_URL"),
    ];
    const report = aggregateFailures(sessions);

    expect(report.byType[0]!.failure).toBe("AUTH_REJECTED");
    expect(report.byType[0]!.count).toBe(3);
    expect(report.byType[1]!.failure).toBe("INVALID_URL");
    expect(report.byType[1]!.count).toBe(2);
  });
});

describe("formatFailureReport", () => {
  it("should produce readable output", () => {
    const sessions = [
      makeSession(false, "PG_SOFT", "AUTH_REJECTED"),
      makeSession(false, "JILI", "ACCOUNT_FETCH_FAILED"),
      makeSession(true, "PG_SOFT"),
    ];
    const text = formatFailureReport(aggregateFailures(sessions));

    expect(text).toContain("Failure Report");
    expect(text).toContain("AUTH_REJECTED");
    expect(text).toContain("ACCOUNT_FETCH_FAILED");
    expect(text).toContain("PG_SOFT");
    expect(text).toContain("JILI");
  });
});
