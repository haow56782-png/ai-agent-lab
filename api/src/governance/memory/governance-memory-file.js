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
import { readFileSync, writeFileSync, existsSync } from "node:fs";
export class GovernanceMemoryFileError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.name = "GovernanceMemoryFileError";
        this.code = code;
        this.details = details;
    }
}
/* ── Deterministic ID generation ────────────────────────── */
/**
 * Create a deterministic governance ID from input content.
 * Uses FNV-1a hash of the concatenated input fields.
 */
export function createDeterministicGovernanceId(prefix, ...parts) {
    let hash = 0x811c9dc5;
    const input = parts.join("|");
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    const hex = (hash >>> 0).toString(16).padStart(8, "0");
    return `${prefix}-${hex}`;
}
/* ── Stable JSON ────────────────────────────────────────── */
/**
 * Stable JSON stringify with sorted keys for deterministic output.
 */
function stableStringify(obj) {
    return JSON.stringify(obj, stableSortKeys, 2);
}
function stableSortKeys(_key, value) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        const keys = Object.keys(value).sort();
        const sorted = {};
        for (const k of keys) {
            sorted[k] = value[k];
        }
        return sorted;
    }
    return value;
}
/* ── Load / Save ────────────────────────────────────────── */
export function loadGovernanceMemoryFile(filePath) {
    if (!existsSync(filePath)) {
        throw new GovernanceMemoryFileError("GOVERNANCE_MEMORY_FILE_NOT_FOUND", `Governance memory file not found: ${filePath}`, { filePath });
    }
    try {
        const raw = readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        // Validate schema
        if (!parsed || parsed.version !== "1.0") {
            throw new GovernanceMemoryFileError("MEMORY_SCHEMA_VALIDATION_FAILED", `Invalid governance memory file schema: expected version "1.0", got "${String(parsed?.version ?? "undefined")}"`, { filePath, version: parsed?.version });
        }
        return parsed;
    }
    catch (err) {
        if (err instanceof GovernanceMemoryFileError)
            throw err;
        throw new GovernanceMemoryFileError("MEMORY_SCHEMA_VALIDATION_FAILED", `Failed to parse governance memory file: ${err instanceof Error ? err.message : String(err)}`, { filePath });
    }
}
export function saveGovernanceMemoryFile(filePath, data) {
    const json = stableStringify(data);
    writeFileSync(filePath, json, "utf-8");
}
export function createEmptyGovernanceMemoryFile() {
    return {
        version: "1.0",
        createdAt: new Date().toISOString(),
        entries: [],
        freezeSnapshots: [],
        adrs: [],
        invariants: [],
    };
}
/* ── Append Operations ──────────────────────────────────── */
/**
 * Append a governance memory entry to the file.
 * Throws APPEND_ONLY_VIOLATION if entry ID already exists.
 */
export function appendGovernanceMemoryFileEntry(file, entry) {
    const existing = file.entries.find((e) => e.id === entry.id);
    if (existing) {
        throw new GovernanceMemoryFileError("GOVERNANCE_MEMORY_APPEND_ONLY_VIOLATION", `Entry ${entry.id} already exists — append-only, cannot overwrite`, { entryId: entry.id });
    }
    file.entries.push(JSON.parse(JSON.stringify(entry)));
}
/**
 * Append a freeze snapshot to the file.
 * Throws FREEZE_SNAPSHOT_ALREADY_EXISTS if same freezeVersion + adrId combo exists.
 */
export function appendFreezeSnapshotToFile(file, snapshot) {
    const existing = file.freezeSnapshots.find((s) => s.freezeVersion === snapshot.freezeVersion && s.adrId === snapshot.adrId);
    if (existing) {
        throw new GovernanceMemoryFileError("FREEZE_SNAPSHOT_ALREADY_EXISTS", `Freeze snapshot for ADR ${snapshot.adrId} at version ${snapshot.freezeVersion} already exists — immutable`, { adrId: snapshot.adrId, freezeVersion: snapshot.freezeVersion });
    }
    file.freezeSnapshots.push(JSON.parse(JSON.stringify(snapshot)));
}
/**
 * Append an ADR to the file.
 * Throws ACCEPTED_ADR_IMMUTABLE if ADR with same ID already exists.
 */
export function appendADRToFile(file, adr) {
    const existing = file.adrs.find((a) => a.id === adr.id);
    if (existing) {
        throw new GovernanceMemoryFileError("ACCEPTED_ADR_IMMUTABLE", `ADR ${adr.id} already exists — accepted ADRs are immutable`, { adrId: adr.id });
    }
    file.adrs.push(JSON.parse(JSON.stringify(adr)));
}
/**
 * Check if governance replay results should block execution.
 * Returns blocked=true if any CRITICAL violation is found.
 */
export function checkReplayBlock(warnings) {
    const critical = warnings.filter((w) => w.severity === "CRITICAL");
    if (critical.length > 0) {
        return {
            blocked: true,
            reason: `CRITICAL governance violations detected: ${critical.map((c) => c.description).join("; ")}`,
            violations: critical.map((c) => ({ type: c.type, severity: c.severity, description: c.description })),
        };
    }
    return { blocked: false, violations: [] };
}
//# sourceMappingURL=governance-memory-file.js.map