/** ============================================================
 *  Game Prediction — Unified entry point
 *
 *  Routes prediction requests to the correct domain module
 *  (Dice, Crash, or Mines) and provides game list / risk
 *  profile queries.
 *  ============================================================ */

import type { GameInput, Signal, RiskProfile, GameType } from "./domains/types.js";
import { generateSignal as diceSignal } from "./domains/dice.js";
import { getRiskProfile as diceProfile } from "./domains/dice.js";
import { generateSignal as crashSignal } from "./domains/crash.js";
import { getRiskProfile as crashProfile } from "./domains/crash.js";
import { generateSignal as minesSignal } from "./domains/mines.js";
import { getRiskProfile as minesProfile } from "./domains/mines.js";

/* ─── Game registry ─── */

interface GameEntry {
  type: GameType;
  name: string;
  description: string;
}

const GAMES: GameEntry[] = [
  { type: "DICE", name: "Dice", description: "Fair 6-sided die. Predict which number will appear." },
  { type: "CRASH", name: "Crash", description: "Multiplier crash game. Predict how high it goes before crashing." },
  { type: "MINES", name: "Mines", description: "Grid minefield. Predict survival probability." },
];

/* ─── Public API ─── */

/**
 * Generate a prediction signal for the given game input.
 * Routes to the correct domain module based on gameType.
 */
export function predict(input: GameInput): Signal {
  switch (input.gameType) {
    case "DICE":
      return diceSignal(input);
    case "CRASH":
      return crashSignal(input);
    case "MINES":
      return minesSignal(input);
    default:
      throw new Error(`Unknown game type: ${(input as GameInput).gameType}`);
  }
}

/**
 * Get the list of supported games with descriptions.
 */
export function getGameList(): { type: GameType; name: string; description: string }[] {
  return GAMES;
}

/**
 * Get the risk profile for a specific game type.
 */
export function getRiskProfile(gameType: GameType): RiskProfile {
  switch (gameType) {
    case "DICE":
      return diceProfile();
    case "CRASH":
      return crashProfile();
    case "MINES":
      return minesProfile();
    default:
      throw new Error(`Unknown game type: ${gameType}`);
  }
}
