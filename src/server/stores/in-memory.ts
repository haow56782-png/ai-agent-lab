import type { TaskStore, SignalStore, ReportStore, TaskRecord, SignalRecord, ReportRecord } from "./types.js";

export class InMemoryTaskStore implements TaskStore {
  private tasks = new Map<string, TaskRecord>();

  async createTask(task: TaskRecord): Promise<TaskRecord> {
    this.tasks.set(task.taskId, task);
    return task;
  }

  async getTask(taskId: string): Promise<TaskRecord | undefined> {
    return this.tasks.get(taskId);
  }

  async updateTask(taskId: string, updates: Partial<TaskRecord>): Promise<TaskRecord | undefined> {
    const existing = this.tasks.get(taskId);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.tasks.set(taskId, updated);
    return updated;
  }

  async listTasks(userId?: string): Promise<TaskRecord[]> {
    const all = Array.from(this.tasks.values());
    if (userId) return all.filter((t) => t.userId === userId);
    return all;
  }
}

export class InMemorySignalStore implements SignalStore {
  private signals = new Map<string, SignalRecord>();

  async createSignal(signal: SignalRecord): Promise<SignalRecord> {
    this.signals.set(signal.signalId, signal);
    return signal;
  }

  async getSignal(signalId: string): Promise<SignalRecord | undefined> {
    return this.signals.get(signalId);
  }
}

export class InMemoryReportStore implements ReportStore {
  private reports = new Map<string, ReportRecord>();

  async createReport(report: ReportRecord): Promise<ReportRecord> {
    this.reports.set(report.reportId, report);
    return report;
  }

  async getReport(reportId: string): Promise<ReportRecord | undefined> {
    return this.reports.get(reportId);
  }
}
