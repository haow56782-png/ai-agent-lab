/**
 * Signal Output Integration Tests — P3.2 Signal Output Contract & Decision Evidence Protocol
 *
 * End-to-end tests: tool call → SignalOutputContract validation
 * for all 3 tools (predict_game_outcome, get_game_metrics, get_game_decision).
 *
 * Tests:
 * 1. predict_game_outcome produces valid contract for each game type
 * 2. get_game_metrics produces valid contract
 * 3. get_game_decision produces valid contract
 * 4. Error paths still return structured JSON (not contracts)
 * 5. All contracts pass validateSignalContract
 * 6. P3.1 safeTrim compatibility
 * 7. SignalOutputContract field presence for all required fields
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateSignalContract,
  resetSignalIdCounter,
} from "../../src/protocols/signal-output-contract.js";
import type { SignalOutputContract } from "../../src/protocols/signal-output-contract.js";
import { executeToolCall } from "../../src/tools/index.js";
import type { ToolContext } from "../../src/tools/index.js";
// Import tools to trigger registerTool() calls
import "../../src/tools/game-prediction.js";

/* ── Context ────────────────────────────────────────────── */

const defaultCtx: ToolContext = {
  projectRoot: "/tmp",
  designSystemPath: "/tmp",
};

/* ── Helper ─────────────────────────────────────────────── */

function parseAndValidate(raw: unknown): SignalOutputContract {
  if (typeof raw !== "string") throw new Error(`Expected string, got ${typeof raw}`);
  const parsed = JSON.parse(raw) as SignalOutputContract;
  const errors = validateSignalContract(parsed);
  expect(errors, `Expected valid SignalOutputContract, got:\n${errors.join("\n")}`).toEqual([]);
  return parsed;
}

/* ── Mocks ──────────────────────────────────────────────── */

vi.mock("../../src/domain/prediction.js", () => ({
  predict: vi.fn().mockResolvedValue({
    game: "Gemini",
    prediction: "UP_TREND_STRONG",
    confidence: 0.78,
    factors: ["Pattern analysis", "RTP trend", "Volatility index"],
    mode: "QUICK",
    timestamp: new Date().toISOString(),
  }),
}));

vi.mock("../../src/domain/metrics.js", () => ({
  getMetrics: vi.fn().mockResolvedValue({
    game: "Gemini",
    timeframe: "24H",
    activeUsers: 1234,
    totalPredictions: 5678,
    avgAccuracy: 0.72,
    status: "ACTIVE",
  }),
}));

vi.mock("../../src/game-prediction/index.js", () => {
  const diceSignal = {
    gameType: "DICE",
    recommendation: "SKIP",
    confidence: 0.95,
    probability: 0.1667,
    expectedValue: 0.97,
    reasoning: "Negative EV for single number bet",
    riskLevel: "LOW",
    assumptions: ["Fair 6-sided die"],
    disclaimers: ["Past results do not affect future probability"],
    riskWarning: "Each roll is independent",
    explanation: "Dice prediction based on uniform distribution",
  };
  const crashSignal = {
    gameType: "CRASH",
    recommendation: "CAUTION",
    confidence: 0.75,
    probability: 0.485,
    expectedValue: 0.95,
    reasoning: "1.5x target has moderate probability but high variance",
    riskLevel: "HIGH",
    assumptions: ["Fair RNG", "House edge 3%"],
    disclaimers: ["Crash games have high variance"],
    riskWarning: "High volatility game",
    explanation: "Crash prediction based on probability distribution",
  };
  const minesSignal = {
    gameType: "MINES",
    recommendation: "BET",
    confidence: 0.92,
    probability: 0.72,
    expectedValue: 1.15,
    reasoning: "Good probability for 1 mine 1 pick on 5x5 grid",
    riskLevel: "MEDIUM",
    assumptions: ["Combinatorial math is correct"],
    disclaimers: ["Each pick is independent"],
    riskWarning: "Mines can hit on first pick",
    explanation: "Mines prediction based on combinatorial probability",
  };
  return {
    predict: vi.fn().mockImplementation((input: { gameType: string }) => {
      if (input.gameType === "CRASH") return crashSignal;
      if (input.gameType === "MINES") return minesSignal;
      return diceSignal;
    }),
    getGameList: vi.fn().mockReturnValue([]),
    getRiskProfile: vi.fn().mockReturnValue({}),
  };
});

vi.mock("../../src/game-prediction/decision-engine/index.js", () => ({
  decide: vi.fn().mockReturnValue({
    action: "SKIP",
    strategyName: "conservative_ev",
    recommendedBetSize: 0,
    confidence: 0.85,
    riskLevel: "MEDIUM",
    reasoning: "EV below threshold",
    assumptions: ["Bankroll = 100"],
    warnings: ["House edge reduces EV"],
    stopLoss: 50,
    explanationReport: "Full analysis.",
  }),
}));

vi.mock("../../src/domain/game.js", () => ({
  findGame: vi.fn().mockImplementation((name: string) => {
    if (name.toLowerCase() === "gemini") {
      return { id: "gemini", name: "Gemini", provider: "GEMINI", type: "SLOT", metadata: {} };
    }
    return undefined;
  }),
}));

/* ── Tests ──────────────────────────────────────────────── */

describe("SignalOutput Integration — predict_game_outcome", () => {
  beforeEach(() => {
    resetSignalIdCounter();
  });

  it("produces valid SignalOutputContract for dice input", async () => {
    const raw = await executeToolCall("predict_game_outcome", {
      game: "dice",
      targetNumber: 4,
    }, defaultCtx);
    const contract = parseAndValidate(raw);
    expect(contract.domain).toBe("prediction");
    expect(contract.outcome.label).toContain("DICE");
    expect(contract.risk.risk_level).toBeDefined();
  });

  it("produces valid SignalOutputContract for crash input", async () => {
    const raw = await executeToolCall("predict_game_outcome", {
      game: "crash",
      targetMultiplier: 1.5,
    }, defaultCtx);
    const contract = parseAndValidate(raw);
    expect(contract.domain).toBe("prediction");
    expect(contract.outcome.label).toContain("CRASH");
  });

  it("produces valid SignalOutputContract for mines input", async () => {
    const raw = await executeToolCall("predict_game_outcome", {
      game: "mines",
      minesCount: 5,
      picksCount: 2,
    }, defaultCtx);
    const contract = parseAndValidate(raw);
    expect(contract.domain).toBe("prediction");
    expect(contract.outcome.label).toContain("MINES");
  });

  it("errors for unknown game return JSON error (not contract)", async () => {
    const raw = await executeToolCall("predict_game_outcome", { game: "nonexistent" }, defaultCtx);
    const parsed = JSON.parse(raw as string);
    expect(parsed).not.toHaveProperty("signal_id");
    expect(parsed).toHaveProperty("error");
  });

  it("handles undefined game gracefully (no crash)", async () => {
    const raw = await executeToolCall("predict_game_outcome", {}, defaultCtx);
    expect(typeof raw).toBe("string");
    const parsed = JSON.parse(raw as string);
    expect(parsed).toHaveProperty("error");
  });
});

describe("SignalOutput Integration — get_game_metrics", () => {
  beforeEach(() => {
    resetSignalIdCounter();
  });

  it("produces valid SignalOutputContract for known game", async () => {
    const raw = await executeToolCall("get_game_metrics", {
      game: "Gemini",
      timeframe: "24h",
    }, defaultCtx);
    const contract = parseAndValidate(raw);
    expect(contract.tool_name).toBe("get_game_metrics");
    expect(contract.evidence.some((e) => e.key === "active_users")).toBe(true);
  });

  it("errors for missing game name return JSON error", async () => {
    const raw = await executeToolCall("get_game_metrics", {}, defaultCtx);
    const parsed = JSON.parse(raw as string);
    expect(parsed).toHaveProperty("error");
  });
});

describe("SignalOutput Integration — get_game_decision", () => {
  beforeEach(() => {
    resetSignalIdCounter();
  });

  it("produces valid SignalOutputContract with decision fields", async () => {
    const raw = await executeToolCall("get_game_decision", {
      game: "dice",
      bankroll: 100,
      betSize: 10,
      riskPreference: "conservative",
    }, defaultCtx);
    const contract = parseAndValidate(raw);
    expect(contract.domain).toBe("decision");
    expect(contract.decision.action).toBeDefined();
    expect(contract.decision.reason.length).toBeGreaterThan(0);
  });

  it("errors for unknown game return JSON error", async () => {
    const raw = await executeToolCall("get_game_decision", {
      game: "",
      bankroll: 100,
      betSize: 10,
      riskPreference: "conservative",
    }, defaultCtx);
    const parsed = JSON.parse(raw as string);
    expect(parsed).toHaveProperty("error");
  });
});

describe("SignalOutput Integration — contract field completeness", () => {
  beforeEach(() => {
    resetSignalIdCounter();
  });

  it("all required top-level fields are present in dice prediction", async () => {
    const raw = await executeToolCall("predict_game_outcome", {
      game: "dice",
      targetNumber: 3,
    }, defaultCtx);
    const contract = parseAndValidate(raw);
    expect(contract).toHaveProperty("signal_id");
    expect(contract).toHaveProperty("domain");
    expect(contract).toHaveProperty("tool_name");
    expect(contract).toHaveProperty("outcome");
    expect(contract).toHaveProperty("evidence");
    expect(contract).toHaveProperty("factors");
    expect(contract).toHaveProperty("timing");
    expect(contract).toHaveProperty("risk");
    expect(contract).toHaveProperty("decision");
    expect(contract).toHaveProperty("audit");
  });

  it("signal_id format is SIG-{hex}-{counter}", async () => {
    resetSignalIdCounter();
    const raw = await executeToolCall("predict_game_outcome", {
      game: "dice",
      targetNumber: 1,
    }, defaultCtx);
    const contract = JSON.parse(raw as string) as SignalOutputContract;
    expect(contract.signal_id).toMatch(/^SIG-[0-9a-f]+-\d{4}$/);
  });

  it("timing.generated_at is valid ISO-8601", async () => {
    const raw = await executeToolCall("predict_game_outcome", {
      game: "mines",
      minesCount: 3,
      picksCount: 1,
    }, defaultCtx);
    const contract = JSON.parse(raw as string) as SignalOutputContract;
    expect(isNaN(Date.parse(contract.timing.generated_at))).toBe(false);
  });

  it("signal_id counter increments monotonically", async () => {
    resetSignalIdCounter();
    const raw1 = await executeToolCall("predict_game_outcome", { game: "dice", targetNumber: 1 }, defaultCtx);
    const raw2 = await executeToolCall("predict_game_outcome", { game: "dice", targetNumber: 2 }, defaultCtx);
    const c1 = JSON.parse(raw1 as string) as SignalOutputContract;
    const c2 = JSON.parse(raw2 as string) as SignalOutputContract;
    const seq1 = parseInt(c1.signal_id.split("-").pop()!, 10);
    const seq2 = parseInt(c2.signal_id.split("-").pop()!, 10);
    expect(seq2).toBe(seq1 + 1);
  });
});

describe("SignalOutput Integration — legacy domain fallback", () => {
  beforeEach(() => {
    resetSignalIdCounter();
  });

  it("produces valid contract for legacy Gemini game", async () => {
    const raw = await executeToolCall("predict_game_outcome", {
      game: "Gemini",
    }, defaultCtx);
    const contract = parseAndValidate(raw);
    expect(contract.tool_name).toBe("predict_game_outcome");
    expect(contract.decision.recommendation).toBeDefined();
  });
});
