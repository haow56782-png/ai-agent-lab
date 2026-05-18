import type { TaskStore, SignalStore, ReportStore, TaskRecord, SignalRecord, ReportRecord } from "./types.js";
export declare class InMemoryTaskStore implements TaskStore {
    private tasks;
    createTask(task: TaskRecord): Promise<TaskRecord>;
    getTask(taskId: string): Promise<TaskRecord | undefined>;
    updateTask(taskId: string, updates: Partial<TaskRecord>): Promise<TaskRecord | undefined>;
    listTasks(userId?: string): Promise<TaskRecord[]>;
}
export declare class InMemorySignalStore implements SignalStore {
    private signals;
    createSignal(signal: SignalRecord): Promise<SignalRecord>;
    getSignal(signalId: string): Promise<SignalRecord | undefined>;
}
export declare class InMemoryReportStore implements ReportStore {
    private reports;
    createReport(report: ReportRecord): Promise<ReportRecord>;
    getReport(reportId: string): Promise<ReportRecord | undefined>;
}
//# sourceMappingURL=in-memory.d.ts.map