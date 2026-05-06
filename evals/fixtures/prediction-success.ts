import type { EvalFixture } from "./index.js";

export const predictionSuccessFixtures: EvalFixture[] = [
  {
    id: "PRED-SUCCESS-001",
    taskId: "PRED-001",
    category: "prediction-success",
    input: "Predict the outcome for Gemini game, quick mode",
    expectedOutput: JSON.stringify({
      game: "Gemini",
      prediction: "HIGH",
      confidence: 0.85,
      factors: ["team_form", "home_advantage", "head_to_head"],
      timestamp: "2026-05-06T00:00:00Z",
    }),
    expectedBehavior:
      "Should return structured prediction with game name, prediction, confidence, factors, and timestamp",
    score: 1.0,
    confidence: 0.85,
    actualOutcome: "SUCCESS",
    tags: ["prediction", "success", "structured"],
  },
  {
    id: "PRED-SUCCESS-002",
    taskId: "PRED-002",
    category: "prediction-success",
    input: "Predict the winner between Team A and Team B",
    expectedOutput: JSON.stringify({
      game: "Team A vs Team B",
      prediction: "Team A",
      confidence: 0.72,
      factors: ["recent_performance", "player_injuries"],
      timestamp: "2026-05-06T00:00:00Z",
    }),
    expectedBehavior:
      "Should return prediction with moderate confidence and relevant factors",
    score: 0.85,
    confidence: 0.72,
    actualOutcome: "SUCCESS",
    tags: ["prediction", "success", "matchup"],
  },
  {
    id: "PRED-SUCCESS-003",
    taskId: "PRED-003",
    category: "prediction-success",
    input: "Get game metrics for Gemini",
    expectedOutput: JSON.stringify({
      game: "Gemini",
      metrics: {
        playerCount: 1243,
        avgSessionMinutes: 34,
        rating: 4.2,
      },
    }),
    expectedBehavior:
      "Should return game metrics with player count, session time, and rating",
    score: 0.95,
    confidence: 0.9,
    actualOutcome: "SUCCESS",
    tags: ["prediction", "success", "metrics"],
  },
];
