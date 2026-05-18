/**
 * Governance Memory File — File-based persistence for governance memory.
 *
 * Provides load/save/append operations with:
 * - Append-only entries (no overwrite)
 * - Immutable freeze snapshots
 * - Accepted ADR immutability
 * - Stable JSON serialization for deterministic diffs
 *
 * ============================================================
 *  P3.0 Architecture Memory & Governance Persistence
 * ============================================================ */
import type { GovernanceMemoryEntry, FreezeSnapshot } from "./governance-memory.js";
import type { CognitiveAdrJson } from "./adr-types.js";
import type { InvariantEntry } from "./invariant-registry.js";
export interface GovernanceMemoryPersistedFile {
    version: "1.0";
    createdAt: string;
    entries: GovernanceMemoryEntry[];
    freezeSnapshots: FreezeSnapshot[];
    adrs: CognitiveAdrJson[];
    invariants: InvariantEntry[];
}
export type GovernanceMemoryFileErrorCode = "GOVERNANCE_MEMORY_FILE_NOT_FOUND" | "GOVERNANCE_REPLAY_BLOCKED" | "CONSTITUTIONAL_INVARIANT_VIOLATION" | "FREEZE_SNAPSHOT_ALREADY_EXISTS" | "ACCEPTED_ADR_IMMUTABLE" | "GOVERNANCE_MEMORY_APPEND_ONLY_VIOLATION" | "MEMORY_SCHEMA_VALIDATION_FAILED";
export declare class GovernanceMemoryFileError extends Error {
    code: GovernanceMemoryFileErrorCode;
    details?: Record<string, unknown>;
    constructor(code: GovernanceMemoryFileErrorCode, message: string, details?: Record<string, unknown>);
}
/**
 * Create a deterministic governance ID from input content.
 * Uses FNV-1a hash of the concatenated input fields.
 */
export declare function createDeterministicGovernanceId(prefix: string, ...parts: string[]): string;
export declare function loadGovernanceMemoryFile(filePath: string): GovernanceMemoryPersistedFile;
export declare function saveGovernanceMemoryFile(filePath: string, data: GovernanceMemoryPersistedFile): void;
export declare function createEmptyGovernanceMemoryFile(): GovernanceMemoryPersistedFile;
/**
 * Append a governance memory entry to the file.
 * Throws APPEND_ONLY_VIOLATION if entry ID already exists.
 */
export declare function appendGovernanceMemoryFileEntry(file: GovernanceMemoryPersistedFile, entry: GovernanceMemoryEntry): void;
/**
 * Append a freeze snapshot to the file.
 * Throws FREEZE_SNAPSHOT_ALREADY_EXISTS if same freezeVersion + adrId combo exists.
 */
export declare function appendFreezeSnapshotToFile(file: GovernanceMemoryPersistedFile, snapshot: FreezeSnapshot): void;
/**
 * Append an ADR to the file.
 * Throws ACCEPTED_ADR_IMMUTABLE if ADR with same ID already exists.
 */
export declare function appendADRToFile(file: GovernanceMemoryPersistedFile, adr: CognitiveAdrJson): void;
export interface GovernanceReplayBlockResult {
    blocked: boolean;
    reason?: string;
    violations: Array<{
        type: string;
        severity: string;
        description: string;
    }>;
}
/**
 * Check if governance replay results should block execution.
 * Returns blocked=true if any CRITICAL violation is found.
 */
export declare function checkReplayBlock(warnings: Array<{
    type: string;
    severity: string;
    description: string;
    detail?: string;
}>): GovernanceReplayBlockResult;
//# sourceMappingURL=governance-memory-file.d.ts.map