import { registerTool } from "./index.js";
import { predict } from "../domain/prediction.js";
import { getMetrics } from "../domain/metrics.js";
import type { PredictionMode, Timeframe } from "../domain/game.js";
import { findGame } from "../domain/game.js";

registerTool(
  {
    name: "predict_game_outcome",
    description: "Predict game outcome using historical patterns and current context",
    parameters: {
      type: "object",
      properties: {
        game: { type: "string", description: "Game name or identifier" },
        mode: {
          type: "string",
          enum: ["quick", "detailed"],
          description: "Prediction mode",
        },
      },
      required: ["game"],
    },
  },
  async (args) => {
    const gameName = args.game as string;
    const mode = ((args.mode as string) ?? "quick").toUpperCase() as PredictionMode;

    if (!gameName.trim()) {
      return JSON.stringify({ error: "Game name is required", suggestion: "Try: Gemini, Gem Saviour, Treasure Bowl" }, null, 2);
    }

    const game = findGame(gameName);
    if (!game) {
      return JSON.stringify({
        error: `Unknown game: "${gameName}"`,
        suggestion: "Known games: Gemini, Gem Saviour, Treasure Bowl",
      }, null, 2);
    }

    const result = await predict({ game, mode });
    return JSON.stringify(result, null, 2);
  },
);

registerTool(
  {
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
  },
  async (args) => {
    const gameName = args.game as string;
    const timeframe = ((args.timeframe as string) ?? "24h").toUpperCase() as Timeframe;

    if (!gameName.trim()) {
      return JSON.stringify({ error: "Game name is required" }, null, 2);
    }

    const result = await getMetrics(gameName, timeframe);
    return JSON.stringify(result, null, 2);
  },
);
