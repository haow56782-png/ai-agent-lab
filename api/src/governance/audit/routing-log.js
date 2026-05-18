/** ============================================================
 *  Routing Log — Append-only model routing audit trail.
 *  ============================================================ */
export class RoutingLog {
    entries = [];
    record(entry) {
        this.entries.push({ ...entry, timestamp: entry.timestamp || new Date().toISOString() });
    }
    getAll() {
        return [...this.entries];
    }
    getByModel(model) {
        return this.entries.filter((e) => e.selectedModel === model);
    }
    getByTask(taskId) {
        return this.entries.find((e) => e.taskId === taskId);
    }
    getRecent(count) {
        return [...this.entries].reverse().slice(0, count);
    }
    getStats() {
        const byModel = {};
        const byComplexity = {};
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
    clear() {
        this.entries = [];
    }
}
//# sourceMappingURL=routing-log.js.map