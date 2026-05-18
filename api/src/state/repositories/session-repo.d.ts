import type { Database } from "../db.js";
import type { SessionRecord } from "../types.js";
export declare class SessionRepository {
    private db;
    constructor(db: Database);
    init(): Promise<void>;
    save(session: SessionRecord): Promise<void>;
    load(id: string): Promise<SessionRecord | null>;
    list(limit?: number, offset?: number): Promise<SessionRecord[]>;
}
//# sourceMappingURL=session-repo.d.ts.map