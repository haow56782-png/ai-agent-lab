/**
 * Signal Output Contract Tests — P3.2 Signal Output Contract & Decision Evidence Protocol
 *
 * Tests:
 * - Contract field completeness
 * - generated_at is valid ISO timestamp
 * - factors have name/value/weight/explanation
 * - confidence in 0..1
 * - risk_level is valid
 * - unknown/null/undefined input doesn't crash
 * - Compatible with P3.1 safeTrim fix
 */

import { describe, it, expect } from "vitest";
import {
  validateSignalContract,
  generateSignalId,
  resetSignalIdCounter,
} from "../../src/protocols/signal-output-contract.js";
import type { SignalOutputContract } from "../../src/protocols/signal-output-contract.js";

/* ── Helpers ────────────────────────────────────────────── */

function validContract(overrides?: Partial<SignalOutputContract>): SignalOutputContract {
  return {
    signal_id: "SIG-TEST-001",
    domain: "prediction",
    tool_name: "predict_game_outcome",
    outcome: { label: "ROLL_4", confidence: 0.5, probability: 0.1667 },
    evidence: [{ key: "game_type", value: "DICE", source: "domain", weight: 1.0 }],
    factors: [
      { name: "base_probability", value: 0.1667, weight: 0.9, explanation: "Fair die 1/6" },
    ],
    timing: { generated_at: new Date().toISOString() },
    risk: { risk_level: "LOW", warnings: [], failure_modes: ["model_uncertainty"] },
    decision: { recommendation: "SKIP", action: "avoid", reason: "Negative EV for single number" },
    audit: { cost_guard_applied: false, reviewer_required: false },
    ...overrides,
  };
}

/* ── Tests ──────────────────────────────────────────────── */

describe("SignalOutputContract — field completeness", () => {
  it("valid contract passes validation", () => {
    const c = validContract();
    expect(validateSignalContract(c)).toEqual([]);
  });

  it("signal_id is required", () => {
    const c = validContract({ signal_id: "" as string });
    const errors = validateSignalContract(c);
    expect(errors.some((e) => e.includes("signal_id"))).toBe(true);
  });

  it("domain must be valid", () => {
    const c = validContract({ domain: "invalid" as "prediction" });
    const errors = validateSignalContract(c);
    expect(errors.some((e) => e.includes("domain"))).toBe(true);
  });

  it("domain accepts prediction/decision/simulation", () => {
    for (const domain of ["prediction", "decision", "simulation"] as const) {
      const c = validContract({ domain });
      expect(validateSignalContract(c)).toEqual([]);
    }
  });

  it("outcome.label is required", () => {
    const c = validContract({ outcome: { label: "", confidence: 0.5 } });
    const errors = validateSignalContract(c);
    expect(errors.some((e) => e.includes("outcome.label"))).toBe(true);
  });

  it("outcome.confidence is 0..1", () => {
    const c = validContract({ outcome: { label: "TEST", confidence: 1.5 } });
    const errors = validateSignalContract(c);
    expect(errors.some((e) => e.includes("confidence"))).toBe(true);
  });
});

describe("SignalOutputContract — generated_at is valid ISO timestamp", () => {
  it("generated_at passes Date.parse", () => {
    const c = validContract();
    expect(isNaN(Date.parse(c.timing.generated_at))).toBe(false);
  });

  it("missing generated_at fails", () => {
    const c = validContract({ timing: { generated_at: "" } });
    const errors = validateSignalContract(c);
    expect(errors.some((e) => e.includes("generated_at"))).toBe(true);
  });
});

describe("SignalOutputContract — factors have name/value/weight/explanation", () => {
  it("each factor has all required fields", () => {
    const c = validContract();
    for (const f of c.factors) {
      expect(typeof f.name).toBe("string");
      expect(f.name.length).toBeGreaterThan(0);
      expect(typeof f.weight).toBe("number");
      expect(f.weight).toBeGreaterThanOrEqual(0);
      expect(f.weight).toBeLessThanOrEqual(1);
      expect(typeof f.explanation).toBe("string");
      expect(f.explanation.length).toBeGreaterThan(0);
    }
  });

  it("factor without name fails validation", () => {
    const c = validContract({
      factors: [{ name: "", value: 0.5, weight: 0.5, explanation: "test" }],
    });
    const errors = validateSignalContract(c);
    expect(errors.some((e) => e.includes("factors"))).toBe(true);
  });
});

describe("SignalOutputContract — confidence in 0..1", () => {
  it("confidence 0 is valid", () => {
    const c = validContract({ outcome: { label: "TEST", confidence: 0 } });
    expect(validateSignalContract(c)).toEqual([]);
  });

  it("confidence 1 is valid", () => {
    const c = validContract({ outcome: { label: "TEST", confidence: 1 } });
    expect(validateSignalContract(c)).toEqual([]);
  });

  it("confidence -0.1 is invalid", () => {
    const c = validContract({ outcome: { label: "TEST", confidence: -0.1 } });
    const errors = validateSignalContract(c);
    expect(errors.some((e) => e.includes("confidence"))).toBe(true);
  });
});

describe("SignalOutputContract — risk_level must be valid", () => {
  it("accepts LOW MEDIUM HIGH EXTREME", () => {
    for (const rl of ["LOW", "MEDIUM", "HIGH", "EXTREME"] as const) {
      const c = validContract({ risk: { risk_level: rl, warnings: [], failure_modes: [] } });
      expect(validateSignalContract(c)).toEqual([]);
    }
  });

  it("rejects invalid risk_level", () => {
    const c = validContract({ risk: { risk_level: "INVALID" as "LOW", warnings: [], failure_modes: [] } });
    const errors = validateSignalContract(c);
    expect(errors.some((e) => e.includes("risk_level"))).toBe(true);
  });
});

describe("SignalOutputContract — unknown/null/undefined input", () => {
  it("validateSignalContract handles undefined input gracefully", () => {
    expect(() => validateSignalContract(undefined)).not.toThrow();
  });

  it("generateSignalId returns a non-empty string", () => {
    resetSignalIdCounter();
    const id = generateSignalId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    expect(id.startsWith("SIG-")).toBe(true);
  });
});

describe("SignalOutputContract — evidence structure", () => {
  it("evidence with missing key fails validation", () => {
    const c = validContract({
      evidence: [{ key: "", value: "test", source: "domain", weight: 0.5 }],
    });
    const errors = validateSignalContract(c);
    expect(errors.some((e) => e.includes("evidence"))).toBe(true);
  });

  it("evidence with null value fails validation", () => {
    const c = validContract({
      evidence: [{ key: "test_key", value: null, source: "domain", weight: 0.5 }],
    });
    const errors = validateSignalContract(c);
    expect(errors.some((e) => e.includes("evidence"))).toBe(true);
  });
});
