/** ============================================================
 *  Routing Log — Append-only model routing audit trail.
 *  ============================================================ */
import type { RoutingLogEntry } from "./audit-types.js";
export declare class RoutingLog {
    private entries;
    record(entry: RoutingLogEntry): void;
    getAll(): RoutingLogEntry[];
    getByModel(model: RoutingLogEntry["selectedModel"]): RoutingLogEntry[];
    getByTask(taskId: string): RoutingLogEntry | undefined;
    getRecent(count: number): RoutingLogEntry[];
    getStats(): {
        totalRoutes: number;
        byModel: Record<string, number>;
        byComplexity: Record<string, number>;
        averageCostMultiplier: number;
    };
    clear(): void;
}
//# sourceMappingURL=routing-log.d.ts.map