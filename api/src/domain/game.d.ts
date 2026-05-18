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
    confidence: number;
    factors: string[];
    mode: PredictionMode;
    timestamp: string;
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
export declare const KNOWN_GAMES: Game[];
export declare function findGame(name: string): Game | undefined;
export declare function validateConfidence(confidence: number): boolean;
export declare function validatePrediction(result: PredictionResult): string[];
//# sourceMappingURL=game.d.ts.map