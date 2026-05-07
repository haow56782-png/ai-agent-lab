import { describe, it, expect } from "vitest";
import { InMemoryGraphStore } from "../../src/game-prediction/knowledge-graph/graph-store.js";
import { buildGraph } from "../../src/game-prediction/knowledge-graph/graph-builder.js";
import { executeGraphQuery } from "../../src/game-prediction/knowledge-graph/graph-query.js";
import { retrieveGraphContext } from "../../src/game-prediction/knowledge-graph/graph-retrieval.js";
import { JSONGraphSerializer } from "../../src/game-prediction/knowledge-graph/graph-serializer.js";
import type {
  GraphNode,
  GraphEdge,
  GraphBuildInput,
  GraphQuery,
  KnowledgeGraph,
} from "../../src/game-prediction/knowledge-graph/types.js";

/* ─── Helpers ─── */

function makeNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: `NODE::${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: "PLAYER",
    label: "Test Node",
    properties: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeEdge(overrides: Partial<GraphEdge> = {}): GraphEdge {
  return {
    id: `EDGE::${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
    sourceId: "src",
    targetId: "tgt",
    type: "BELONGS_TO_PLAYER",
    properties: {},
    weight: 0.5,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function buildDefaultInput(overrides: Partial<GraphBuildInput> = {}): GraphBuildInput {
  return {
    playerId: "test-player-1",
    sessionId: "test-session-1",
    memoryEvents: [
      { type: "prediction_result", data: { gameType: "DICE", strategyName: "s1", result: "win" } },
      { type: "prediction_result", data: { gameType: "DICE", strategyName: "s1", result: "loss" } },
      { type: "tilt_detected", data: { tiltScore: 0.7, severity: "high" } },
      { type: "stop_session", data: { reason: "Risk limit reached" } },
    ],
    decisionOutputs: [
      { id: "dec-1", action: "PLAY", strategy: "s1", confidence: 0.85, gameType: "DICE" },
    ],
    behaviorOutputs: [
      {
        state: "TILT",
        detectedPatterns: [
          { pattern: "loss_chasing", severity: "high", description: "Bet size increasing after losses" },
        ],
      },
    ],
    learningOutputs: [
      { strategy: "s1", calibratedConfidence: 0.6, brierScore: 0.12, rollingAccuracy: 0.55 },
    ],
    debateOutputs: [
      { decisionId: "deb-1", consensusLevel: "SPLIT", finalAction: "REDUCE_SIZE", summary: "Mixed opinions" },
    ],
    simulationOutputs: [
      { gameType: "DICE", iterations: 1000, expectedValue: 0.97, ruinProbability: 0.02 },
    ],
    ...overrides,
  };
}

/* ════════════════════════════════════════════════════════════
   Node / Edge Creation
   ════════════════════════════════════════════════════════════ */

describe("Node / Edge creation", () => {
  it("creates all node types from build", async () => {
    const { graph } = await buildGraph(buildDefaultInput());
    const types = [...new Set(graph.nodes.map((n) => n.type))];
    expect(types).toContain("PLAYER");
    expect(types).toContain("SESSION");
    expect(types).toContain("GAME");
    expect(types).toContain("STRATEGY");
    expect(types).toContain("RISK_PATTERN");
    expect(types).toContain("BEHAVIOR_EVENT");
    expect(types).toContain("LEARNING_SIGNAL");
    expect(types).toContain("DEBATE_OUTCOME");
    expect(types).toContain("SIMULATION_OUTCOME");
    expect(types).toContain("DECISION");
    expect(graph.nodes.length).toBeGreaterThan(0);
  });

  it("creates all edge types from build", async () => {
    const { graph } = await buildGraph(buildDefaultInput());
    const edgeTypes = [...new Set(graph.edges.map((e) => e.type))];
    expect(edgeTypes).toContain("BELONGS_TO_PLAYER");
    expect(edgeTypes).toContain("PLAYED_GAME");
    expect(edgeTypes).toContain("USED_STRATEGY");
    expect(edgeTypes).toContain("PRODUCED_DECISION");
    expect(edgeTypes).toContain("TRIGGERED_BEHAVIOR");
    expect(edgeTypes).toContain("CAUSED_WARNING");
    expect(edgeTypes).toContain("ESCALATED_RISK");
    expect(edgeTypes).toContain("UPDATED_CONFIDENCE");
    expect(edgeTypes).toContain("REVIEWED_BY_DEBATE");
    expect(edgeTypes).toContain("SUPPORTED_BY_SIMULATION");
    expect(graph.edges.length).toBeGreaterThan(0);
  });

  it("direct addNode / addEdge works", async () => {
    const store = new InMemoryGraphStore();
    const node = makeNode({ id: "direct-node", type: "PLAYER", label: "Direct" });
    await store.addNode(node);
    expect(await store.getNode("direct-node")).not.toBeNull();

    const edge = makeEdge({ id: "direct-edge", sourceId: "direct-node", targetId: "direct-node" });
    await store.addEdge(edge);
    const edges = await store.getEdgesForNode("direct-node");
    expect(edges).toHaveLength(1);
  });
});

/* ════════════════════════════════════════════════════════════
   Duplicate Node Merge
   ════════════════════════════════════════════════════════════ */

describe("Duplicate node merge", () => {
  it("merges properties on duplicate node id", async () => {
    const store = new InMemoryGraphStore();
    await store.addNode(makeNode({
      id: "merge-node", type: "PLAYER",
      properties: { a: 1 },
      label: "Original",
    }));
    await store.addNode(makeNode({
      id: "merge-node", type: "PLAYER",
      properties: { b: 2 },
      label: "Merged",
    }));

    const node = await store.getNode("merge-node");
    expect(node).not.toBeNull();
    expect(node!.properties).toMatchObject({ a: 1, b: 2 });
    expect(node!.updatedAt).toBeTruthy();
  });

  it("merges properties on duplicate edge id", async () => {
    const store = new InMemoryGraphStore();
    await store.addNode(makeNode({ id: "a", type: "PLAYER" }));
    await store.addNode(makeNode({ id: "b", type: "SESSION" }));
    await store.addEdge(makeEdge({
      id: "dup-edge", sourceId: "a", targetId: "b", type: "BELONGS_TO_PLAYER",
      properties: { first: true },
    }));
    await store.addEdge(makeEdge({
      id: "dup-edge", sourceId: "a", targetId: "b", type: "BELONGS_TO_PLAYER",
      properties: { second: true },
    }));

    const edges = await store.getEdgesForNode("a");
    expect(edges).toHaveLength(1);
    expect(edges[0].properties).toMatchObject({ first: true, second: true });
  });
});

/* ════════════════════════════════════════════════════════════
   Edge Relationship Correctness
   ════════════════════════════════════════════════════════════ */

describe("Edge relationship correctness", () => {
  it("edges connect valid source and target nodes", async () => {
    const { store, graph } = await buildGraph(buildDefaultInput());
    const nodeIds = new Set(graph.nodes.map((n) => n.id));

    for (const edge of graph.edges) {
      expect(nodeIds.has(edge.sourceId)).toBe(true);
      expect(nodeIds.has(edge.targetId)).toBe(true);
    }
  });

  it("adjacency index returns correct edges", async () => {
    const store = new InMemoryGraphStore();
    const p = makeNode({ id: "p1", type: "PLAYER" });
    const s = makeNode({ id: "s1", type: "SESSION" });
    await store.addNode(p);
    await store.addNode(s);
    await store.addEdge(makeEdge({ id: "e1", sourceId: "p1", targetId: "s1", type: "BELONGS_TO_PLAYER" }));

    const pEdges = await store.getEdgesForNode("p1");
    expect(pEdges).toHaveLength(1);
    expect(pEdges[0].targetId).toBe("s1");
  });
});

/* ════════════════════════════════════════════════════════════
   PLAYER_RISK_PATTERNS Query
   ════════════════════════════════════════════════════════════ */

describe("PLAYER_RISK_PATTERNS query", () => {
  it("returns risk patterns for a player", async () => {
    const { store } = await buildGraph(buildDefaultInput());
    const result = await executeGraphQuery(store, { type: "PLAYER_RISK_PATTERNS", playerId: "test-player-1" });

    expect(result.type).toBe("PLAYER_RISK_PATTERNS");
    if (result.type === "PLAYER_RISK_PATTERNS") {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.some((p) => p.patternType.includes("tilt"))).toBe(true);
      expect(result.data.some((p) => p.patternType.includes("stop_session"))).toBe(true);
      expect(result.data.some((p) => p.patternType.includes("loss_chasing"))).toBe(true);
    }
  });

  it("returns empty for player with no patterns", async () => {
    const store = new InMemoryGraphStore();
    const result = await executeGraphQuery(store, { type: "PLAYER_RISK_PATTERNS", playerId: "nonexistent" });
    if (result.type === "PLAYER_RISK_PATTERNS") {
      expect(result.data).toEqual([]);
    }
  });
});

/* ════════════════════════════════════════════════════════════
   STRATEGY_RELIABILITY Query
   ════════════════════════════════════════════════════════════ */

describe("STRATEGY_RELIABILITY query", () => {
  it("returns strategy info for a player", async () => {
    const { store } = await buildGraph(buildDefaultInput());
    const result = await executeGraphQuery(store, { type: "STRATEGY_RELIABILITY", playerId: "test-player-1" });

    expect(result.type).toBe("STRATEGY_RELIABILITY");
    if (result.type === "STRATEGY_RELIABILITY") {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.some((s) => s.strategyName === "s1")).toBe(true);
    }
  });

  it("filters by strategy name", async () => {
    const { store } = await buildGraph(buildDefaultInput());
    const result = await executeGraphQuery(store, {
      type: "STRATEGY_RELIABILITY",
      strategyName: "s1",
    });

    expect(result.type).toBe("STRATEGY_RELIABILITY");
    if (result.type === "STRATEGY_RELIABILITY") {
      expect(result.data.every((s) => s.strategyName === "s1")).toBe(true);
    }
  });

  it("returns empty for unknown strategy", async () => {
    const { store } = await buildGraph(buildDefaultInput());
    const result = await executeGraphQuery(store, {
      type: "STRATEGY_RELIABILITY",
      strategyName: "nonexistent",
    });
    expect(result.type).toBe("STRATEGY_RELIABILITY");
    if (result.type === "STRATEGY_RELIABILITY") {
      expect(result.data).toEqual([]);
    }
  });
});

/* ════════════════════════════════════════════════════════════
   STOP_SESSION_PATH Query
   ════════════════════════════════════════════════════════════ */

describe("STOP_SESSION_PATH query", () => {
  it("traces path to stop session", async () => {
    const { store } = await buildGraph(buildDefaultInput());
    const result = await executeGraphQuery(store, { type: "STOP_SESSION_PATH", playerId: "test-player-1" });

    expect(result.type).toBe("STOP_SESSION_PATH");
    if (result.type === "STOP_SESSION_PATH") {
      expect(result.data.rootCauses.length).toBeGreaterThan(0);
      expect(result.data.recommendedAction).toBeTruthy();
    }
  });

  it("returns empty path for player with no stops", async () => {
    const store = new InMemoryGraphStore();
    const result = await executeGraphQuery(store, { type: "STOP_SESSION_PATH", playerId: "clean-player" });
    if (result.type === "STOP_SESSION_PATH") {
      expect(result.data.path).toEqual([]);
    }
  });
});

/* ════════════════════════════════════════════════════════════
   GAME_BEHAVIOR_RISKS Query
   ════════════════════════════════════════════════════════════ */

describe("GAME_BEHAVIOR_RISKS query", () => {
  it("returns behavior risks for a game type", async () => {
    const { store } = await buildGraph(buildDefaultInput());
    const result = await executeGraphQuery(store, { type: "GAME_BEHAVIOR_RISKS", gameType: "DICE" });

    expect(result.type).toBe("GAME_BEHAVIOR_RISKS");
    if (result.type === "GAME_BEHAVIOR_RISKS") {
      expect(result.data.gameType).toBe("DICE");
      expect(result.data.recommendation).toBeTruthy();
    }
  });

  it("handles unknown game type gracefully", async () => {
    const { store } = await buildGraph(buildDefaultInput());
    const result = await executeGraphQuery(store, { type: "GAME_BEHAVIOR_RISKS", gameType: "UNKNOWN" });
    if (result.type === "GAME_BEHAVIOR_RISKS") {
      expect(result.data.mostCommonBehaviors).toEqual([]);
    }
  });
});

/* ════════════════════════════════════════════════════════════
   LEARNING_DRIFT_DOWNGRADE Query
   ════════════════════════════════════════════════════════════ */

describe("LEARNING_DRIFT_DOWNGRADE query", () => {
  it("detects confidence drift signals", async () => {
    const { store } = await buildGraph(buildDefaultInput());
    const result = await executeGraphQuery(store, { type: "LEARNING_DRIFT_DOWNGRADE", playerId: "test-player-1" });

    expect(result.type).toBe("LEARNING_DRIFT_DOWNGRADE");
    if (result.type === "LEARNING_DRIFT_DOWNGRADE") {
      expect(Array.isArray(result.data)).toBe(true);
    }
  });
});

/* ════════════════════════════════════════════════════════════
   DEBATE_MOST_OPPOSED Query
   ════════════════════════════════════════════════════════════ */

describe("DEBATE_MOST_OPPOSED query", () => {
  it("identifies opposed strategies", async () => {
    const { store } = await buildGraph(buildDefaultInput());
    const result = await executeGraphQuery(store, { type: "DEBATE_MOST_OPPOSED", playerId: "test-player-1" });

    expect(result.type).toBe("DEBATE_MOST_OPPOSED");
    if (result.type === "DEBATE_MOST_OPPOSED") {
      expect(Array.isArray(result.data)).toBe(true);
    }
  });
});

/* ════════════════════════════════════════════════════════════
   Graph Retrieval → GraphContext
   ════════════════════════════════════════════════════════════ */

describe("Graph retrieval returns usable context", () => {
  it("returns full GraphContext for a player", async () => {
    const { store } = await buildGraph(buildDefaultInput());
    const ctx = await retrieveGraphContext(store, "test-player-1");

    expect(ctx.playerId).toBe("test-player-1");
    expect(Array.isArray(ctx.relatedRiskPatterns)).toBe(true);
    expect(Array.isArray(ctx.strategyReliability)).toBe(true);
    expect(Array.isArray(ctx.repeatedBehaviorEvents)).toBe(true);
    expect(Array.isArray(ctx.confidenceDriftSignals)).toBe(true);
    expect(ctx.decisionPathSummary.totalDecisions).toBeGreaterThan(0);
    expect(Array.isArray(ctx.recommendedConstraints)).toBe(true);
    expect(Array.isArray(ctx.warnings)).toBe(true);
  });

  it("returns safe defaults for empty store", async () => {
    const store = new InMemoryGraphStore();
    const ctx = await retrieveGraphContext(store, "empty-player");

    expect(ctx.playerId).toBe("empty-player");
    expect(ctx.relatedRiskPatterns).toEqual([]);
    expect(ctx.strategyReliability).toEqual([]);
    expect(ctx.repeatedBehaviorEvents).toEqual([]);
    expect(ctx.warnings).toEqual([]);
  });
});

/* ════════════════════════════════════════════════════════════
   Export / Import Deterministic
   ════════════════════════════════════════════════════════════ */

describe("Export / Import deterministic", () => {
  it("serialize → deserialize preserves graph structure", async () => {
    const { graph } = await buildGraph(buildDefaultInput());
    const serializer = new JSONGraphSerializer();

    const json = serializer.serialize(graph);
    const restored = serializer.deserialize(json);

    expect(restored.nodes).toHaveLength(graph.nodes.length);
    expect(restored.edges).toHaveLength(graph.edges.length);
    expect(restored.metadata.playerId).toBe(graph.metadata.playerId);
  });

  it("deserialize rejects invalid input", () => {
    const serializer = new JSONGraphSerializer();
    expect(() => serializer.deserialize("{}")).toThrow("Invalid KnowledgeGraph");
    expect(() => serializer.deserialize('{"nodes":[]}')).toThrow("Invalid KnowledgeGraph");
    expect(() => serializer.deserialize('{"nodes":[],"edges":[],"warnings":[]}')).toThrow("Invalid KnowledgeGraph");
  });

  it("serialization is reproducible", async () => {
    const { graph } = await buildGraph(buildDefaultInput());
    const serializer = new JSONGraphSerializer();

    const json1 = serializer.serialize(graph);
    const json2 = serializer.serialize(graph);
    expect(json1).toBe(json2);
  });
});

/* ════════════════════════════════════════════════════════════
   Unknown Node / Query Safe Failure
   ════════════════════════════════════════════════════════════ */

describe("Unknown node / query safe failure", () => {
  it("getNode returns null for nonexistent id", async () => {
    const store = new InMemoryGraphStore();
    expect(await store.getNode("nope")).toBeNull();
  });

  it("getEdgesForNode returns empty for nonexistent id", async () => {
    const store = new InMemoryGraphStore();
    expect(await store.getEdgesForNode("nope")).toEqual([]);
  });

  it("exportGraph returns empty graph from empty store", async () => {
    const store = new InMemoryGraphStore();
    const graph = await store.exportGraph();
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
    expect(graph.metadata.playerId).toBe("unknown");
  });

  it("clear resets store", async () => {
    const store = new InMemoryGraphStore();
    await store.addNode(makeNode({ id: "temp" }));
    await store.clear();
    expect(await store.getNode("temp")).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════
   Empty / Minimal Input
   ════════════════════════════════════════════════════════════ */

describe("Empty / minimal input", () => {
  it("builds minimal graph with just player and session", async () => {
    const { graph } = await buildGraph({
      playerId: "minimal",
      sessionId: "min-session",
    });
    expect(graph.nodes.length).toBe(2); // PLAYER + SESSION
    expect(graph.edges.length).toBe(1); // BELONGS_TO_PLAYER
  });

  it("handles null outputs gracefully", async () => {
    const { graph } = await buildGraph({
      playerId: "p1", sessionId: "s1",
      memoryEvents: undefined as unknown as unknown[],
      decisionOutputs: undefined as unknown as unknown[],
    });
    expect(graph.nodes.length).toBe(2);
    expect(graph.warnings).toEqual([]);
  });
});
