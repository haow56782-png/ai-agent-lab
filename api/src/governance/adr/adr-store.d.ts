/** ============================================================
 *  ADR Store — In-memory ADR storage with query support.
 *  ============================================================ */
import type { ArchitectureDecisionRecord, AdrCategory, AdrStore } from "./types.js";
export declare class InMemoryAdrStore implements AdrStore {
    private records;
    save(adr: ArchitectureDecisionRecord): Promise<void>;
    get(id: string): Promise<ArchitectureDecisionRecord | null>;
    getAll(): Promise<ArchitectureDecisionRecord[]>;
    getByCategory(category: AdrCategory): Promise<ArchitectureDecisionRecord[]>;
    getByModule(module: string): Promise<ArchitectureDecisionRecord[]>;
    getLatestFinal(): Promise<ArchitectureDecisionRecord | null>;
}
//# sourceMappingURL=adr-store.d.ts.map