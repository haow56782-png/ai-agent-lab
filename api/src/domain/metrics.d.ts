/**
 * VIB AI — Metrics Service
 *
 * Aggregates game runtime metrics. Currently returns baseline values;
 * will connect to real data pipeline in Milestone 2.
 */
import { type GameMetrics, type Timeframe } from "./game.js";
export declare function getMetrics(gameName: string, timeframe: Timeframe): Promise<GameMetrics>;
//# sourceMappingURL=metrics.d.ts.map