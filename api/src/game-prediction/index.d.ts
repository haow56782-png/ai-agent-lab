/** ============================================================
 *  Game Prediction — Unified entry point
 *
 *  Routes prediction requests to the correct domain module
 *  (Dice, Crash, or Mines) and provides game list / risk
 *  profile queries.
 *  ============================================================ */
import type { GameInput, Signal, RiskProfile, GameType } from "./domains/types.js";
/**
 * Generate a prediction signal for the given game input.
 * Routes to the correct domain module based on gameType.
 */
export declare function predict(input: GameInput): Signal;
/**
 * Get the list of supported games with descriptions.
 */
export declare function getGameList(): {
    type: GameType;
    name: string;
    description: string;
}[];
/**
 * Get the risk profile for a specific game type.
 */
export declare function getRiskProfile(gameType: GameType): RiskProfile;
//# sourceMappingURL=index.d.ts.map