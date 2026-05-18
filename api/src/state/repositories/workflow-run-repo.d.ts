import type { Database } from "../db.js";
import type { WorkflowRunRecord } from "../types.js";
export declare class WorkflowRunRepository {
    private db;
    constructor(db: Database);
    init(): Promise<void>;
    save(run: WorkflowRunRecord): Promise<void>;
    list(limit?: number): Promise<WorkflowRunRecord[]>;
}
//# sourceMappingURL=workflow-run-repo.d.ts.map