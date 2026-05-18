import type { Database } from "../db.js";
import type { TraceSpanRecord } from "../types.js";
export declare class TraceSpanRepository {
    private db;
    constructor(db: Database);
    init(): Promise<void>;
    save(span: TraceSpanRecord): Promise<void>;
    queryRecent(limit?: number): Promise<TraceSpanRecord[]>;
    queryByTraceId(traceId: string): Promise<TraceSpanRecord[]>;
}
//# sourceMappingURL=trace-span-repo.d.ts.map