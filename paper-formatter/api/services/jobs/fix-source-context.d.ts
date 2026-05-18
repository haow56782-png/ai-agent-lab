import type { FindingContract } from "../../../../../packages/shared-types/src/finding-contract";
export interface FixSourceContext {
    chapters: string[];
    snippets: string[];
    findings: FindingContract[];
}
export declare function getFixSourceContext(sourceJobId: string | undefined, documentId: string): Promise<FixSourceContext>;
