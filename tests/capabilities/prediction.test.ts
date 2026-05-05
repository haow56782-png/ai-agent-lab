import { describe, it, expect } from "vitest";
import { predict } from "../../src/domain/prediction.js";
import { getMetrics } from "../../src/domain/metrics.js";
import { findGame, validatePrediction } from "../../src/domain/game.js";

describe("Prediction Capability", () => {
  it("should return valid prediction for known game", async () => {
    const game = findGame("Gemini")!;
    const result = await predict({ game, mode: "QUICK" });

    expect(result.game).toBe("Gemini");
    expect(result.confidence).toBeGreaterThanOrEqual(0.0);
    expect(result.confidence).toBeLessThanOrEqual(1.0);
    expect(result.factors.length).toBeGreaterThanOrEqual(1);
    expect(result.prediction).not.toBe("UNKNOWN_GAME");
    expect(result.timestamp).toBeTruthy();

    const errors = validatePrediction(result);
    expect(errors).toHaveLength(0);
  });

  it("should return unknown for unregistered game", async () => {
    const game = findGame("non_existent_game") ?? { id: "unknown", name: "Unknown", provider: "PG_SOFT", type: "SLOT", metadata: {} };
    const result = await predict({ game, mode: "QUICK" });

    expect(result.prediction).toBe("UNKNOWN_GAME");
    expect(result.confidence).toBe(0.0);
  });

  it("should return metrics for known game", async () => {
    const metrics = await getMetrics("Gemini", "24H");

    expect(metrics.game).toBe("Gemini");
    expect(metrics.status).toBe("ACTIVE");
    expect(metrics.activeUsers).toBeGreaterThan(0);
    expect(metrics.totalPredictions).toBeGreaterThan(0);
    expect(metrics.avgAccuracy).toBeGreaterThanOrEqual(0);
  });

  it("should return data_pending for unknown game metrics", async () => {
    const metrics = await getMetrics("UnknownGame", "24H");
    expect(metrics.status).toBe("DATA_PENDING");
    expect(metrics.activeUsers).toBe(0);
  });
});
