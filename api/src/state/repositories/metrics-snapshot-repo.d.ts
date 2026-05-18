import type { Database } from "../db.js";
import type { MetricsSnapshotRecord } from "../types.js";
export declare class MetricsSnapshotRepository {
    private db;
    constructor(db: Database);
    init(): Promise<void>;
    save(snapshot: MetricsSnapshotRecord): Promise<void>;
    list(sessionId?: string, limit?: number): Promise<MetricsSnapshotRecord[]>;
}
//# sourceMappingURL=metrics-snapshot-repo.d.ts.map