/** ============================================================
 *  Graph Builder — Builds a KnowledgeGraph from engine outputs.
 *
 *  Consumes outputs from all 5 engines (Memory, Decision,
 *  Behavior, Learning, Debate, Simulation) and creates typed
 *  nodes and edges representing their relationships.
 *  ============================================================ */

import type {
  GraphNode,
  GraphEdge,
  GraphBuildInput,
  KnowledgeGraph,
  GraphNodeType,
} from "./types.js";
import { InMemoryGraphStore } from "./graph-store.js";

/* ─── Helpers ─── */

function nodeId(type: GraphNodeType, key: string): string {
  return `${type}::${key}`;
}

function edgeId(type: string, src: string, dst: string): string {
  return `${type}::${src}::${dst}::${Date.now()}`;
}

function now(): string {
  return new Date().toISOString();
}

/* ─── Node Builders ─── */

function buildPlayerNode(playerId: string): GraphNode {
  return {
    id: nodeId("PLAYER", playerId),
    type: "PLAYER",
    label: `Player ${playerId}`,
    properties: { playerId },
    createdAt: now(),
    updatedAt: now(),
  };
}

function buildSessionNode(sessionId: string, playerId: string, props: Record<string, unknown> = {}): GraphNode {
  return {
    id: nodeId("SESSION", sessionId),
    type: "SESSION",
    label: `Session ${sessionId.slice(0, 8)}`,
    properties: { sessionId, playerId, ...props },
    createdAt: now(),
    updatedAt: now(),
  };
}

function buildGameNode(gameType: string): GraphNode {
  return {
    id: nodeId("GAME", gameType),
    type: "GAME",
    label: `Game ${gameType}`,
    properties: { gameType },
    createdAt: now(),
    updatedAt: now(),
  };
}

function buildStrategyNode(strategyName: string): GraphNode {
  return {
    id: nodeId("STRATEGY", strategyName),
    type: "STRATEGY",
    label: `Strategy ${strategyName}`,
    properties: { strategyName },
    createdAt: now(),
    updatedAt: now(),
  };
}

function buildRiskPatternNode(
  patternType: string,
  severity: string,
  props: Record<string, unknown> = {},
): GraphNode {
  const key = `${patternType}::${severity}`;
  return {
    id: nodeId("RISK_PATTERN", key),
    type: "RISK_PATTERN",
    label: `Risk: ${patternType} (${severity})`,
    properties: { patternType, severity, ...props },
    createdAt: now(),
    updatedAt: now(),
  };
}

function buildBehaviorEventNode(
  behaviorType: string,
  sessionId: string,
  props: Record<string, unknown> = {},
): GraphNode {
  const key = `${behaviorType}::${sessionId}::${Date.now()}`;
  return {
    id: nodeId("BEHAVIOR_EVENT", key),
    type: "BEHAVIOR_EVENT",
    label: `Behavior: ${behaviorType}`,
    properties: { behaviorType, sessionId, ...props },
    createdAt: now(),
    updatedAt: now(),
  };
}

function buildLearningSignalNode(
  signalType: string,
  props: Record<string, unknown> = {},
): GraphNode {
  const key = `${signalType}::${Date.now()}`;
  return {
    id: nodeId("LEARNING_SIGNAL", key),
    type: "LEARNING_SIGNAL",
    label: `Learning: ${signalType}`,
    properties: { signalType, ...props },
    createdAt: now(),
    updatedAt: now(),
  };
}

function buildDebateOutcomeNode(
  decisionId: string,
  props: Record<string, unknown> = {},
): GraphNode {
  return {
    id: nodeId("DEBATE_OUTCOME", decisionId),
    type: "DEBATE_OUTCOME",
    label: `Debate: ${decisionId.slice(0, 8)}`,
    properties: { decisionId, ...props },
    createdAt: now(),
    updatedAt: now(),
  };
}

function buildSimulationOutcomeNode(
  gameType: string,
  props: Record<string, unknown> = {},
): GraphNode {
  const key = `${gameType}::${Date.now()}`;
  return {
    id: nodeId("SIMULATION_OUTCOME", key),
    type: "SIMULATION_OUTCOME",
    label: `Simulation: ${gameType}`,
    properties: { gameType, ...props },
    createdAt: now(),
    updatedAt: now(),
  };
}

function buildDecisionNode(
  decisionId: string,
  props: Record<string, unknown> = {},
): GraphNode {
  return {
    id: nodeId("DECISION", decisionId),
    type: "DECISION",
    label: `Decision: ${decisionId.slice(0, 8)}`,
    properties: { decisionId, ...props },
    createdAt: now(),
    updatedAt: now(),
  };
}

/* ─── Edge Builders ─── */

function makeEdge(
  type: "PLAYED_GAME" | "USED_STRATEGY" | "PRODUCED_DECISION" | "TRIGGERED_BEHAVIOR" | "CAUSED_WARNING" | "UPDATED_CONFIDENCE" | "DEGRADED_STRATEGY" | "ESCALATED_RISK" | "SUPPORTED_BY_SIMULATION" | "REVIEWED_BY_DEBATE" | "OCCURRED_IN_SESSION" | "BELONGS_TO_PLAYER",
  sourceId: string,
  targetId: string,
  weight: number,
  props: Record<string, unknown> = {},
): GraphEdge {
  return {
    id: edgeId(type, sourceId, targetId),
    sourceId,
    targetId,
    type,
    properties: props,
    weight,
    createdAt: now(),
  };
}

/* ─── Builder ─── */

/**
 * Build a complete KnowledgeGraph from engine outputs.
 */
export async function buildGraph(input: GraphBuildInput): Promise<{
  store: InMemoryGraphStore;
  graph: KnowledgeGraph;
}> {
  const store = new InMemoryGraphStore();
  const warnings: string[] = [];

  const { playerId, sessionId } = input;

  // 1. Player node
  const playerNode = buildPlayerNode(playerId);
  await store.addNode(playerNode);

  // 2. Session node
  const sessionNode = buildSessionNode(sessionId, playerId);
  await store.addNode(sessionNode);
  await store.addEdge(makeEdge(
    "BELONGS_TO_PLAYER", sessionNode.id, playerNode.id, 1.0,
  ));

  // 3. Memory events → sessions, games, strategies, risk patterns
  if (input.memoryEvents && input.memoryEvents.length > 0) {
    const seenGames = new Set<string>();
    const seenStrategies = new Set<string>();

    for (const evt of input.memoryEvents) {
      const event = evt as Record<string, unknown>;
      const eventType = String(event.type ?? "");
      const eventData = event.data as Record<string, unknown> | undefined;

      // Game nodes from events
      const gameType = String(eventData?.gameType ?? "");
      if (gameType && !seenGames.has(gameType)) {
        seenGames.add(gameType);
        const gameNode = buildGameNode(gameType);
        await store.addNode(gameNode);
        await store.addEdge(makeEdge(
          "PLAYED_GAME", sessionNode.id, gameNode.id, 0.8,
          { eventType },
        ));
      }

      // Strategy nodes
      const strategyName = String(eventData?.strategyName ?? "");
      if (strategyName && !seenStrategies.has(strategyName)) {
        seenStrategies.add(strategyName);
        const strategyNode = buildStrategyNode(strategyName);
        await store.addNode(strategyNode);
        await store.addEdge(makeEdge(
          "USED_STRATEGY", sessionNode.id, strategyNode.id, 0.7,
          { eventType },
        ));
        await store.addEdge(makeEdge(
          "BELONGS_TO_PLAYER", strategyNode.id, playerNode.id, 0.6,
        ));
      }

      // Behavior events → TRIGGERED_BEHAVIOR
      if (eventType === "tilt_detected" || eventType === "behavior_intervention") {
        const behNode = buildBehaviorEventNode(eventType, sessionId, {
          severity: eventData?.severity ?? "unknown",
        });
        await store.addNode(behNode);
        await store.addEdge(makeEdge(
          "TRIGGERED_BEHAVIOR", sessionNode.id, behNode.id, 0.9,
          { eventType },
        ));
        await store.addEdge(makeEdge(
          "BELONGS_TO_PLAYER", behNode.id, playerNode.id, 1.0,
        ));

        // Risk pattern from tilt
        if (eventType === "tilt_detected") {
          const pattern = buildRiskPatternNode("tilt", "high", {
            tiltScore: eventData?.tiltScore ?? 0,
          });
          await store.addNode(pattern);
          await store.addEdge(makeEdge(
            "CAUSED_WARNING", behNode.id, pattern.id, 0.8,
          ));
          await store.addEdge(makeEdge(
            "BELONGS_TO_PLAYER", pattern.id, playerNode.id, 0.7,
          ));
        }
      }

      // Stop session → ESCALATED_RISK
      if (eventType === "stop_session") {
        const pattern = buildRiskPatternNode("stop_session", "critical");
        await store.addNode(pattern);
        await store.addEdge(makeEdge(
          "ESCALATED_RISK", sessionNode.id, pattern.id, 1.0,
          { reason: String(eventData?.reason ?? "") },
        ));
        await store.addEdge(makeEdge(
          "BELONGS_TO_PLAYER", pattern.id, playerNode.id, 0.7,
        ));
      }
    }
  }

  // 4. Decision outputs
  if (input.decisionOutputs && input.decisionOutputs.length > 0) {
    for (const dec of input.decisionOutputs) {
      const d = dec as Record<string, unknown>;
      const decisionId = String(d.id ?? `dec-${Date.now()}`);
      const decNode = buildDecisionNode(decisionId, {
        action: d.action,
        strategy: d.strategy,
        confidence: d.confidence,
      });
      await store.addNode(decNode);
      await store.addEdge(makeEdge(
        "PRODUCED_DECISION", sessionNode.id, decNode.id, 0.9,
        { action: String(d.action ?? "") },
      ));
      await store.addEdge(makeEdge(
        "BELONGS_TO_PLAYER", decNode.id, playerNode.id, 1.0,
      ));

      // Strategy link from decision
      if (d.strategy) {
        const stratId = nodeId("STRATEGY", String(d.strategy));
        const existing = await store.getNode(stratId);
        if (existing) {
          await store.addEdge(makeEdge(
            "USED_STRATEGY", decNode.id, stratId, 0.7,
          ));
        }
      }

      // Game link from decision
      if (d.gameType) {
        const gameId = nodeId("GAME", String(d.gameType));
        const existing = await store.getNode(gameId);
        if (existing) {
          await store.addEdge(makeEdge(
            "PLAYED_GAME", decNode.id, gameId, 0.6,
          ));
        }
      }
    }
  }

  // 5. Behavior outputs → risk patterns
  if (input.behaviorOutputs && input.behaviorOutputs.length > 0) {
    for (const beh of input.behaviorOutputs) {
      const b = beh as Record<string, unknown>;
      const patterns = b.detectedPatterns as Record<string, unknown>[] | undefined;

      if (patterns) {
        for (const p of patterns) {
          const patternType = String(p.pattern ?? p.type ?? "unknown");
          const severity = String(p.severity ?? "medium");
          const pattern = buildRiskPatternNode(patternType, severity, {
            description: p.description,
          });
          await store.addNode(pattern);
          await store.addEdge(makeEdge(
            "CAUSED_WARNING", sessionNode.id, pattern.id, 0.8,
            { patternType, severity },
          ));
          await store.addEdge(makeEdge(
            "BELONGS_TO_PLAYER", pattern.id, playerNode.id, 0.7,
          ));
        }
      }

      // State-based risk pattern
      const state = String(b.state ?? "");
      if (state && state !== "NORMAL") {
        const pattern = buildRiskPatternNode(`state:${state}`, "high");
        await store.addNode(pattern);
        await store.addEdge(makeEdge(
          "ESCALATED_RISK", sessionNode.id, pattern.id, 0.9,
          { state },
        ));
        await store.addEdge(makeEdge(
          "BELONGS_TO_PLAYER", pattern.id, playerNode.id, 0.7,
        ));
      }
    }
  }

  // 6. Learning outputs → calibration signals, strategy degradation
  if (input.learningOutputs && input.learningOutputs.length > 0) {
    for (const lrn of input.learningOutputs) {
      const l = lrn as Record<string, unknown>;
      const strategyName = String(l.strategy ?? "");
      const calibratedConfidence = Number(l.calibratedConfidence ?? 0);
      const brierScore = Number(l.brierScore ?? 0);
      const accuracy = Number(l.rollingAccuracy ?? 0);

      const signal = buildLearningSignalNode("calibration", {
        calibratedConfidence,
        brierScore,
        rollingAccuracy: accuracy,
        shift: l.calibrationShift,
      });
      await store.addNode(signal);
      await store.addEdge(makeEdge(
        "UPDATED_CONFIDENCE", sessionNode.id, signal.id, 0.7,
        { calibratedConfidence, brierScore },
      ));

      // Degradation detection
      if (accuracy < 0.5 && strategyName) {
        const stratId = nodeId("STRATEGY", strategyName);
        const existing = await store.getNode(stratId);
        if (existing) {
          await store.addEdge(makeEdge(
            "DEGRADED_STRATEGY", signal.id, stratId, 0.9,
            { reason: `Accuracy ${accuracy} below 0.5 threshold` },
          ));
        }
      }
    }
  }

  // 7. Debate outputs
  if (input.debateOutputs && input.debateOutputs.length > 0) {
    for (const db of input.debateOutputs) {
      const d = db as Record<string, unknown>;
      const decisionId = String(d.decisionId ?? `debate-${Date.now()}`);
      const node = buildDebateOutcomeNode(decisionId, {
        consensusLevel: d.consensusLevel,
        finalAction: d.finalAction,
        summary: d.summary,
      });
      await store.addNode(node);
      await store.addEdge(makeEdge(
        "REVIEWED_BY_DEBATE", node.id, playerNode.id, 0.9,
        { consensus: String(d.consensusLevel ?? "") },
      ));

      // Link to risk pattern if overridden
      if (String(d.consensusLevel ?? "") === "ARBITER_OVERRIDE") {
        const pattern = buildRiskPatternNode("debate_override", "high");
        await store.addNode(pattern);
        await store.addEdge(makeEdge(
          "CAUSED_WARNING", node.id, pattern.id, 0.8,
        ));
        await store.addEdge(makeEdge(
          "BELONGS_TO_PLAYER", pattern.id, playerNode.id, 0.7,
        ));
      }
    }
  }

  // 8. Simulation outputs
  if (input.simulationOutputs && input.simulationOutputs.length > 0) {
    for (const sim of input.simulationOutputs) {
      const s = sim as Record<string, unknown>;
      const gameType = String(s.gameType ?? "UNKNOWN");
      const node = buildSimulationOutcomeNode(gameType, {
        iterations: s.iterations,
        expectedValue: s.expectedValue,
        ruinProbability: s.ruinProbability,
      });
      await store.addNode(node);
      await store.addEdge(makeEdge(
        "SUPPORTED_BY_SIMULATION", node.id, playerNode.id, 0.7,
        { gameType },
      ));
    }
  }

  // Build metadata
  const graph = await store.exportGraph();
  graph.warnings = warnings;

  // Fill source summary
  graph.metadata.sourceSummary = {
    memoryEvents: input.memoryEvents?.length ?? 0,
    decisionOutputs: input.decisionOutputs?.length ?? 0,
    behaviorOutputs: input.behaviorOutputs?.length ?? 0,
    learningOutputs: input.learningOutputs?.length ?? 0,
    debateOutputs: input.debateOutputs?.length ?? 0,
    simulationOutputs: input.simulationOutputs?.length ?? 0,
  };

  return { store, graph };
}
