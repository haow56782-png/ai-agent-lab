/** ============================================================
 *  Mines — Combinatorial grid probability prediction
 *
 *  A 5×5 grid (25 squares) hides M mines.  The player picks
 *  squares to reveal.  Hitting a mine loses the bet; surviving
 *  all picks wins.
 *
 *  Survival probability is pure combinatorial math:
 *    P(survive N picks) = C(25 - M, N) / C(25, N)
 *
 *  Each pick is independent — past successful picks do not
 *  change the conditional probability of future picks.
 *  ============================================================ */

import type { MinesInput, Signal, RiskProfile } from "./types.js";

/* ─── Constants ─── */

const DEFAULT_GRID_SIZE = 5;
const TOTAL_SQUARES = DEFAULT_GRID_SIZE * DEFAULT_GRID_SIZE; // 25
const HOUSE_EDGE = 0.05;          // 5% (typical mines game)
const RTP = 1 - HOUSE_EDGE;       // 95%

/* ─── Risk profile ─── */

export function getRiskProfile(): RiskProfile {
  return {
    gameType: "MINES",
    rtp: RTP * 100,
    volatility: "VERY_HIGH",
    houseEdge: HOUSE_EDGE * 100,
    maxExposure: 25,              // worst case: lose all on first pick
    description:
      "Mines is a high-volatility game with combinatorial probability. "
      + "Each pick is independent. A mine can appear on the first pick "
      + "regardless of how many squares remain.",
  };
}

/* ─── Input validation ─── */

export interface ValidatedMinesInput {
  gridSize: number;
  minesCount: number;
  picksCount: number;
}

export function parseMinesInput(input: MinesInput): ValidatedMinesInput {
  const gridSize = input.gridSize ?? DEFAULT_GRID_SIZE;
  const totalSquares = gridSize * gridSize;
  const minesCount = input.minesCount;
  const picksCount = input.picksCount;

  if (!Number.isInteger(gridSize) || gridSize < 2 || gridSize > 10) {
    throw new Error(`Invalid gridSize: ${gridSize}. Must be 2–10.`);
  }

  if (!Number.isInteger(minesCount) || minesCount < 1 || minesCount >= totalSquares) {
    throw new Error(
      `Invalid minesCount: ${minesCount}. Must be 1–${totalSquares - 1}.`,
    );
  }

  if (!Number.isInteger(picksCount) || picksCount < 1 || picksCount > totalSquares - minesCount) {
    throw new Error(
      `Invalid picksCount: ${picksCount}. Must be 1–${totalSquares - minesCount}.`,
    );
  }

  return { gridSize, minesCount, picksCount };
}

/* ─── Probability ─── */

/**
 * Survival probability after N picks on a grid with M mines.
 *
 *   P(survive N picks) = C(25 - M, N) / C(25, N)
 *
 * where C(n, k) is the binomial coefficient.
 */
export function calculateProbability(parsed: ValidatedMinesInput): number {
  const { minesCount, picksCount } = parsed;
  const total = TOTAL_SQUARES;
  const safeSquares = total - minesCount;

  if (picksCount > safeSquares) return 0;
  if (minesCount === 0) return 1;

  // C(safe, picks) / C(total, picks)
  const successCombinations = combinations(safeSquares, picksCount);
  const totalCombinations = combinations(total, picksCount);

  return successCombinations / totalCombinations;
}

/* ─── Confidence ─── */

export function calculateConfidence(): number {
  // Combinatorial math is deterministic — very high confidence
  return 0.97;
}

/* ─── Recommendation ─── */

export function generateRecommendation(
  parsed: ValidatedMinesInput,
  probability: number,
): { recommendation: "BET" | "SKIP" | "CAUTION"; riskLevel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME" } {
  const { minesCount, picksCount } = parsed;

  // Few mines, few picks — reasonable probability
  if (probability >= 0.70 && picksCount <= 2) {
    return { recommendation: "CAUTION", riskLevel: "HIGH" };
  }

  // Very few mines, single pick — highest probability scenario
  if (probability >= 0.90) {
    return { recommendation: "BET", riskLevel: "MEDIUM" };
  }

  // Many mines or many picks — probability drops fast
  if (minesCount >= 10 && picksCount >= 2) {
    return { recommendation: "SKIP", riskLevel: "EXTREME" };
  }

  if (probability < 0.30) {
    return { recommendation: "SKIP", riskLevel: "EXTREME" };
  }

  return { recommendation: "SKIP", riskLevel: "HIGH" };
}

/* ─── Explanation ─── */

export function getExplanation(
  parsed: ValidatedMinesInput,
  probability: number,
): string {
  const { gridSize, minesCount, picksCount } = parsed;
  const total = TOTAL_SQUARES;
  const safeSquares = total - minesCount;

  const parts: string[] = [
    `Mines prediction for ${gridSize}×${gridSize} grid with ${minesCount} mine(s) and ${picksCount} planned pick(s).`,
    `There are ${safeSquares} safe squares out of ${total}.`,
    `Survival probability: ${(probability * 100).toFixed(2)}%.`,
  ];

  if (minesCount <= 3 && picksCount <= 2) {
    parts.push(
      "Low mine count with few picks gives reasonable survival odds. However, a mine can appear on the first pick regardless.",
    );
  } else if (minesCount >= 10) {
    parts.push(
      "High mine density means very low survival probability after even one pick.",
    );
  } else {
    parts.push(
      "Combinatorial probability decreases rapidly with each additional pick.",
    );
  }

  return parts.join(" ");
}

/* ── Disclaimers ── */

function getDisclaimers(): string[] {
  return [
    "Each pick is independent. Previous successful picks do not change future mine probability.",
    "Combinatorial probability is exact math, but actual game outcomes are random.",
    "Mines is a very high volatility game. You can lose on the first pick regardless of strategy.",
  ];
}

function getAssumptions(): string[] {
  return [
    `Grid is ${DEFAULT_GRID_SIZE}×${DEFAULT_GRID_SIZE} (${TOTAL_SQUARES} squares).`,
    "Mines are randomly placed — every configuration is equally likely.",
    `House edge is ${(HOUSE_EDGE * 100).toFixed(1)}% (RTP: ${(RTP * 100).toFixed(1)}%).`,
  ];
}

/* ─── Main entry ─── */

export function generateSignal(input: MinesInput): Signal {
  const parsed = parseMinesInput(input);
  const probability = calculateProbability(parsed);
  const confidence = calculateConfidence();
  const { recommendation, riskLevel } = generateRecommendation(parsed, probability);

  return {
    gameType: "MINES",
    recommendation,
    confidence,
    reasoning: probability >= 0.70
      ? `Survival probability is ${(probability * 100).toFixed(1)}%. Combinatorial math favors this configuration.`
      : `Survival probability is ${(probability * 100).toFixed(1)}%. Risk of hitting a mine is high.`,
    riskLevel,
    probability,
    assumptions: getAssumptions(),
    disclaimers: getDisclaimers(),
    riskWarning: riskLevel === "EXTREME"
      ? `Extreme risk: ${(probability * 100).toFixed(1)}% survival probability. ${parsed.minesCount} mines on a ${parsed.gridSize}×${parsed.gridSize} grid.`
      : `Mines risk: ${(probability * 100).toFixed(1)}% survival probability with ${parsed.minesCount} mine(s) and ${parsed.picksCount} pick(s).`,
    explanation: getExplanation(parsed, probability),
  };
}

/* ── Internal helpers (re-exported for testing) ─── */

function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result = (result * (n - k + i)) / i;
  }
  return result;
}
