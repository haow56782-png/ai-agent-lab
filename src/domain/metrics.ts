/**
 * VIB AI — Metrics Service
 *
 * Aggregates game runtime metrics. Currently returns baseline values;
 * will connect to real data pipeline in Milestone 2.
 */

import { findGame, type GameMetrics, type Timeframe } from "./game.js";

export async function getMetrics(gameName: string, timeframe: Timeframe): Promise<GameMetrics> {
  const game = findGame(gameName);

  if (!game) {
    return {
      game: gameName,
      timeframe,
      activeUsers: 0,
      totalPredictions: 0,
      avgAccuracy: 0,
      status: "DATA_PENDING",
    };
  }

  // Placeholder: seed-based values
  const seed = game.id.length;
  return {
    game: game.name,
    timeframe,
    activeUsers: Math.max(10, seed * 150 + Math.round(Math.random() * 100)),
    totalPredictions: Math.max(50, seed * 500 + Math.round(Math.random() * 1000)),
    avgAccuracy: Math.round((0.4 + (seed % 40) / 100) * 100) / 100,
    status: "ACTIVE",
  };
}
