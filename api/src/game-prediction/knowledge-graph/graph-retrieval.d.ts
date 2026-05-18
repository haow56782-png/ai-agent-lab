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
import type { GraphStore, GraphContext } from "./types.js";
/**
 * Retrieve a full GraphContext for a player from the graph store.
 * Runs PLAYER_RISK_PATTERNS, STRATEGY_RELIABILITY, and other
 * queries in parallel, then assembles the result.
 */
export declare function retrieveGraphContext(store: GraphStore, playerId: string, sessionId?: string): Promise<GraphContext>;
//# sourceMappingURL=graph-retrieval.d.ts.map