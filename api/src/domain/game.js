/**
 * VIB AI — Game Domain Types
 *
 * Based on: docs/domain-model.md
 */
/** Pre-registered games that the system knows about */
export const KNOWN_GAMES = [
    { id: "gemini", name: "Gemini", provider: "GEMINI", type: "SLOT", metadata: { volatility: "medium" } },
    { id: "gem-saviour", name: "Gem Saviour", provider: "PG_SOFT", type: "SLOT", metadata: { volatility: "high" } },
    { id: "treasure-bowl", name: "Treasure Bowl", provider: "PG_SOFT", type: "FISHING", metadata: {} },
];
export function findGame(name) {
    const lower = name.toLowerCase();
    return KNOWN_GAMES.find((g) => g.name.toLowerCase() === lower || g.id === lower);
}
export function validateConfidence(confidence) {
    return confidence >= 0.0 && confidence <= 1.0;
}
export function validatePrediction(result) {
    const errors = [];
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
//# sourceMappingURL=game.js.map