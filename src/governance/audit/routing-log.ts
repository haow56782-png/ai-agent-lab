/** ============================================================
 *  Routing Log — Append-only model routing audit trail.
 *  ============================================================ */

import type { RoutingLogEntry } from "./audit-types.js";

export class RoutingLog {
  private entries: RoutingLogEntry[] = [];

  record(entry: RoutingLogEntry): void {
    this.entries.push({ ...entry, timestamp: entry.timestamp || new Date().toISOString() });
  }

  getAll(): RoutingLogEntry[] {
    return [...this.entries];
  }

  getByModel(model: RoutingLogEntry["selectedModel"]): RoutingLogEntry[] {
    return this.entries.filter((e) => e.selectedModel === model);
  }

  getByTask(taskId: string): RoutingLogEntry | undefined {
    return this.entries.find((e) => e.taskId === taskId);
  }

  getRecent(count: number): RoutingLogEntry[] {
    return [...this.entries].reverse().slice(0, count);
  }

  getStats(): {
    totalRoutes: number;
    byModel: Record<string, number>;
    byComplexity: Record<string, number>;
    averageCostMultiplier: number;
  } {
    const byModel: Record<string, number> = {};
    const byComplexity: Record<string, number> = {};

    for (const entry of this.entries) {
      byModel[entry.selectedModel] = (byModel[entry.selectedModel] ?? 0) + 1;
      byComplexity[entry.taskComplexity] = (byComplexity[entry.taskComplexity] ?? 0) + 1;
    }

    const avgCost = this.entries.length > 0
      ? this.entries.reduce((s, e) => s + e.estimatedCostMultiplier, 0) / this.entries.length
      : 0;

    return {
      totalRoutes: this.entries.length,
      byModel,
      byComplexity,
      averageCostMultiplier: Math.round(avgCost * 100) / 100,
    };
  }

  clear(): void {
    this.entries = [];
  }
}
