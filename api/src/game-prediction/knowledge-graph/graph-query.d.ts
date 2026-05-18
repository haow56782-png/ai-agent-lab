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
import type { GraphQuery, GraphQueryResult } from "./types.js";
import type { InMemoryGraphStore } from "./graph-store.js";
export declare function executeGraphQuery(store: InMemoryGraphStore, query: GraphQuery): Promise<GraphQueryResult>;
//# sourceMappingURL=graph-query.d.ts.map