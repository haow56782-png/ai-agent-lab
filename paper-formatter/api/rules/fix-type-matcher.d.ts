import type { FindingContract } from "../../../../packages/shared-types/src/finding-contract";
import type { FixType } from "../../../../packages/shared-types/src/job-contract";
export declare function matchFindingForFixType(fixType: FixType, findings: FindingContract[], index: number): FindingContract | null;
export declare function matchFormatterFindingIdForFixType(formatterDiff: any, fixType: FixType, index: number): string | undefined;
