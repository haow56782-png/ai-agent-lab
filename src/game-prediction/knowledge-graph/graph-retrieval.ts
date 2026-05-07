/** ============================================================
 *  Graph Retrieval — Produces GraphContext for engine injection.
 *
 *  Runs multiple queries against the graph and assembles a
 *  consolidated GraphContext that can be injected into:
 *    - Decision Engine
 *    - Debate Engine
 *    - Learning Engine
 *    - Behavior Engine
 *  ============================================================ */

import type { GraphStore, GraphContext, GraphQueryResult } from "./types.js";

/**
 * Retrieve a full GraphContext for a player from the graph store.
 * Runs PLAYER_RISK_PATTERNS, STRATEGY_RELIABILITY, and other
 * queries in parallel, then assembles the result.
 */
export async function retrieveGraphContext(
  store: GraphStore,
  playerId: string,
  sessionId?: string,
): Promise<GraphContext> {
  const [riskPatterns, strategyReliability, driftSignals] = await Promise.all([
    store.query({
      type: "PLAYER_RISK_PATTERNS",
      playerId,
      limit: 10,
    }),
    store.query({
      type: "STRATEGY_RELIABILITY",
      playerId,
    }),
    store.query({
      type: "LEARNING_DRIFT_DOWNGRADE",
      playerId,
    }),
  ]);

  // Extract behavior events from the graph
  const repeatedBehaviorEvents = extractBehaviorEvents(
    riskPatterns,
    playerId,
  );

  // Build decision path summary
  const decisionPathSummary = await buildDecisionPathSummary(store, playerId);

  // Generate recommended constraints from graph state
  const recommendedConstraints = generateGraphConstraints(
    riskPatterns,
    strategyReliability,
  );

  // Collect warnings
  const warnings = collectWarnings(riskPatterns, strategyReliability, driftSignals);

  return {
    playerId,
    relatedRiskPatterns: riskPatterns.type === "PLAYER_RISK_PATTERNS" ? riskPatterns.data : [],
    strategyReliability: strategyReliability.type === "STRATEGY_RELIABILITY" ? strategyReliability.data : [],
    repeatedBehaviorEvents,
    confidenceDriftSignals: driftSignals.type === "LEARNING_DRIFT_DOWNGRADE" ? driftSignals.data : [],
    decisionPathSummary,
    recommendedConstraints,
    warnings,
  };
}

/* ─── Helpers ─── */

function extractBehaviorEvents(
  riskPatterns: GraphQueryResult,
  _playerId: string,
): { type: string; count: number; lastSeen: string }[] {
  if (riskPatterns.type !== "PLAYER_RISK_PATTERNS") return [];

  const patternCounts = new Map<string, { count: number; lastSeen: string }>();
  for (const p of riskPatterns.data) {
    const prev = patternCounts.get(p.patternType) ?? { count: 0, lastSeen: "" };
    patternCounts.set(p.patternType, {
      count: prev.count + p.frequency,
      lastSeen: p.lastOccurrence > prev.lastSeen ? p.lastOccurrence : prev.lastSeen,
    });
  }

  return [...patternCounts.entries()].map(([type, data]) => ({
    type,
    count: data.count,
    lastSeen: data.lastSeen,
  }));
}

async function buildDecisionPathSummary(
  store: GraphStore,
  playerId: string,
): Promise<{ totalDecisions: number; totalDowngrades: number; totalStops: number; recentActions: string[] }> {
  const stopPathRaw = await store.query({
    type: "STOP_SESSION_PATH",
    playerId,
  });

  const path = stopPathRaw.type === "STOP_SESSION_PATH" ? stopPathRaw.data : null;
  const totalStops = path?.rootCauses.length ?? 0;
  const totalDowngrades = path?.path.length ?? 0;

  // Count decisions
  const debateQueryRaw = await store.query({
    type: "DEBATE_MOST_OPPOSED",
    playerId,
    limit: 5,
  });

  const debateData = debateQueryRaw.type === "DEBATE_MOST_OPPOSED" ? debateQueryRaw.data : [];
  const totalDecisions = debateData.reduce((s, d) => s + d.oppositionCount, 0) + totalDowngrades;

  return {
    totalDecisions: Math.max(totalDecisions, 1),
    totalDowngrades,
    totalStops,
    recentActions: (path?.path ?? []).slice(0, 5).map((p) => `${p.via} → ${p.to}`),
  };
}

function generateGraphConstraints(
  riskPatterns: GraphQueryResult,
  strategyReliability: GraphQueryResult,
): string[] {
  const constraints: string[] = [];

  if (riskPatterns.type === "PLAYER_RISK_PATTERNS") {
    const highSeverity = riskPatterns.data.filter((p) => p.severity === "critical" || p.severity === "high");
    if (highSeverity.length > 0) {
      constraints.push("Graph-based risk detection: high-severity patterns detected.");
    }
    if (highSeverity.some((p) => p.trend === "increasing")) {
      constraints.push("Graph-based escalation: risk pattern frequency is increasing.");
    }
  }

  if (strategyReliability.type === "STRATEGY_RELIABILITY") {
    const degraded = strategyReliability.data.filter((s) => s.isDegraded);
    if (degraded.length > 0) {
      constraints.push(`Strategy degradation detected: ${degraded.map((s) => s.strategyName).join(", ")}.`);
    }
  }

  return constraints;
}

function collectWarnings(
  riskPatterns: GraphQueryResult,
  strategyReliability: GraphQueryResult,
  driftSignals: GraphQueryResult,
): string[] {
  const warnings: string[] = [];

  if (riskPatterns.type === "PLAYER_RISK_PATTERNS") {
    const critical = riskPatterns.data.filter((p) => p.severity === "critical");
    if (critical.length > 0) {
      warnings.push(`${critical.length} critical risk pattern(s) detected in knowledge graph.`);
    }
  }

  if (strategyReliability.type === "STRATEGY_RELIABILITY") {
    const degraded = strategyReliability.data.filter((s) => s.isDegraded);
    if (degraded.length > 0) {
      for (const s of degraded) {
        warnings.push(`Strategy "${s.strategyName}" is degraded: ${s.degradationReason}`);
      }
    }
  }

  if (driftSignals.type === "LEARNING_DRIFT_DOWNGRADE") {
    const drifting = driftSignals.data.filter((s) => s.driftDirection !== "none");
    if (drifting.length > 0) {
      warnings.push(`${drifting.length} strategy(ies) showing confidence drift.`);
    }
  }

  return warnings;
}
