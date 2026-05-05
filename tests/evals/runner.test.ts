import { describe, it, expect } from "vitest";
import { outputContainsAll, confidenceInRange } from "../../evals/metrics.js";

describe("Eval Framework", () => {
  it("should validate outputContainsAll correctly", () => {
    const result = outputContainsAll("game: Gemini, prediction: HIGH, confidence: 0.7", [
      "game",
      "prediction",
      "confidence",
    ]);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1.0);
    expect(result.errors).toHaveLength(0);
  });

  it("should detect missing fields in outputContainsAll", () => {
    const result = outputContainsAll("game: Gemini", ["game", "prediction", "confidence"]);
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(1.0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should validate confidence range", () => {
    expect(confidenceInRange(0.5, [0.0, 1.0])).toBe(true);
    expect(confidenceInRange(-0.1, [0.0, 1.0])).toBe(false);
    expect(confidenceInRange(1.5, [0.0, 1.0])).toBe(false);
    expect(confidenceInRange(0.0, [0.0, 1.0])).toBe(true);
    expect(confidenceInRange(1.0, [0.0, 1.0])).toBe(true);
  });
});
