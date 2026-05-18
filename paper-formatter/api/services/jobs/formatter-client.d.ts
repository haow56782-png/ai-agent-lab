import type { FindingContract } from "../../../../../packages/shared-types/src/finding-contract";
export declare function callFormatterService(documentBuffer: Buffer, filename: string, profileId: string, findingContext?: FindingContract[]): Promise<{
    formatted: Buffer;
    diff: any;
}>;
