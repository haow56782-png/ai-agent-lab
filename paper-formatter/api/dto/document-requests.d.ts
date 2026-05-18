import type { LegacyDocumentCommand } from "../../../../packages/shared-types/src/job-contract";
export type DetectSchoolCommand = LegacyDocumentCommand;
export interface AutoCreateSchoolCommand {
    name: string;
    legacyDocId?: string;
}
export interface ShareReportCommand extends LegacyDocumentCommand {
    checkResultLegacyDocId: string;
}
export declare function parseDetectSchoolCommand(body: unknown): DetectSchoolCommand;
export declare function parseAutoCreateSchoolCommand(body: unknown): AutoCreateSchoolCommand;
export declare function parseShareReportCommand(body: unknown): ShareReportCommand;
