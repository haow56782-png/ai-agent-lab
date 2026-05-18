export class InMemoryTaskStore {
    tasks = new Map();
    async createTask(task) {
        this.tasks.set(task.taskId, task);
        return task;
    }
    async getTask(taskId) {
        return this.tasks.get(taskId);
    }
    async updateTask(taskId, updates) {
        const existing = this.tasks.get(taskId);
        if (!existing)
            return undefined;
        const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
        this.tasks.set(taskId, updated);
        return updated;
    }
    async listTasks(userId) {
        const all = Array.from(this.tasks.values());
        if (userId)
            return all.filter((t) => t.userId === userId);
        return all;
    }
}
export class InMemorySignalStore {
    signals = new Map();
    async createSignal(signal) {
        this.signals.set(signal.signalId, signal);
        return signal;
    }
    async getSignal(signalId) {
        return this.signals.get(signalId);
    }
}
export class InMemoryReportStore {
    reports = new Map();
    async createReport(report) {
        this.reports.set(report.reportId, report);
        return report;
    }
    async getReport(reportId) {
        return this.reports.get(reportId);
    }
}
//# sourceMappingURL=in-memory.js.map