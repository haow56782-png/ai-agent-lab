import { type CanonicalProfileSeed } from "../fixtures/canonical-school-profiles.js";
export interface SchoolProfile {
    id: string;
    school_id: string;
    name: string;
    version: string;
    effective_from: string;
    effective_to: string | null;
    faculty: string | null;
    major: string | null;
    gb_version: string;
    rules_json: any[];
    style_map: any[];
    source_type: string;
    source_hash: string | null;
    upload_count: number;
    recent_usage_count_7d?: number;
    recent_hit_rate_7d?: number;
    last_used_at?: string | null;
    created_at: string;
    updated_at: string;
}
export declare function searchProfiles(params: {
    schoolId?: string;
    faculty?: string;
    major?: string;
}): Promise<SchoolProfile[]>;
export declare function getProfile(profileId: string): Promise<SchoolProfile | null>;
export declare function getProfileRules(profileId: string): Promise<Pick<SchoolProfile, "school_id" | "rules_json" | "style_map"> | null>;
export declare function createProfile(record: {
    schoolId: string;
    name: string;
    version: string;
    effectiveFrom: string;
    faculty?: string;
    major?: string;
    rulesJson?: any[];
    styleMap?: any[];
    sourceType?: string;
}): Promise<SchoolProfile>;
export declare function listProfiles(q?: string): Promise<SchoolProfile[]>;
export declare function findProfileByName(name: string): Promise<SchoolProfile | null>;
export declare function resolveCanonicalSeedByName(name: string): CanonicalProfileSeed | null;
export declare function ensureCanonicalProfile(seed: CanonicalProfileSeed): Promise<SchoolProfile>;
export declare function findBestProfileByName(name: string): Promise<SchoolProfile | null>;
export declare function findProfileById(schoolId: string): Promise<SchoolProfile | null>;
export declare function incrementUploadCount(schoolId: string): Promise<void>;
export declare function ensureSeedProfileSamples(): Promise<void>;
export declare function ensureSeedSchools(): Promise<void>;
export declare function normalizeCanonicalProfileSourceTypes(): Promise<number>;
export declare function migrateLegacyDetectedProfiles(): Promise<{
    migratedProfiles: number;
    migratedDocumentLinks: number;
}>;
