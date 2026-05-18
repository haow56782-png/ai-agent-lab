/** ============================================================
 *  Knowledge Graph — Type Definitions
 *
 *  Expresses relationships between players, sessions, strategies,
 *  games, risk patterns, behavior events, learning signals, debate
 *  outcomes, simulation outcomes, and decisions.
 *
 *  GraphContext output is designed for injection into:
 *    - Decision Engine
 *    - Debate Engine
 *    - Learning Engine
 *    - Behavior Engine
 *  ============================================================ */
export type GraphNodeType = "PLAYER" | "SESSION" | "GAME" | "STRATEGY" | "RISK_PATTERN" | "BEHAVIOR_EVENT" | "LEARNING_SIGNAL" | "DEBATE_OUTCOME" | "SIMULATION_OUTCOME" | "DECISION";
export interface GraphNode {
    id: string;
    type: GraphNodeType;
    label: string;
    properties: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type GraphEdgeType = "PLAYED_GAME" | "USED_STRATEGY" | "PRODUCED_DECISION" | "TRIGGERED_BEHAVIOR" | "CAUSED_WARNING" | "UPDATED_CONFIDENCE" | "DEGRADED_STRATEGY" | "ESCALATED_RISK" | "SUPPORTED_BY_SIMULATION" | "REVIEWED_BY_DEBATE" | "OCCURRED_IN_SESSION" | "BELONGS_TO_PLAYER";
export interface GraphEdge {
    id: string;
    sourceId: string;
    targetId: string;
    type: GraphEdgeType;
    properties: Record<string, unknown>;
    weight: number;
    createdAt: string;
}
export interface KnowledgeGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
    metadata: {
        playerId: string;
        nodeCount: number;
        edgeCount: number;
        builtAt: string;
        sourceSummary: {
            memoryEvents: number;
            decisionOutputs: number;
            behaviorOutputs: number;
            learningOutputs: number;
            debateOutputs: number;
            simulationOutputs: number;
        };
    };
    warnings: string[];
}
export interface GraphBuildInput {
    playerId: string;
    sessionId: string;
    memoryEvents?: unknown[];
    decisionOutputs?: unknown[];
    behaviorOutputs?: unknown[];
    learningOutputs?: unknown[];
    debateOutputs?: unknown[];
    simulationOutputs?: unknown[];
}
export type GraphQueryType = "PLAYER_RISK_PATTERNS" | "STRATEGY_RELIABILITY" | "STOP_SESSION_PATH" | "GAME_BEHAVIOR_RISKS" | "LEARNING_DRIFT_DOWNGRADE" | "DEBATE_MOST_OPPOSED";
export interface GraphQuery {
    type: GraphQueryType;
    playerId?: string;
    strategyName?: string;
    gameType?: string;
    sessionId?: string;
    limit?: number;
}
export interface RiskPatternResult {
    patternType: string;
    severity: string;
    frequency: number;
    relatedStrategies: string[];
    lastOccurrence: string;
    trend: "increasing" | "stable" | "decreasing";
}
export interface StrategyReliabilityResult {
    strategyName: string;
    totalUses: number;
    winRate: number;
    trend: "improving" | "stable" | "declining";
    isDegraded: boolean;
    degradationReason?: string;
}
export interface StopSessionPathResult {
    path: {
        from: string;
        to: string;
        via: string;
        timestamp: string;
    }[];
    rootCauses: string[];
    recommendedAction: string;
}
export interface GameBehaviorRiskResult {
    gameType: string;
    mostCommonBehaviors: {
        behavior: string;
        count: number;
    }[];
    riskLevel: string;
    recommendation: string;
}
export interface LearningDriftResult {
    strategyName: string;
    driftDirection: "overconfidence" | "underconfidence" | "none";
    driftMagnitude: number;
    hasCausedDowngrade: boolean;
    downgradeEvents: {
        action: string;
        timestamp: string;
    }[];
}
export interface DebateOppositionResult {
    strategyName: string;
    oppositionCount: number;
    averageOppositionScore: number;
    primaryObjections: string[];
}
export type GraphQueryResult = {
    type: "PLAYER_RISK_PATTERNS";
    data: RiskPatternResult[];
} | {
    type: "STRATEGY_RELIABILITY";
    data: StrategyReliabilityResult[];
} | {
    type: "STOP_SESSION_PATH";
    data: StopSessionPathResult;
} | {
    type: "GAME_BEHAVIOR_RISKS";
    data: GameBehaviorRiskResult;
} | {
    type: "LEARNING_DRIFT_DOWNGRADE";
    data: LearningDriftResult[];
} | {
    type: "DEBATE_MOST_OPPOSED";
    data: DebateOppositionResult[];
};
export interface GraphStore {
    addNode(node: GraphNode): Promise<void>;
    addEdge(edge: GraphEdge): Promise<void>;
    getNode(id: string): Promise<GraphNode | null>;
    getEdgesForNode(id: string): Promise<GraphEdge[]>;
    query(query: GraphQuery): Promise<GraphQueryResult>;
    exportGraph(): Promise<KnowledgeGraph>;
    clear(): Promise<void>;
}
export interface GraphContext {
    playerId: string;
    relatedRiskPatterns: RiskPatternResult[];
    strategyReliability: StrategyReliabilityResult[];
    repeatedBehaviorEvents: {
        type: string;
        count: number;
        lastSeen: string;
    }[];
    confidenceDriftSignals: LearningDriftResult[];
    decisionPathSummary: {
        totalDecisions: number;
        totalDowngrades: number;
        totalStops: number;
        recentActions: string[];
    };
    recommendedConstraints: string[];
    warnings: string[];
}
export interface GraphSerializer {
    serialize(graph: KnowledgeGraph): string;
    deserialize(data: string): KnowledgeGraph;
}
//# sourceMappingURL=types.d.ts.map