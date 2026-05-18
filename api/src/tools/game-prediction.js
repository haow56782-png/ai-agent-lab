import { registerTool } from "./index.js";
import { predict } from "../domain/prediction.js";
import { getMetrics } from "../domain/metrics.js";
import { findGame } from "../domain/game.js";
import { predict as gamePredict } from "../game-prediction/index.js";
import { decide } from "../game-prediction/decision-engine/index.js";
import { toSignalOutputContract } from "./signal-output-adapter.js";
/**
 * Safe trim helper — returns empty string for undefined/null/non-string input.
 */
function safeTrim(value) {
    return typeof value === "string" ? value.trim() : "";
}
/**
 * Detect the game type from a free-form game name string.
 * Returns the GameInput type and any extracted parameters.
 */
function detectGameInput(game, args) {
    const lower = safeTrim(game).toLowerCase();
    if (!lower)
        return null;
    // Dice detection
    if (/dice|die|d6|6-sided/i.test(lower)) {
        const targetNumber = args.targetNumber ?? 4;
        const history = args.history;
        return { gameType: "DICE", targetNumber, history };
    }
    // Crash detection
    if (/crash|multiplier/i.test(lower)) {
        const targetMultiplier = args.targetMultiplier ?? 2.0;
        const previousCrashPoints = args.previousCrashPoints;
        return { gameType: "CRASH", targetMultiplier, previousCrashPoints };
    }
    // Mines detection
    if (/mine|grid|square/i.test(lower)) {
        const minesCount = args.minesCount ?? 5;
        const picksCount = args.picksCount ?? 2;
        const gridSize = args.gridSize ?? 5;
        return { gameType: "MINES", gridSize, minesCount, picksCount };
    }
    return null;
}
registerTool({
    name: "predict_game_outcome",
    description: "Predict game outcome using domain-specific probability models. Supports Dice (1-6), Crash (multiplier), Mines (grid), and provider-based games.",
    parameters: {
        type: "object",
        properties: {
            game: { type: "string", description: "Game name, type, or identifier (e.g. 'dice', 'crash', 'mines', 'Gemini')" },
            mode: {
                type: "string",
                enum: ["quick", "detailed"],
                description: "Prediction mode",
            },
            /* Game-specific optional parameters */
            targetNumber: {
                type: "number",
                description: "Dice: target number 1-6",
            },
            history: {
                type: "array",
                items: { type: "number" },
                description: "Dice: past roll outcomes for pattern analysis",
            },
            targetMultiplier: {
                type: "number",
                description: "Crash: target multiplier (>= 1.0, e.g. 2.0 for 2x)",
            },
            previousCrashPoints: {
                type: "array",
                items: { type: "number" },
                description: "Crash: past crash point values",
            },
            minesCount: {
                type: "number",
                description: "Mines: number of mines on the grid (1-24)",
            },
            picksCount: {
                type: "number",
                description: "Mines: number of planned picks",
            },
            gridSize: {
                type: "number",
                description: "Mines: grid dimension (default 5 for 5x5)",
            },
        },
        required: ["game"],
    },
}, async (args) => {
    const gameName = safeTrim(args.game);
    const modeRaw = safeTrim(args.mode);
    const mode = (modeRaw || "quick").toUpperCase();
    if (!gameName) {
        return JSON.stringify({
            error: "Unknown game name",
            suggestion: "Try: dice, crash, mines, Gemini, Gem Saviour, Treasure Bowl",
        }, null, 2);
    }
    // Try to detect new game types (dice, crash, mines)
    const gameInput = detectGameInput(gameName, args);
    if (gameInput) {
        try {
            const signal = gamePredict(gameInput);
            const contract = toSignalOutputContract({ type: "domain_signal", data: signal }, "predict_game_outcome");
            return JSON.stringify(contract, null, 2);
        }
        catch (err) {
            return JSON.stringify({
                error: `Game prediction error: ${err instanceof Error ? err.message : String(err)}`,
            }, null, 2);
        }
    }
    // Fall back to legacy domain for provider-based games
    const game = findGame(gameName);
    if (!game) {
        return JSON.stringify({
            error: `Unknown game: "${gameName}"`,
            suggestion: "Try: dice, crash, mines, Gemini, Gem Saviour, Treasure Bowl",
        }, null, 2);
    }
    const result = await predict({ game, mode });
    const contract = toSignalOutputContract({ type: "prediction_result", data: result }, "predict_game_outcome");
    return JSON.stringify(contract, null, 2);
});
registerTool({
    name: "get_game_metrics",
    description: "Get runtime metrics for a game (active users, predictions, accuracy)",
    parameters: {
        type: "object",
        properties: {
            game: { type: "string", description: "Game name" },
            timeframe: {
                type: "string",
                enum: ["24h", "7d", "30d"],
                description: "Aggregation timeframe",
            },
        },
        required: ["game"],
    },
}, async (args) => {
    const gameName = safeTrim(args.game);
    const timeframeRaw = safeTrim(args.timeframe);
    const timeframe = (timeframeRaw || "24h").toUpperCase();
    if (!gameName) {
        return JSON.stringify({ error: "Game name is required" }, null, 2);
    }
    const result = await getMetrics(gameName, timeframe);
    const contract = toSignalOutputContract({ type: "game_metrics", data: result }, "get_game_metrics");
    return JSON.stringify(contract, null, 2);
});
/* ─── Decision Engine Tool ─── */
registerTool({
    name: "get_game_decision",
    description: "Get a strategic game decision combining domain probability with bankroll, risk preference, and session limits. Returns PLAY/SKIP/REDUCE_SIZE/STOP_SESSION with explanation.",
    parameters: {
        type: "object",
        properties: {
            game: { type: "string", description: "Game type: dice, crash, or mines" },
            bankroll: { type: "number", description: "Total bankroll amount" },
            betSize: { type: "number", description: "Desired bet size" },
            riskPreference: {
                type: "string",
                enum: ["conservative", "balanced", "aggressive"],
                description: "Risk tolerance level",
            },
            sessionGoal: { type: "string", description: "Optional session goal (e.g. 'double up', 'recover losses')" },
            maxLoss: { type: "number", description: "Maximum acceptable loss for the session" },
            recentResults: {
                type: "array",
                items: { type: "string", enum: ["win", "loss"] },
                description: "Recent outcomes for streak analysis",
            },
            /* Game params (forwarded to domain signal generator) */
            targetNumber: { type: "number", description: "Dice: target 1-6" },
            targetMultiplier: { type: "number", description: "Crash: target multiplier" },
            minesCount: { type: "number", description: "Mines: number of mines" },
            picksCount: { type: "number", description: "Mines: planned picks" },
            gridSize: { type: "number", description: "Mines: grid dimension" },
        },
        required: ["game", "bankroll", "betSize", "riskPreference"],
    },
}, async (args) => {
    const gameName = safeTrim(args.game);
    const gameInput = detectGameInput(gameName, args);
    if (!gameInput) {
        return JSON.stringify({ error: `Unknown game: "${gameName}". Must be dice, crash, or mines.` }, null, 2);
    }
    try {
        const domainSignal = gamePredict(gameInput);
        const decision = decide({
            gameType: gameInput.gameType,
            bankroll: args.bankroll ?? 100,
            betSize: args.betSize ?? 10,
            riskPreference: args.riskPreference ?? "balanced",
            sessionGoal: args.sessionGoal,
            maxLoss: args.maxLoss,
            recentResults: args.recentResults,
            domainSignal,
        });
        const contract = toSignalOutputContract({ type: "decision_output", data: decision }, "get_game_decision");
        return JSON.stringify(contract, null, 2);
    }
    catch (err) {
        return JSON.stringify({
            error: `Decision error: ${err instanceof Error ? err.message : String(err)}`,
        }, null, 2);
    }
});
//# sourceMappingURL=game-prediction.js.map