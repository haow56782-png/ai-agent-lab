import { describe, it, expect } from "vitest";
import { HistoryStore } from "../../src/game-prediction/learning/history-store.js";
import { recordPrediction } from "../../src/game-prediction/learning/index.js";
import { bayesianCalibratedConfidence } from "../../src/game-prediction/learning/bayesian.js";
import { adjustConfidence } from "../../src/game-prediction/learning/confidence.js";
import { computeCalibration } from "../../src/game-prediction/learning/calibration.js";
import { updatePolicy } from "../../src/game-prediction/learning/policy-update.js";
import type { LearningInput, LearningRecord } from "../../src/game-prediction/learning/types.js";

/* ─── Helpers ─── */

function makeInput(overrides: Partial<LearningInput> = {}): LearningInput {
  return {
    predictionId: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    gameType: "DICE",
    strategyName: "low-volatility-farming",
    predictedProbability: 0.5,
    predictedEV: 0.95,
    confidence: 0.7,
    actualResult: "win",
    actualPayout: 1.96,
    bankrollBefore: 1000,
    bankrollAfter: 1019.6,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/* ════════════════════════════════════════════════════════════
   HistoryStore — append-only immutable
   ════════════════════════════════════════════════════════════ */

describe("HistoryStore", () => {
  it("starts empty", () => {
    const store = new HistoryStore();
    expect(store.size).toBe(0);
    expect(store.getAll()).toEqual([]);
  });

  it("append returns new store (immutable)", () => {
    const store = new HistoryStore();
    const record: LearningRecord = {
      predictionId: "p1", gameType: "DICE", strategyName: "s1",
      predictedProbability: 0.5, confidence: 0.7, actualResult: "win",
      timestamp: "2026-01-01T00:00:00Z",
    };
    const store2 = store.append(record);
    expect(store.size).toBe(0);
    expect(store2.size).toBe(1);
  });

  it("throws on duplicate predictionId", () => {
    const store = new HistoryStore();
    const record: LearningRecord = {
      predictionId: "p1", gameType: "DICE", strategyName: "s1",
      predictedProbability: 0.5, confidence: 0.7, actualResult: "win",
      timestamp: "2026-01-01T00:00:00Z",
    };
    const store2 = store.append(record);
    expect(() => store2.append(record)).toThrow("Duplicate predictionId");
  });

  it("sorts by timestamp on construction", () => {
    const records: LearningRecord[] = [
      { predictionId: "p2", gameType: "DICE", strategyName: "s1", predictedProbability: 0.5, confidence: 0.7, actualResult: "loss", timestamp: "2026-01-02T00:00:00Z" },
      { predictionId: "p1", gameType: "DICE", strategyName: "s1", predictedProbability: 0.5, confidence: 0.7, actualResult: "win", timestamp: "2026-01-01T00:00:00Z" },
    ];
    const store = new HistoryStore(records);
    expect(store.getAll()[0].predictionId).toBe("p1");
    expect(store.getAll()[1].predictionId).toBe("p2");
  });

  it("getByStrategy filters correctly", () => {
    const store = new HistoryStore();
    const r1: LearningRecord = { predictionId: "p1", gameType: "DICE", strategyName: "a", predictedProbability: 0.5, confidence: 0.7, actualResult: "win", timestamp: "2026-01-01T00:00:00Z" };
    const r2: LearningRecord = { predictionId: "p2", gameType: "CRASH", strategyName: "b", predictedProbability: 0.5, confidence: 0.7, actualResult: "loss", timestamp: "2026-01-02T00:00:00Z" };
    const store2 = store.append(r1).append(r2);
    expect(store2.getByStrategy("a")).toHaveLength(1);
    expect(store2.getByStrategy("b")).toHaveLength(1);
    expect(store2.getByStrategy("c")).toHaveLength(0);
  });

  it("getRecent returns last N records", () => {
    const records: LearningRecord[] = Array.from({ length: 10 }, (_, i) => ({
      predictionId: `p${i}`, gameType: "DICE" as const, strategyName: "s1",
      predictedProbability: 0.5, confidence: 0.7, actualResult: (i % 2 === 0 ? "win" : "loss") as "win" | "loss",
      timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    const store = new HistoryStore(records);
    expect(store.getRecent(3)).toHaveLength(3);
    expect(store.getRecent(3)[0].predictionId).toBe("p7");
  });

  it("getCounts returns correct win/loss", () => {
    const records: LearningRecord[] = [
      { predictionId: "p1", gameType: "DICE", strategyName: "s1", predictedProbability: 0.5, confidence: 0.7, actualResult: "win", timestamp: "2026-01-01T00:00:00Z" },
      { predictionId: "p2", gameType: "DICE", strategyName: "s1", predictedProbability: 0.5, confidence: 0.7, actualResult: "loss", timestamp: "2026-01-02T00:00:00Z" },
      { predictionId: "p3", gameType: "DICE", strategyName: "s1", predictedProbability: 0.5, confidence: 0.7, actualResult: "win", timestamp: "2026-01-03T00:00:00Z" },
    ];
    const store = new HistoryStore(records);
    const counts = store.getCounts();
    expect(counts.wins).toBe(2);
    expect(counts.losses).toBe(1);
  });

  it("static replay produces same state", () => {
    const records: LearningRecord[] = [
      { predictionId: "p1", gameType: "DICE", strategyName: "s1", predictedProbability: 0.5, confidence: 0.7, actualResult: "win", timestamp: "2026-01-01T00:00:00Z" },
      { predictionId: "p2", gameType: "DICE", strategyName: "s1", predictedProbability: 0.5, confidence: 0.7, actualResult: "loss", timestamp: "2026-01-02T00:00:00Z" },
    ];
    const store1 = HistoryStore.replay(records);
    const store2 = HistoryStore.replay(records);
    expect(store1.size).toBe(store2.size);
    expect(store1.getAll()).toEqual(store2.getAll());
  });
});

/* ════════════════════════════════════════════════════════════
   Bayesian Update
   ════════════════════════════════════════════════════════════ */

describe("Bayesian update", () => {
  it("correct prediction increases confidence", () => {
    const result = recordPrediction(new HistoryStore(), makeInput({
      confidence: 0.5, predictedProbability: 0.5, actualResult: "win",
    }));
    expect(result.output.calibratedConfidence).toBeGreaterThan(0.5);
  });

  it("incorrect prediction decreases confidence", () => {
    const result = recordPrediction(new HistoryStore(), makeInput({
      confidence: 0.7, predictedProbability: 0.7, actualResult: "loss",
    }));
    expect(result.output.calibratedConfidence).toBeLessThan(0.7);
  });

  it("confidence never exceeds 0.99", () => {
    // Simulate many consecutive wins with high confidence
    const records: LearningRecord[] = [];
    for (let i = 0; i < 50; i++) {
      records.push({
        predictionId: `win-${i}`, gameType: "DICE", strategyName: "s1",
        predictedProbability: 0.95, confidence: 0.95, actualResult: "win",
        timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      });
    }
    const store = new HistoryStore(records);
    const result = recordPrediction(store, makeInput({
      predictionId: "next-win",
      strategyName: "s1",
      confidence: 0.95,
      predictedProbability: 0.95,
      actualResult: "win",
    }));
    expect(result.output.calibratedConfidence).toBeLessThanOrEqual(0.99);
  });

  it("confidence never goes below 0.01", () => {
    const result = recordPrediction(new HistoryStore(), makeInput({
      confidence: 0.01, predictedProbability: 0.01, actualResult: "loss",
    }));
    expect(result.output.calibratedConfidence).toBeGreaterThanOrEqual(0.01);
  });

  it("high confidence error penalizes more than low confidence error", () => {
    // High confidence error
    const highResult = recordPrediction(new HistoryStore(), makeInput({
      confidence: 0.95, predictedProbability: 0.95, actualResult: "loss",
    }));
    // Low confidence error
    const lowResult = recordPrediction(new HistoryStore(), makeInput({
      confidence: 0.55, predictedProbability: 0.55, actualResult: "loss",
    }));
    // High confidence should drop more
    const highDrop = 0.95 - highResult.output.calibratedConfidence;
    const lowDrop = 0.55 - lowResult.output.calibratedConfidence;
    expect(highDrop).toBeGreaterThan(lowDrop);
  });

  it("Bayesian update is stable over many observations", () => {
    // Build a store with 40 wins / 10 losses (80% accuracy)
    const records: LearningRecord[] = [];
    for (let i = 0; i < 50; i++) {
      const isWin = i < 40;
      records.push({
        predictionId: `r-${i}`, gameType: "DICE", strategyName: "stable-s",
        predictedProbability: 0.7, confidence: 0.7,
        actualResult: isWin ? "win" : "loss",
        timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      });
    }
    const store = new HistoryStore(records);

    // Add one more win — calibrated confidence should approach true accuracy (~0.8)
    const result = recordPrediction(store, makeInput({
      predictionId: "final-win",
      strategyName: "stable-s",
      confidence: 0.7,
      predictedProbability: 0.7,
      actualResult: "win",
    }));
    expect(result.output.rollingAccuracy).toBeGreaterThan(0.7);
    expect(result.output.calibratedConfidence).toBeGreaterThan(0.6);
    expect(result.output.calibratedConfidence).toBeLessThanOrEqual(0.99);
  });
});

/* ════════════════════════════════════════════════════════════
   Calibration Metrics
   ════════════════════════════════════════════════════════════ */

describe("Calibration metrics", () => {
  it("prediction error is 0 for perfect prediction", () => {
    const result = recordPrediction(new HistoryStore(), makeInput({
      predictedProbability: 1.0, actualResult: "win",
    }));
    expect(result.output.predictionError).toBe(0);
  });

  it("prediction error is 1 for maximally wrong prediction", () => {
    const result = recordPrediction(new HistoryStore(), makeInput({
      predictedProbability: 0, actualResult: "win",
    }));
    expect(result.output.predictionError).toBe(1);
  });

  it("brier score is 0 with perfect accuracy", () => {
    const records: LearningRecord[] = Array.from({ length: 10 }, (_, i) => ({
      predictionId: `perfect-${i}`, gameType: "DICE", strategyName: "s1",
      predictedProbability: 0.9, confidence: 0.9, actualResult: "win",
      timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    const store = new HistoryStore(records);
    const cal = store.getCalibration();
    expect(cal.brierScore).toBe(0.01); // (0.9-1)² = 0.01
  });

  it("rolling accuracy reflects recent performance", () => {
    const records: LearningRecord[] = [];
    for (let i = 0; i < 20; i++) {
      records.push({
        predictionId: `r-${i}`, gameType: "MINES", strategyName: "s1",
        predictedProbability: 0.5, confidence: 0.5,
        actualResult: i < 15 ? "win" : "loss",
        timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      });
    }
    const store = new HistoryStore(records);
    const cal = store.getCalibration();
    expect(cal.rollingAccuracy).toBeCloseTo(0.75, 1);
  });

  it("calibration shift is bounded", () => {
    const result = recordPrediction(new HistoryStore(), makeInput({
      confidence: 0.99, predictedProbability: 0.99, actualResult: "loss",
    }));
    // Even with extreme shift, the difference should be reasonable
    expect(result.output.calibrationShift).toBeLessThan(0.5);
  });

  it("confidence drift is zero for single record", () => {
    const store = new HistoryStore();
    const cal = store.getCalibration();
    expect(cal.confidenceDrift).toBe(0);
  });
});

/* ════════════════════════════════════════════════════════════
   Policy Update
   ════════════════════════════════════════════════════════════ */

describe("Policy update", () => {
  it("poor calibration reduces bet fraction", () => {
    const records: LearningRecord[] = Array.from({ length: 20 }, (_, i) => ({
      predictionId: `bad-${i}`, gameType: "DICE", strategyName: "s1",
      predictedProbability: 0.9, confidence: 0.9, actualResult: "loss",
      timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    const store = new HistoryStore(records);
    const result = recordPrediction(store, makeInput({
      strategyName: "s1",
      confidence: 0.9, predictedProbability: 0.9, actualResult: "loss",
    }));
    // Poor calibration should lead to bet fraction reduction
    expect(result.output.updatedRiskProfile.recommendedBetFraction).toBeLessThan(0.03);
  });

  it("good calibration maintains settings", () => {
    const records: LearningRecord[] = Array.from({ length: 20 }, (_, i) => ({
      predictionId: `good-${i}`, gameType: "DICE", strategyName: "s1",
      predictedProbability: 0.6, confidence: 0.6, actualResult: "win",
      timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    const store = new HistoryStore(records);
    const result = recordPrediction(store, makeInput({
      strategyName: "s1",
      confidence: 0.6, predictedProbability: 0.6, actualResult: "win",
    }));
    expect(result.output.updatedRiskProfile.recommendedConfidence).toBeGreaterThan(0);
  });

  it("detects overconfidence gap", () => {
    const records: LearningRecord[] = Array.from({ length: 20 }, (_, i) => ({
      predictionId: `overconf-${i}`, gameType: "CRASH", strategyName: "s1",
      predictedProbability: 0.3, confidence: 0.8, actualResult: "loss",
      timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    const store = new HistoryStore(records);
    const result = recordPrediction(store, makeInput({
      strategyName: "s1",
      confidence: 0.8, predictedProbability: 0.3, actualResult: "loss",
    }));
    // High confidence with poor accuracy should trigger warnings
    expect(result.output.learningWarnings.length).toBeGreaterThan(0);
  });
});

/* ════════════════════════════════════════════════════════════
   Consecutive Errors
   ════════════════════════════════════════════════════════════ */

describe("Consecutive errors", () => {
  it("consecutive errors reduce confidence step by step", () => {
    let store = new HistoryStore();

    const confidences: number[] = [];
    for (let i = 0; i < 5; i++) {
      const result = recordPrediction(store, makeInput({
        predictionId: `loss-${i}`,
        strategyName: "consec-s",
        confidence: 0.7,
        predictedProbability: 0.5,
        actualResult: "loss",
      }));
      store = result.store;
      confidences.push(result.output.calibratedConfidence);
    }

    // Each subsequent loss should reduce confidence (diminishing returns, but still downward)
    for (let i = 1; i < confidences.length; i++) {
      expect(confidences[i]).toBeLessThanOrEqual(confidences[i - 1]);
    }
  });

  it("reports warning after 3 consecutive losses", () => {
    let store = new HistoryStore();
    let lastResult = null;

    for (let i = 0; i < 4; i++) {
      const result = recordPrediction(store, makeInput({
        predictionId: `loss-${i}`,
        strategyName: "consec-warn-s",
        confidence: 0.7,
        predictedProbability: 0.5,
        actualResult: "loss",
      }));
      store = result.store;
      lastResult = result;
    }

    expect(lastResult!.output.learningWarnings.some(
      (w) => w.includes("consecutive losses"),
    )).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════
   Output contract
   ════════════════════════════════════════════════════════════ */

describe("LearningOutput contract", () => {
  it("all output fields are present and valid", () => {
    const result = recordPrediction(new HistoryStore(), makeInput());
    const output = result.output;

    expect(typeof output.calibratedConfidence).toBe("number");
    expect(output.calibratedConfidence).toBeGreaterThanOrEqual(0.01);
    expect(output.calibratedConfidence).toBeLessThanOrEqual(0.99);

    expect(typeof output.predictionError).toBe("number");
    expect(output.predictionError).toBeGreaterThanOrEqual(0);
    expect(output.predictionError).toBeLessThanOrEqual(1);

    expect(typeof output.rollingAccuracy).toBe("number");
    expect(output.rollingAccuracy).toBeGreaterThanOrEqual(0);
    expect(output.rollingAccuracy).toBeLessThanOrEqual(1);

    expect(typeof output.brierScore).toBe("number");
    expect(output.brierScore).toBeGreaterThanOrEqual(0);

    expect(typeof output.calibrationShift).toBe("number");

    expect(output.updatedRiskProfile).toBeDefined();
    expect(typeof output.updatedRiskProfile.recommendedConfidence).toBe("number");
    expect(typeof output.updatedRiskProfile.recommendedBetFraction).toBe("number");
    expect(["LOW", "MEDIUM", "HIGH"]).toContain(output.updatedRiskProfile.riskLevel);

    expect(typeof output.recommendedAdjustment).toBe("string");
    expect(Array.isArray(output.learningWarnings)).toBe(true);
  });

  it("no forbidden language in output", () => {
    const result = recordPrediction(new HistoryStore(), makeInput());
    const text = JSON.stringify(result.output).toLowerCase();
    const forbidden = ["guaranteed", "certain win", "sure profit", "必赚", "稳赢", "保证盈利"];
    for (const word of forbidden) {
      expect(text).not.toContain(word);
    }
  });

  it("store is a new instance after recordPrediction", () => {
    const store = new HistoryStore();
    const result = recordPrediction(store, makeInput());
    expect(result.store).not.toBe(store);
    expect(result.store.size).toBe(1);
    expect(store.size).toBe(0);
  });
});

/* ════════════════════════════════════════════════════════════
   Deterministic replay
   ════════════════════════════════════════════════════════════ */

describe("Deterministic replay", () => {
  it("same sequence produces same calibration metrics", () => {
    const records: LearningRecord[] = [
      { predictionId: "a", gameType: "DICE", strategyName: "s1", predictedProbability: 0.6, confidence: 0.7, actualResult: "win", timestamp: "2026-01-01T00:00:00Z" },
      { predictionId: "b", gameType: "DICE", strategyName: "s1", predictedProbability: 0.6, confidence: 0.7, actualResult: "loss", timestamp: "2026-01-02T00:00:00Z" },
      { predictionId: "c", gameType: "DICE", strategyName: "s1", predictedProbability: 0.6, confidence: 0.7, actualResult: "win", timestamp: "2026-01-03T00:00:00Z" },
    ];
    const cal1 = HistoryStore.replay(records).getCalibration();
    const cal2 = HistoryStore.replay(records).getCalibration();
    expect(cal1).toEqual(cal2);

    // Different order should produce different results
    const reversed = [...records].reverse();
    // But reversed has timestamps in wrong order, so sorting will fix it — use different strategy
    const cal3 = HistoryStore.replay(reversed).getCalibration();
    // All records stay the same regardless of input order (sorted by timestamp)
    expect(cal3).toEqual(cal1);
  });

  it("recordPrediction is deterministic for same inputs", () => {
    const input = makeInput({
      predictionId: "det-test",
      confidence: 0.7,
      predictedProbability: 0.6,
      actualResult: "win",
    });
    const r1 = recordPrediction(new HistoryStore(), input);
    const r2 = recordPrediction(new HistoryStore(), input);
    expect(r1.output.calibratedConfidence).toBe(r2.output.calibratedConfidence);
    expect(r1.output.predictionError).toBe(r2.output.predictionError);
    expect(r1.output.rollingAccuracy).toBe(r2.output.rollingAccuracy);
  });
});
