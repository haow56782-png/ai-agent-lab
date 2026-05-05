/**
 * VIB AI — Game Domain Types
 *
 * Based on: docs/domain-model.md
 */

export type GameType = "SLOT" | "FISHING" | "SPORTS" | "ESPORTS" | "CARD" | "LOTTERY";
export type GameProvider = "PG_SOFT" | "JILI" | "SPADE_GAMING" | "HABANERO" | "CQ9" | "GEMINI";
export type PredictionMode = "QUICK" | "DETAILED";
export type Timeframe = "1H" | "24H" | "7D" | "30D";
export type MetricStatus = "ACTIVE" | "PAUSED" | "DATA_PENDING" | "ERROR";

export interface Game {
  id: string;
  name: string;
  provider: GameProvider;
  type: GameType;
  metadata: Record<string, string>;
}

export interface PredictionInput {
  game: Game;
  mode: PredictionMode;
  context?: Record<string, unknown>;
}

export interface PredictionResult {
  game: string;
  prediction: string;
  confidence: number;    // 0.0–1.0
  factors: string[];     // ≥ 1
  mode: PredictionMode;
  timestamp: string;     // ISO-8601
}

export interface MetricsInput {
  gameId: string;
  timeframe: Timeframe;
}

export interface GameMetrics {
  game: string;
  timeframe: Timeframe;
  activeUsers: number;
  totalPredictions: number;
  avgAccuracy: number;
  status: MetricStatus;
}

/** Pre-registered games that the system knows about */
export const KNOWN_GAMES: Game[] = [
  { id: "gemini", name: "Gemini", provider: "GEMINI", type: "SLOT", metadata: { volatility: "medium" } },
  { id: "gem-saviour", name: "Gem Saviour", provider: "PG_SOFT", type: "SLOT", metadata: { volatility: "high" } },
  { id: "treasure-bowl", name: "Treasure Bowl", provider: "PG_SOFT", type: "FISHING", metadata: {} },
];

export function findGame(name: string): Game | undefined {
  const lower = name.toLowerCase();
  return KNOWN_GAMES.find(
    (g) => g.name.toLowerCase() === lower || g.id === lower,
  );
}

export function validateConfidence(confidence: number): boolean {
  return confidence >= 0.0 && confidence <= 1.0;
}

export function validatePrediction(result: PredictionResult): string[] {
  const errors: string[] = [];
  if (!validateConfidence(result.confidence)) {
    errors.push(`confidence ${result.confidence} out of range [0.0, 1.0]`);
  }
  if (!result.factors || result.factors.length < 1) {
    errors.push("factors must have ≥ 1 element");
  }
  if (!result.game) {
    errors.push("game is required");
  }
  if (!result.timestamp) {
    errors.push("timestamp is required");
  }
  return errors;
}
