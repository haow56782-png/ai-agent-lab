import { describe, it, expect } from "vitest";
import { analyzeFunnel, formatFunnelReport } from "../../src/binding/funnel.js";
import type { RuntimeEvent } from "../../src/binding/types.js";

function event(
  stage: string,
  status: RuntimeEvent["status"],
): RuntimeEvent {
  return {
    stage: stage as any,
    timestamp: new Date().toISOString(),
    status,
  };
}

function successSession(): RuntimeEvent[] {
  return [
    // INIT: direct emitEvent(x2)
    event("INIT", "entered"),
    event("INIT", "completed"),
    // URL_INPUT: direct emitEvent (validation passes)
    event("URL_INPUT", "entered"),
    event("URL_INPUT", "completed"),
    // SITE_RECOGNIZING → SITE_RECOGNIZED: transition
    event("SITE_RECOGNIZING", "entered"),
    event("SITE_RECOGNIZED", "entered"),
    event("SITE_RECOGNIZED", "completed"),
    // THIRD_PARTY_AUTHORIZING → ACCOUNT_INFO_FETCHING: transition
    event("THIRD_PARTY_AUTHORIZING", "entered"),
    event("ACCOUNT_INFO_FETCHING", "entered"),
    event("ACCOUNT_INFO_FETCHING", "completed"),
    // ACCOUNT_BIND_CONFIRM + ACCOUNT_BOUND: direct emitEvent
    event("ACCOUNT_BIND_CONFIRM", "entered"),
    event("ACCOUNT_BIND_CONFIRM", "completed"),
    event("ACCOUNT_BOUND", "entered"),
    event("ACCOUNT_BOUND", "completed"),
    // AGENT_ANALYZING → SIGNAL_READY: transition
    event("AGENT_ANALYZING", "entered"),
    event("SIGNAL_READY", "entered"),
    event("SIGNAL_READY", "completed"),
  ];
}

describe("analyzeFunnel", () => {
  it("should report 100% success for a single success session", () => {
    const report = analyzeFunnel([successSession()]);

    expect(report.totalSessions).toBe(1);
    expect(report.successfulSessions).toBe(1);
    expect(report.successRate).toBe(1);
  });

  it("should report 0% success when all sessions fail", () => {
    const failEvents: RuntimeEvent[] = [
      event("INIT", "entered"),
      event("INIT", "completed"),
      event("URL_INPUT", "entered"),
      event("URL_INPUT", "completed"),
      event("SITE_RECOGNIZING", "entered"),
      event("UNSUPPORTED_SITE", "entered"),
      event("UNSUPPORTED_SITE", "failed"),
    ];
    const report = analyzeFunnel([failEvents]);

    expect(report.successfulSessions).toBe(0);
    expect(report.successRate).toBe(0);
  });

  it("should calculate correct conversion rates", () => {
    // 2 success + 1 fail at auth (AUTH_REJECTED)
    const failSession: RuntimeEvent[] = [
      event("INIT", "entered"),
      event("INIT", "completed"),
      event("URL_INPUT", "entered"),
      event("URL_INPUT", "completed"),
      event("SITE_RECOGNIZING", "entered"),
      event("SITE_RECOGNIZED", "entered"),
      event("SITE_RECOGNIZED", "completed"),
      event("AUTH_CONFIRM_REQUIRED", "entered"),
      event("AUTH_REJECTED", "entered"),
      event("AUTH_REJECTED", "failed"),
    ];
    const sessions = [successSession(), successSession(), failSession];

    const report = analyzeFunnel(sessions);
    expect(report.totalSessions).toBe(3);
    expect(report.successfulSessions).toBe(2);
    expect(report.successRate).toBeCloseTo(0.67, 1);

    // URL_INPUT: 3 entered, 3 progressed to SITE_RECOGNIZING → 100%
    const urlStage = report.stages.find((s) => s.stage === "URL_INPUT")!;
    expect(urlStage.entered).toBe(3);
    expect(urlStage.progressed).toBe(3);
    expect(urlStage.conversionRate).toBe(1);

    // SITE_RECOGNIZED: 3 entered, 2 progressed to THIRD_PARTY_AUTHORIZING → 67%
    const recogStage = report.stages.find(
      (s) => s.stage === "SITE_RECOGNIZED",
    )!;
    expect(recogStage.entered).toBe(3);
    expect(recogStage.progressed).toBe(2);
    expect(recogStage.conversionRate).toBeCloseTo(0.67, 1);
  });

  it("should identify top dropoffs", () => {
    const failSession: RuntimeEvent[] = [
      // Valid URL, so URL_INPUT completes normally
      event("INIT", "entered"),
      event("INIT", "completed"),
      event("URL_INPUT", "entered"),
      event("URL_INPUT", "completed"),
      // Site recognizes successfully
      event("SITE_RECOGNIZING", "entered"),
      event("SITE_RECOGNIZED", "entered"),
      event("SITE_RECOGNIZED", "completed"),
      // Auth rejected
      event("AUTH_CONFIRM_REQUIRED", "entered"),
      event("AUTH_REJECTED", "entered"),
      event("AUTH_REJECTED", "failed"),
    ];
    const sessions = [successSession(), failSession];

    const report = analyzeFunnel(sessions);
    expect(report.topDropoffs.length).toBeGreaterThan(0);
    // SITE_RECOGNIZED: 2 entered, 1 progressed → 50% drop (top)
    expect(report.topDropoffs[0]!.stage).toBe("SITE_RECOGNIZED");
  });

  it("should handle empty events", () => {
    const report = analyzeFunnel([]);
    expect(report.totalSessions).toBe(0);
    expect(report.successRate).toBe(0);
    expect(report.stages.length).toBeGreaterThan(0);
  });
});

describe("formatFunnelReport", () => {
  it("should produce readable output", () => {
    const report = analyzeFunnel([successSession()]);
    const text = formatFunnelReport(report);
    expect(text).toContain("Conversion Funnel");
    expect(text).toContain("SIGNAL_READY");
    expect(text).toContain("Top Dropoffs");
  });
});
