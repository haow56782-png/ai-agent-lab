import type { Database } from "../db.js";
import type { EvalHistoryRecord } from "../types.js";
export declare class EvalHistoryRepository {
    private db;
    constructor(db: Database);
    init(): Promise<void>;
    append(entry: EvalHistoryRecord): Promise<void>;
    list(limit?: number): Promise<EvalHistoryRecord[]>;
}
//# sourceMappingURL=eval-history-repo.d.ts.map