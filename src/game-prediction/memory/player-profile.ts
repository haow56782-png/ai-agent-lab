/** ============================================================
 *  Player Profile — Builds and updates PlayerProfile from
 *  stored MemoryEvents.  Generates long-term risk scores,
 *  bankroll discipline, strategy affinity, and confidence
 *  trends.  Cross-session persistence keyed by playerId.
 *  ============================================================ */

import type { MemoryEvent, PlayerProfile } from "./types.js";
import type { RiskPreference } from "../decision-engine/types.js";
import type { BehaviorState } from "../behavior/types.js";

/**
 * Build a fresh PlayerProfile from scratch using stored events.
 * Deterministic: same events → same profile.
 */
export function buildProfile(
  playerId: string,
  events: MemoryEvent[],
  existingProfile?: PlayerProfile | null,
): PlayerProfile {
  const predictionEvents = events.filter((e) => e.type === "prediction_result");
  const tiltEvents = events.filter((e) => e.type === "tilt_detected");
  const stopEvents = events.filter((e) => e.type === "stop_session");
  const interventionEvents = events.filter((e) => e.type === "behavior_intervention");
  const calibrationEvents = events.filter((e) => e.type === "calibration_update");

  // Sessions: count unique sessionIds
  const sessionIds = new Set(events.map((e) => e.sessionId));
  // Exclude the current session if it's the only one
  const totalSessions = sessionIds.size;

  // Win/loss from predictions
  const wins = predictionEvents.filter((e) => e.data.result === "win").length;
  const losses = predictionEvents.filter((e) => e.data.result === "loss").length;
  const totalPredictions = predictionEvents.length;

  // Strategy affinity
  const strategyAffinity: Record<string, number> = {};
  for (const e of predictionEvents) {
    const s = e.data.strategyName as string | undefined;
    if (s) strategyAffinity[s] = (strategyAffinity[s] ?? 0) + 1;
  }

  // Strategy reliability
  const strategyReliability: Record<string, number> = {};
  for (const e of predictionEvents) {
    const s = e.data.strategyName as string | undefined;
    const result = e.data.result as string | undefined;
    if (s && result) {
      if (!strategyReliability[s]) strategyReliability[s] = 0;
      const prevCount = strategyAffinity[s] ?? 1;
      const prevReliability = strategyReliability[s];
      strategyReliability[s] = prevReliability + (result === "win" ? 1 / prevCount : 0);
    }
  }
  // Normalize reliability
  for (const s of Object.keys(strategyReliability)) {
    const count = strategyAffinity[s] ?? 1;
    strategyReliability[s] = Math.round((strategyReliability[s] / count) * 10000) / 10000;
  }

  // Confidence trend from calibration events
  const confidenceTrend: number[] = [];
  for (const e of calibrationEvents) {
    const c = e.data.calibratedConfidence as number | undefined;
    if (c != null) confidenceTrend.push(c);
  }

  // Brier score trend
  const brierScoreTrend: number[] = [];
  for (const e of calibrationEvents) {
    const b = e.data.brierScore as number | undefined;
    if (b != null) brierScoreTrend.push(b);
  }

  // Rolling accuracy trend
  const rollingAccuracyTrend: number[] = [];
  for (const e of calibrationEvents) {
    const a = e.data.rollingAccuracy as number | undefined;
    if (a != null) rollingAccuracyTrend.push(a);
  }

  // Behavior state history
  const behaviorStateHistory: BehaviorState[] = events
    .filter((e) => e.type === "behavior_intervention")
    .map((e) => (e.data.behaviorState as BehaviorState))
    .filter((s): s is BehaviorState => s != null);

  // Bankroll discipline score: 0-1, higher = better
  // Factors: tilt frequency, stop session compliance, intervention adherence
  const bankrollDisciplineScore = computeBankrollDiscipline(tiltEvents.length, stopEvents.length, interventionEvents.length, totalPredictions);

  // Tilt frequency (per session)
  const tiltFrequency = totalSessions > 0 ? tiltEvents.length / totalSessions : 0;

  return {
    playerId,
    userId: existingProfile?.userId,
    accountId: existingProfile?.accountId,
    defaultRiskPreference: existingProfile?.defaultRiskPreference ?? "balanced",
    totalSessions,
    totalPredictions,
    totalWins: wins,
    totalLosses: losses,
    totalStopSession: stopEvents.length,
    tiltCount: tiltEvents.length,
    tiltFrequency: Math.round(tiltFrequency * 100) / 100,
    bankrollDisciplineScore: Math.round(bankrollDisciplineScore * 100) / 100,
    strategyAffinity,
    strategyReliability,
    confidenceTrend: confidenceTrend.slice(-20),
    brierScoreTrend: brierScoreTrend.slice(-20),
    rollingAccuracyTrend: rollingAccuracyTrend.slice(-20),
    behaviorStateHistory: behaviorStateHistory.slice(-50),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Compute bankroll discipline score from behavioral signals.
 */
function computeBankrollDiscipline(
  tiltCount: number,
  stopSessionCount: number,
  interventionCount: number,
  totalPredictions: number,
): number {
  let score = 1.0;

  // Penalize: each tilt event reduces score
  if (tiltCount > 0) {
    score -= Math.min(0.3, tiltCount * 0.1);
  }

  // Penalize: each STOP_SESSION needed
  if (stopSessionCount > 0) {
    score -= Math.min(0.2, stopSessionCount * 0.05);
  }

  // Reward: interventions indicate awareness (paradoxical — means system is working)
  if (interventionCount > 0 && totalPredictions > 0) {
    score += Math.min(0.1, interventionCount / totalPredictions * 0.1);
  }

  // Scale: if very few predictions, be conservative
  if (totalPredictions < 5) {
    score = Math.min(score, 0.5);
  }

  return Math.max(0.05, Math.min(1.0, score));
}

/**
 * Get or create a profile, merging with stored events.
 */
export async function getOrCreateProfile(
  playerId: string,
  events: MemoryEvent[],
  existingProfile: PlayerProfile | null,
): Promise<PlayerProfile> {
  if (existingProfile) {
    // Rebuild from events but preserve non-event metadata
    const rebuilt = buildProfile(playerId, events, existingProfile);
    return {
      ...rebuilt,
      userId: existingProfile.userId,
      accountId: existingProfile.accountId,
      defaultRiskPreference: existingProfile.defaultRiskPreference,
    };
  }
  return buildProfile(playerId, events);
}
