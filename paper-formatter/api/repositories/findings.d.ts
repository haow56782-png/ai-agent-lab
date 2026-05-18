import type { ActorRole, AuditAction, AuditRecord, ExemptionRecord, FindingContract, FindingListQuery, FindingStatus } from "../../../../packages/shared-types/src/finding-contract";
export declare function upsertFindings(input: {
    jobId?: string;
    documentId: string;
    findings: FindingContract[];
}): Promise<FindingContract[]>;
export declare function listFindings(filter: FindingListQuery): Promise<FindingContract[]>;
export declare function getFinding(findingId: string): Promise<FindingContract | null>;
export declare function setFindingStatus(input: {
    findingId: string;
    status: FindingStatus;
    actorId: string;
    actorRole: ActorRole;
    action: AuditAction;
    reason?: string;
}): Promise<FindingContract | null>;
export declare function recordP1Exemption(input: {
    documentId: string;
    findingIds: string[];
    actorId: string;
    actorRole: "Author" | "Admin";
    reason: string;
}): Promise<{
    record: ExemptionRecord;
    audits: AuditRecord[];
}>;
export declare function listP1ExemptedFindingIds(documentId: string): Promise<string[]>;
