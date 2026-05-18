/** Store interfaces for API Server — backed by in-memory, replaceable with DB later. */
export type TaskStatus = "CREATED" | "QUEUED" | "ANALYZING" | "COMPLETED" | "FAILED";
export type SignalStatus = "ACTIVE" | "EXPIRED" | "FAILED";
export interface TaskRecord {
    taskId: string;
    url: string;
    gameId?: string;
    platform?: string;
    userId: string;
    status: TaskStatus;
    progress: number;
    currentStep: string;
    result?: string;
    createdAt: string;
    updatedAt: string;
}
export interface SignalRecord {
    signalId: string;
    taskId: string;
    status: SignalStatus;
    summary: string;
    confidence: number;
    details?: Record<string, unknown>;
    createdAt: string;
}
export interface ReportRecord {
    reportId: string;
    taskId: string;
    summary: string;
    findings: string[];
    details?: Record<string, unknown>;
    createdAt: string;
}
export interface TaskStore {
    createTask(task: TaskRecord): Promise<TaskRecord>;
    getTask(taskId: string): Promise<TaskRecord | undefined>;
    updateTask(taskId: string, updates: Partial<TaskRecord>): Promise<TaskRecord | undefined>;
    listTasks(userId?: string): Promise<TaskRecord[]>;
}
export interface SignalStore {
    createSignal(signal: SignalRecord): Promise<SignalRecord>;
    getSignal(signalId: string): Promise<SignalRecord | undefined>;
}
export interface ReportStore {
    createReport(report: ReportRecord): Promise<ReportRecord>;
    getReport(reportId: string): Promise<ReportRecord | undefined>;
}
//# sourceMappingURL=types.d.ts.map