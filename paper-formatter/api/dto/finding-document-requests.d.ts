import type { FindingDocumentQuery, FindingListQuery, FindingSyncCommand, P1ExemptionCommand } from "../../../../packages/shared-types/src/finding-contract";
export declare function parseFindingDocumentQuery(query: unknown): FindingDocumentQuery;
export declare function toFindingListQuery(query: FindingDocumentQuery): FindingListQuery;
export declare function parseFindingSyncCommand(body: unknown): FindingSyncCommand;
export declare function parseP1ExemptionCommand(body: unknown): P1ExemptionCommand;
