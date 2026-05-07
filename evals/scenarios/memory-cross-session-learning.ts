import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const memoryCrossSessionLearning: EvalScenario = {
  id: "MRY-005",
  name: "Memory Cross Session Learning",
  description: "Memory — knowledge persists and compounds across sessions for the same player",
  taskPrompt: "A player returns for a new session. In their previous 3 sessions they had: Session 1: 10 bets, 4 wins, 1 stop_session, 2 tilt events. Session 2: 8 bets, 3 wins, 1 stop_session, 1 tilt event. Session 3: 5 bets, 1 win, 1 stop_session, 3 tilt events. Now in session 4, they want to bet again. Explain: (1) How does cross-session memory recovery work? (2) What profile would the system recover for this player? (3) How should the system adapt its recommendations based on this history? (4) Why is playerId-based recovery important?",
  expectedOutputFields: ["session", "profile", "recover", "cross-session"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must discuss cross-session recovery
    if (!lower.includes("cross-session") && !lower.includes("recover") && !lower.includes("memory")) {
      errors.push("Should discuss cross-session recovery");
    }

    // Must reference player profile
    if (!lower.includes("profile") && !lower.includes("player")) {
      errors.push("Should reference player profile");
    }

    // Must discuss adapting recommendations
    if (!lower.includes("adapt") && !lower.includes("adjust") && !lower.includes("recommend")) {
      errors.push("Should discuss adapting recommendations based on history");
    }

    // Should discuss why playerId-based lookup matters
    if (!lower.includes("playerid") && !lower.includes("player id") && !lower.includes("cross-device")) {
      errors.push("Should discuss playerId-based recovery");
    }

    // Should discuss tilt/stop pattern
    if (!lower.includes("tilt") && !lower.includes("stop")) {
      errors.push("Should discuss tilt or stop session pattern");
    }

    for (const word of ["guaranteed", "certain win", "sure profit"]) {
      if (lower.includes(word)) errors.push(`Contains forbidden: ${word}`);
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
