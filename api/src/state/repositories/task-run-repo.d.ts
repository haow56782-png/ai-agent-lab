import type { Database } from "../db.js";
import type { TaskRunRecord } from "../types.js";
export declare class TaskRunRepository {
    private db;
    constructor(db: Database);
    init(): Promise<void>;
    save(run: TaskRunRecord): Promise<void>;
    listBySession(sessionId: string): Promise<TaskRunRecord[]>;
}
//# sourceMappingURL=task-run-repo.d.ts.map