/** ============================================================
 *  Graph Query Engine — 6 query types over the Knowledge Graph.
 *
 *  Queries:
 *    PLAYER_RISK_PATTERNS  — risk patterns linked to a player
 *    STRATEGY_RELIABILITY  — win rates per strategy from edges
 *    STOP_SESSION_PATH     — traversal leading to stop_session
 *    GAME_BEHAVIOR_RISKS   — behavior events per game
 *    LEARNING_DRIFT_DOWNGRADE — confidence drift → degradation
 *    DEBATE_MOST_OPPOSED   — strategies with most debate opposition
 *  ============================================================ */

import type {
  GraphNode,
  GraphEdge,
  GraphQuery,
  GraphQueryResult,
  RiskPatternResult,
  StrategyReliabilityResult,
  StopSessionPathResult,
  GameBehaviorRiskResult,
  LearningDriftResult,
  DebateOppositionResult,
} from "./types.js";
import type { InMemoryGraphStore } from "./graph-store.js";

export async function executeGraphQuery(
  store: InMemoryGraphStore,
  query: GraphQuery,
): Promise<GraphQueryResult> {
  switch (query.type) {
    case "PLAYER_RISK_PATTERNS":
      return { type: "PLAYER_RISK_PATTERNS", data: await queryPlayerRiskPatterns(store, query) };
    case "STRATEGY_RELIABILITY":
      return { type: "STRATEGY_RELIABILITY", data: await queryStrategyReliability(store, query) };
    case "STOP_SESSION_PATH":
      return { type: "STOP_SESSION_PATH", data: await queryStopSessionPath(store, query) };
    case "GAME_BEHAVIOR_RISKS":
      return { type: "GAME_BEHAVIOR_RISKS", data: await queryGameBehaviorRisks(store, query) };
    case "LEARNING_DRIFT_DOWNGRADE":
      return { type: "LEARNING_DRIFT_DOWNGRADE", data: await queryLearningDriftDowngrade(store, query) };
    case "DEBATE_MOST_OPPOSED":
      return { type: "DEBATE_MOST_OPPOSED", data: await queryDebateMostOpposed(store, query) };
    default:
      return { type: "PLAYER_RISK_PATTERNS", data: [] };
  }
}

/* ─── PLAYER_RISK_PATTERNS ─── */

async function queryPlayerRiskPatterns(
  store: InMemoryGraphStore,
  query: GraphQuery,
): Promise<RiskPatternResult[]> {
  const allNodes = [...store._getAllNodes().values()];
  const patternNodes = allNodes.filter((n) => n.type === "RISK_PATTERN");
  const playerId = query.playerId ?? "";

  const results: RiskPatternResult[] = [];

  for (const node of patternNodes) {
    // Check if this pattern is connected to the player
    if (playerId) {
      const edges = await store.getEdgesForNode(node.id);
      const playerNodeId = `PLAYER::${playerId}`;
      const connectedToPlayer = edges.some(
        (e) => e.sourceId === playerNodeId || e.targetId === playerNodeId,
      );
      if (!connectedToPlayer) continue;
    }

    const props = node.properties;
    const edges = await store.getEdgesForNode(node.id);

    // Count frequency: how many edges point to this pattern
    const frequency = edges.filter((e) => e.type === "CAUSED_WARNING" || e.type === "ESCALATED_RISK").length;

    // Find related strategies through shared edges
    const relatedStrategies = new Set<string>();
    for (const edge of edges) {
      const otherId = edge.sourceId === node.id ? edge.targetId : edge.sourceId;
      if (otherId.startsWith("STRATEGY::")) {
        relatedStrategies.add(otherId.replace("STRATEGY::", ""));
      }
    }

    results.push({
      patternType: String(props.patternType ?? "unknown"),
      severity: String(props.severity ?? "medium"),
      frequency,
      relatedStrategies: [...relatedStrategies],
      lastOccurrence: node.updatedAt,
      trend: frequency > 3 ? "increasing" as const : frequency > 0 ? "stable" as const : "decreasing" as const,
    });
  }

  return results.sort((a, b) => b.frequency - a.frequency).slice(0, query.limit ?? 20);
}

/* ─── STRATEGY_RELIABILITY ─── */

async function queryStrategyReliability(
  store: InMemoryGraphStore,
  query: GraphQuery,
): Promise<StrategyReliabilityResult[]> {
  const allNodes = [...store._getAllNodes().values()];
  const strategyNodes = allNodes.filter((n) => n.type === "STRATEGY");
  const playerId = query.playerId ?? "";
  const results: StrategyReliabilityResult[] = [];

  for (const node of strategyNodes) {
    if (query.strategyName && node.properties.strategyName !== query.strategyName) continue;

    // Check player association
    if (playerId) {
      const edges = await store.getEdgesForNode(node.id);
      const playerNodeId = `PLAYER::${playerId}`;
      if (!edges.some((e) => e.sourceId === playerNodeId || e.targetId === playerNodeId)) continue;
    }

    const edges = await store.getEdgesForNode(node.id);

    // Count uses from USED_STRATEGY edges
    const useEdges = edges.filter((e) => e.type === "USED_STRATEGY");
    const totalUses = useEdges.length;

    // Check for degradation edges
    const degradationEdges = edges.filter((e) => e.type === "DEGRADED_STRATEGY");
    const isDegraded = degradationEdges.length > 0;
    const degradationReason = isDegraded
      ? String(degradationEdges[0]?.properties.reason ?? "Accuracy degradation detected")
      : undefined;

    // Win rate: estimate from edge properties that carry confidence data
    const decisionEdges = edges.filter((e) => e.type === "USED_STRATEGY" && e.properties.winResult !== undefined);
    const wins = decisionEdges.filter((e) => e.properties.winResult === "win").length;
    const winRate = totalUses > 0 ? wins / totalUses : 0;

    results.push({
      strategyName: String(node.properties.strategyName ?? ""),
      totalUses,
      winRate: Math.round(winRate * 100) / 100,
      trend: isDegraded ? "declining" as const : "stable" as const,
      isDegraded,
      degradationReason,
    });
  }

  return results.sort((a, b) => b.totalUses - a.totalUses);
}

/* ─── STOP_SESSION_PATH ─── */

async function queryStopSessionPath(
  store: InMemoryGraphStore,
  query: GraphQuery,
): Promise<StopSessionPathResult> {
  const playerId = query.playerId ?? "";
  const playerNodeId = `PLAYER::${playerId}`;

  // Find all ESCALATED_RISK edges pointing to stop_session patterns
  const allEdges = [...store._getAllEdges().values()];
  const allNodes = [...store._getAllNodes().values()];

  const stopEdges = allEdges.filter((e) => e.type === "ESCALATED_RISK");
  const path: { from: string; to: string; via: string; timestamp: string }[] = [];
  const rootCauses = new Set<string>();

  for (const edge of stopEdges) {
    const targetNode = allNodes.find((n) => n.id === edge.targetId);
    if (!targetNode) continue;

    const patternType = String(targetNode.properties.patternType ?? "");
    if (patternType.includes("stop_session") || patternType.includes("state:STOP_REQUIRED")) {
      // Walk backwards: find what caused this
      const incomingEdges = allEdges.filter((e) => e.targetId === targetNode.id || e.sourceId === edge.sourceId);
      for (const ie of incomingEdges) {
        if (ie.type === "CAUSED_WARNING" || ie.type === "TRIGGERED_BEHAVIOR") {
          const sourceNode = allNodes.find((n) => n.id === ie.sourceId);
          path.push({
            from: sourceNode?.label ?? ie.sourceId,
            to: targetNode.label,
            via: ie.type,
            timestamp: edge.createdAt,
          });
        }
      }

      if (targetNode.properties.patternType) {
        rootCauses.add(String(targetNode.properties.patternType));
      }
    }
  }

  // Also check for behavior patterns leading to stop
  for (const edge of stopEdges) {
    const sourceNode = allNodes.find((n) => n.id === edge.sourceId);
    if (sourceNode) {
      const preEdges = allEdges.filter((e) =>
        (e.targetId === sourceNode.id || e.sourceId === sourceNode.id) &&
        e.type !== "BELONGS_TO_PLAYER",
      );
      for (const pe of preEdges) {
        const otherId = pe.sourceId === sourceNode.id ? pe.targetId : pe.sourceId;
        const otherNode = allNodes.find((n) => n.id === otherId);
        if (otherNode) {
          rootCauses.add(String(otherNode.properties.patternType ?? otherNode.label));
        }
      }
    }
  }

  return {
    path: path.slice(0, query.limit ?? 10),
    rootCauses: [...rootCauses],
    recommendedAction: rootCauses.has("stop_session")
      ? "Extended cool-down period recommended. Review tilt and behavior patterns before next session."
      : "Review risk patterns and consider reducing bet sizes.",
  };
}

/* ─── GAME_BEHAVIOR_RISKS ─── */

async function queryGameBehaviorRisks(
  store: InMemoryGraphStore,
  query: GraphQuery,
): Promise<GameBehaviorRiskResult> {
  const allEdges = [...store._getAllEdges().values()];
  const allNodes = [...store._getAllNodes().values()];
  const gameType = query.gameType ?? "";
  const gameNodeId = `GAME::${gameType}`;

  // Find behavior events connected to sessions that played this game
  const behaviorCounts = new Map<string, number>();
  let riskLevel = "LOW";

  if (gameType && allNodes.some((n) => n.id === gameNodeId)) {
    // Find sessions that played this game
    const playedEdges = allEdges.filter((e) =>
      e.type === "PLAYED_GAME" && e.targetId === gameNodeId,
    );
    const sessionIds = new Set(playedEdges.map((e) => e.sourceId));

    // Find behavior events in those sessions
    for (const sessionId of sessionIds) {
      const sessionEdges = allEdges.filter((e) =>
        e.type === "TRIGGERED_BEHAVIOR" && e.sourceId === sessionId,
      );
      for (const se of sessionEdges) {
        const behType = String(se.properties.eventType ?? "unknown");
        behaviorCounts.set(behType, (behaviorCounts.get(behType) ?? 0) + 1);
      }
    }

    // Determine risk level
    const totalBehaviors = [...behaviorCounts.values()].reduce((s, c) => s + c, 0);
    if (totalBehaviors > 5) riskLevel = "HIGH";
    else if (totalBehaviors > 2) riskLevel = "MEDIUM";
  }

  const mostCommon = [...behaviorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([behavior, count]) => ({ behavior, count }));

  return {
    gameType: gameType || "UNKNOWN",
    mostCommonBehaviors: mostCommon,
    riskLevel,
    recommendation: riskLevel === "HIGH"
      ? "Frequent behavior events detected. Increase monitoring and consider session limits."
      : riskLevel === "MEDIUM"
        ? "Some behavior events detected. Maintain standard monitoring."
        : "No significant behavior risks detected for this game.",
  };
}

/* ─── LEARNING_DRIFT_DOWNGRADE ─── */

async function queryLearningDriftDowngrade(
  store: InMemoryGraphStore,
  query: GraphQuery,
): Promise<LearningDriftResult[]> {
  const allEdges = [...store._getAllEdges().values()];
  const allNodes = [...store._getAllNodes().values()];

  const learningNodes = allNodes.filter((n) => n.type === "LEARNING_SIGNAL");
  const strategyNodes = allNodes.filter((n) => n.type === "STRATEGY");
  const results: LearningDriftResult[] = [];

  for (const stratNode of strategyNodes) {
    if (query.strategyName && stratNode.properties.strategyName !== query.strategyName) continue;

    const strategyName = String(stratNode.properties.strategyName ?? "");
    const stratEdges = await store.getEdgesForNode(stratNode.id);

    // Find degradation edges from learning signals
    const degradationEdges = stratEdges.filter((e) => e.type === "DEGRADED_STRATEGY");
    const downgradeEvents = degradationEdges.map((e) => ({
      action: String(e.properties.reason ?? "degraded"),
      timestamp: e.createdAt,
    }));
    const hasCausedDowngrade = degradationEdges.length > 0;

    // Check confidence signals connected to this strategy
    const signalEdges = allEdges.filter((e) =>
      e.type === "UPDATED_CONFIDENCE" &&
      e.properties.strategyName === strategyName,
    );

    // Determine drift direction from confidence signals
    let driftDirection: "overconfidence" | "underconfidence" | "none" = "none";
    let driftMagnitude = 0;

    for (const edge of signalEdges) {
      const confidence = Number(edge.properties.calibratedConfidence ?? 0.5);
      const brier = Number(edge.properties.brierScore ?? 0);
      if (confidence > 0.8 && brier > 0.15) {
        driftDirection = "overconfidence";
        driftMagnitude = Math.max(driftMagnitude, confidence - brier);
      } else if (confidence < 0.3 && brier > 0.15) {
        driftDirection = "underconfidence";
        driftMagnitude = Math.max(driftMagnitude, 0.3 - confidence);
      }
    }

    if (hasCausedDowngrade || signalEdges.length > 0) {
      results.push({
        strategyName,
        driftDirection,
        driftMagnitude: Math.round(driftMagnitude * 100) / 100,
        hasCausedDowngrade,
        downgradeEvents,
      });
    }
  }

  return results;
}

/* ─── DEBATE_MOST_OPPOSED ─── */

async function queryDebateMostOpposed(
  store: InMemoryGraphStore,
  query: GraphQuery,
): Promise<DebateOppositionResult[]> {
  const allEdges = [...store._getAllEdges().values()];
  const allNodes = [...store._getAllNodes().values()];

  // Find debate outcome nodes
  const debateNodes = allNodes.filter((n) => n.type === "DEBATE_OUTCOME");
  const strategyMap = new Map<string, { oppositionCount: number; totalScore: number; objections: string[] }>();

  for (const debateNode of debateNodes) {
    const edges = await store.getEdgesForNode(debateNode.id);

    // Find related strategy nodes through the player
    for (const edge of edges) {
      if (edge.type === "REVIEWED_BY_DEBATE") {
        // Look for strategies used by this player
        const playerEdges = allEdges.filter((e) =>
          e.type === "USED_STRATEGY" && e.targetId === edge.targetId,
        );
        for (const pe of playerEdges) {
          // Check if debate outcome has opposition data
          const action = String(debateNode.properties.finalAction ?? "");
          const consensus = String(debateNode.properties.consensusLevel ?? "");
          const isOpposed = action === "STOP_SESSION" || action === "SKIP" || consensus === "SPLIT" || consensus === "ARBITER_OVERRIDE";

          const stratName = String(allNodes.find((n) => n.id === pe.targetId)?.properties.strategyName ?? "");
          if (!stratName) continue;

          if (!strategyMap.has(stratName)) {
            strategyMap.set(stratName, { oppositionCount: 0, totalScore: 0, objections: [] });
          }
          const entry = strategyMap.get(stratName)!;
          if (isOpposed) {
            entry.oppositionCount++;
            entry.totalScore += 0.5; // default opposition score
          }
        }
      }
    }
  }

  const results: DebateOppositionResult[] = [...strategyMap.entries()]
    .map(([strategyName, data]) => ({
      strategyName,
      oppositionCount: data.oppositionCount,
      averageOppositionScore: data.oppositionCount > 0
        ? Math.round((data.totalScore / data.oppositionCount) * 100) / 100
        : 0,
      primaryObjections: data.oppositionCount > 0
        ? ["Arbiter override or split consensus detected", "Strategy may need review"]
        : [],
    }))
    .sort((a, b) => b.oppositionCount - a.oppositionCount)
    .slice(0, query.limit ?? 10);

  return results;
}
