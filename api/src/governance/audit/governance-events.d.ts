/** ============================================================
 *  Governance Events — Append-only governance event store.
 *  ============================================================ */
import type { GovernanceEvent, AuditAction } from "./audit-types.js";
export declare class GovernanceEventStore {
    private events;
    private counter;
    emit(type: AuditAction, actor: string, data?: Record<string, unknown>): GovernanceEvent;
    getAll(): GovernanceEvent[];
    getByType(type: AuditAction): GovernanceEvent[];
    getByActor(actor: string): GovernanceEvent[];
    getRange(from: string, to: string): GovernanceEvent[];
    getLatest(count: number): GovernanceEvent[];
    getStats(): {
        total: number;
        byType: Record<string, number>;
        byActor: Record<string, number>;
    };
    clear(): void;
}
//# sourceMappingURL=governance-events.d.ts.map