/** ============================================================
 *  Game Prediction — Unified entry point
 *
 *  Routes prediction requests to the correct domain module
 *  (Dice, Crash, or Mines) and provides game list / risk
 *  profile queries.
 *  ============================================================ */
import { generateSignal as diceSignal } from "./domains/dice.js";
import { getRiskProfile as diceProfile } from "./domains/dice.js";
import { generateSignal as crashSignal } from "./domains/crash.js";
import { getRiskProfile as crashProfile } from "./domains/crash.js";
import { generateSignal as minesSignal } from "./domains/mines.js";
import { getRiskProfile as minesProfile } from "./domains/mines.js";
const GAMES = [
    { type: "DICE", name: "Dice", description: "Fair 6-sided die. Predict which number will appear." },
    { type: "CRASH", name: "Crash", description: "Multiplier crash game. Predict how high it goes before crashing." },
    { type: "MINES", name: "Mines", description: "Grid minefield. Predict survival probability." },
];
/* ─── Public API ─── */
/**
 * Generate a prediction signal for the given game input.
 * Routes to the correct domain module based on gameType.
 */
export function predict(input) {
    switch (input.gameType) {
        case "DICE":
            return diceSignal(input);
        case "CRASH":
            return crashSignal(input);
        case "MINES":
            return minesSignal(input);
        default:
            throw new Error(`Unknown game type: ${input.gameType}`);
    }
}
/**
 * Get the list of supported games with descriptions.
 */
export function getGameList() {
    return GAMES;
}
/**
 * Get the risk profile for a specific game type.
 */
export function getRiskProfile(gameType) {
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
//# sourceMappingURL=index.js.map