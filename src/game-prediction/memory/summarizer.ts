/** ============================================================
 *  Session Summarizer — Generates human-readable summaries
 *  from MemoryContext for the Decision / Debate engines.
 *  ============================================================ */

import type { MemoryContext, PlayerProfile, SessionMemory, SemanticMemory } from "./types.js";

/**
 * Generate a full summary string from MemoryContext.
 */
export function generateMemorySummary(context: MemoryContext): string {
  const parts: string[] = [];

  // Session overview
  const session = context.session;
  const pnl = session.currentBankroll - session.startingBankroll;
  const pnlSign = pnl >= 0 ? "+" : "";
  const winRate = session.totalBets > 0
    ? (session.wins / session.totalBets * 100).toFixed(1)
    : "0.0";

  parts.push(`Session ${session.sessionId.slice(0, 8)} — ${session.totalBets} bets, ${winRate}% win rate, P&L ${pnlSign}${pnl.toFixed(2)}`);

  if (session.currentStreak.count > 0) {
    parts.push(`Current streak: ${session.currentStreak.count} ${session.currentStreak.type} in a row.`);
  }

  // Constraints
  if (context.recommendedConstraints.length > 0) {
    parts.push(`Constraints: ${context.recommendedConstraints.join("; ")}`);
  }

  // Persistent warnings
  if (context.persistentWarnings.length > 0) {
    parts.push(`Warnings: ${context.persistentWarnings.join(" | ")}`);
  }

  // Risk level
  const sem = context.semantic;
  parts.push(`Risk profile: score=${sem.riskScore.toFixed(2)}, escalation=${sem.riskEscalationLevel}, tilt propensity=${(sem.tiltPropensity * 100).toFixed(0)}%`);

  // Strategy
  const topStrategy = getTopStrategy(sem.strategyAffinity);
  if (topStrategy) {
    const reliability = sem.strategyReliability[topStrategy];
    parts.push(`Preferred strategy: ${topStrategy}${reliability != null ? ` (${(reliability * 100).toFixed(0)}% reliability)` : ""}`);
  }

  return parts.join(". ");
}

/**
 * Generate recommended constraints from semantic memory.
 */
export function generateConstraints(
  session: SessionMemory,
  semantic: SemanticMemory,
  profile: PlayerProfile | null,
): string[] {
  const constraints: string[] = [];

  if (semantic.riskEscalationLevel === "critical") {
    constraints.push("STOP_SESSION recommended: risk escalation is critical.");
  } else if (semantic.riskEscalationLevel === "high") {
    constraints.push("Max bet size reduced: risk level is high.");
  }

  if (semantic.tiltPropensity > 0.3) {
    constraints.push("Tilt detection sensitivity increased: history of frequent tilt.");
  }

  if (profile && profile.totalStopSession > 2) {
    constraints.push("Extended cool-down recommended after STOP_SESSION: history of repeated stops.");
  }

  if (session.totalBets > 50 && session.durationMinutes > 60) {
    constraints.push("Fatigue break recommended: high volume in extended session.");
  }

  if (semantic.bankrollDiscipline < 0.3) {
    constraints.push("Strict bet size limits enforced: low bankroll discipline score.");
  }

  return constraints;
}

/**
 * Generate persistent warnings from semantic memory.
 */
export function generatePersistentWarnings(profile: PlayerProfile | null, semantic: SemanticMemory): string[] {
  const warnings = [...semantic.persistentWarnings];

  if (profile) {
    if (profile.totalPredictions > 20 && profile.totalWins < profile.totalLosses * 0.5) {
      warnings.push("Historical win rate is below 33%. Review strategy selection.");
    }
    if (profile.confidenceTrend.length > 5) {
      const recent = profile.confidenceTrend.slice(-3);
      const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
      if (avg > 0.8 && profile.brierScoreTrend.length > 0) {
        const brierAvg = profile.brierScoreTrend.slice(-3).reduce((s, v) => s + v, 0) / 3;
        if (brierAvg > 0.15) {
          warnings.push("Consistently high confidence with poor calibration. Overconfidence likely.");
        }
      }
    }
  }

  return warnings;
}

function getTopStrategy(affinity: Record<string, number>): string | null {
  let top: string | null = null;
  let max = 0;
  for (const [name, count] of Object.entries(affinity)) {
    if (count > max) {
      max = count;
      top = name;
    }
  }
  return top;
}
