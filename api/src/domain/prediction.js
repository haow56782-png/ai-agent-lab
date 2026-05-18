/**
 * VIB AI — Prediction Service
 *
 * Domain service for game prediction. Currently uses pattern-based
 * heuristics as baseline; will integrate with DeepSeek model inference
 * in Milestone 2.
 */
import { findGame, validatePrediction } from "./game.js";
/** Possible prediction outcomes (domain-specific) */
const OUTCOMES = ["HIGH_PROBABILITY", "LOW_PROBABILITY", "TREND_UP", "TREND_DOWN", "NEUTRAL"];
/**
 * Run prediction for a given game.
 *
 * Currently uses a placeholder heuristic. Production will delegate
 * to DeepSeek model inference via the LLM client.
 */
export async function predict(input) {
    const game = findGame(input.game.name);
    if (!game) {
        return {
            game: input.game.name,
            prediction: "UNKNOWN_GAME",
            confidence: 0.0,
            factors: ["game_not_found_in_registry"],
            mode: input.mode,
            timestamp: new Date().toISOString(),
        };
    }
    // Placeholder heuristic: random-seeded prediction based on game ID
    const seed = game.id.length + Object.keys(game.metadata).length;
    const outcomeIndex = seed % OUTCOMES.length;
    const confidence = 0.3 + (seed % 50) / 100; // 0.30–0.79
    const result = {
        game: game.name,
        prediction: OUTCOMES[outcomeIndex],
        confidence: Math.round(confidence * 100) / 100,
        factors: [
            `provider: ${game.provider}`,
            `type: ${game.type}`,
            `volatility: ${game.metadata.volatility ?? "unknown"}`,
        ],
        mode: input.mode,
        timestamp: new Date().toISOString(),
    };
    // Validate before returning
    const errors = validatePrediction(result);
    if (errors.length > 0)
        throw new Error(`Invalid prediction: ${errors.join("; ")}`);
    return result;
}
//# sourceMappingURL=prediction.js.map