/** ============================================================
 *  Session Memory — Current session state derived from
 *  MemoryEvents belonging to the active sessionId.
 *  ============================================================ */

import type { MemoryEvent, SessionMemory } from "./types.js";

/**
 * Build current session memory from events for a given sessionId.
 */
export function buildSessionMemory(
  sessionId: string,
  playerId: string,
  events: MemoryEvent[],
  currentBankroll: number,
  startingBankroll: number,
): SessionMemory {
  const sessionEvents = events.filter((e) => e.sessionId === sessionId);
  const predictionResults = sessionEvents.filter((e) => e.type === "prediction_result");
  const interventionEvents = sessionEvents.filter((e) => e.type === "behavior_intervention");
  const startEvent = sessionEvents.find((e) => e.type === "session_start");

  const totalBets = predictionResults.length;
  const wins = predictionResults.filter((e) => e.data.result === "win").length;
  const losses = predictionResults.filter((e) => e.data.result === "loss").length;

  const recentResults: Array<"win" | "loss"> = predictionResults
    .slice(-20)
    .map((e) => e.data.result as "win" | "loss");

  // Find active strategy from most recent prediction
  const sortedPredictions = [...predictionResults].sort(
    (a, b) => b.timestamp.localeCompare(a.timestamp),
  );
  const activeStrategy = sortedPredictions.length > 0
    ? (sortedPredictions[0].data.strategyName as string) ?? "unknown"
    : "unknown";

  // Current streak
  let streakType: "win" | "loss" = "win";
  let streakCount = 0;
  for (let i = recentResults.length - 1; i >= 0; i--) {
    if (i === recentResults.length - 1) streakType = recentResults[i];
    if (recentResults[i] === streakType) streakCount++;
    else break;
  }

  // Warnings from interventions
  const sessionWarnings: string[] = [];
  for (const e of interventionEvents) {
    const ws = e.data.warnings as string[] | undefined;
    if (ws) sessionWarnings.push(...ws);
  }

  // Duration
  let durationMinutes = 0;
  if (startEvent) {
    const startTime = new Date(startEvent.timestamp).getTime();
    const now = new Date().getTime();
    durationMinutes = Math.round((now - startTime) / 60000);
  }

  return {
    sessionId,
    playerId,
    startTime: startEvent?.timestamp ?? new Date().toISOString(),
    currentBankroll,
    startingBankroll,
    totalBets,
    wins,
    losses,
    recentResults,
    activeStrategy,
    currentStreak: { type: streakType, count: streakCount },
    sessionWarnings: [...new Set(sessionWarnings)],
    interventions: interventionEvents.length,
    durationMinutes,
  };
}
