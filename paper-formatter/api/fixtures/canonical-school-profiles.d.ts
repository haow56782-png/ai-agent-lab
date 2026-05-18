export interface CanonicalProfileSeed {
    schoolId: string;
    name: string;
    faculty: string;
    version: string;
    effectiveFrom: string;
    aliases: string[];
    rulesJson: any[];
    styleMap: any[];
}
export declare const CANONICAL_PROFILE_SEEDS: CanonicalProfileSeed[];
export declare function resolveCanonicalProfileSeed(name: string): CanonicalProfileSeed | null;
