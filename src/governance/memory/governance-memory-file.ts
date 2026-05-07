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
import type { GovernanceMemoryEntry, FreezeSnapshot } from "./governance-memory.js";
import type { CognitiveAdrJson } from "./adr-types.js";
import type { InvariantEntry } from "./invariant-registry.js";

/* ── File Format ────────────────────────────────────────── */

export interface GovernanceMemoryPersistedFile {
  version: "1.0";
  createdAt: string;
  entries: GovernanceMemoryEntry[];
  freezeSnapshots: FreezeSnapshot[];
  adrs: CognitiveAdrJson[];
  invariants: InvariantEntry[];
}

/* ── Error Codes ────────────────────────────────────────── */

export type GovernanceMemoryFileErrorCode =
  | "GOVERNANCE_MEMORY_FILE_NOT_FOUND"
  | "GOVERNANCE_REPLAY_BLOCKED"
  | "CONSTITUTIONAL_INVARIANT_VIOLATION"
  | "FREEZE_SNAPSHOT_ALREADY_EXISTS"
  | "ACCEPTED_ADR_IMMUTABLE"
  | "GOVERNANCE_MEMORY_APPEND_ONLY_VIOLATION"
  | "MEMORY_SCHEMA_VALIDATION_FAILED";

export class GovernanceMemoryFileError extends Error {
  code: GovernanceMemoryFileErrorCode;
  details?: Record<string, unknown>;

  constructor(code: GovernanceMemoryFileErrorCode, message: string, details?: Record<string, unknown>) {
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
export function createDeterministicGovernanceId(prefix: string, ...parts: string[]): string {
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
function stableStringify(obj: unknown): string {
  return JSON.stringify(obj, stableSortKeys, 2);
}

function stableSortKeys(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const sorted: Record<string, unknown> = {};
    for (const k of keys) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}

/* ── Load / Save ────────────────────────────────────────── */

export function loadGovernanceMemoryFile(filePath: string): GovernanceMemoryPersistedFile {
  if (!existsSync(filePath)) {
    throw new GovernanceMemoryFileError(
      "GOVERNANCE_MEMORY_FILE_NOT_FOUND",
      `Governance memory file not found: ${filePath}`,
      { filePath },
    );
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // Validate schema
    if (!parsed || parsed.version !== "1.0") {
      throw new GovernanceMemoryFileError(
        "MEMORY_SCHEMA_VALIDATION_FAILED",
        `Invalid governance memory file schema: expected version "1.0", got "${String(parsed?.version ?? "undefined")}"`,
        { filePath, version: parsed?.version },
      );
    }

    return parsed as unknown as GovernanceMemoryPersistedFile;
  } catch (err) {
    if (err instanceof GovernanceMemoryFileError) throw err;
    throw new GovernanceMemoryFileError(
      "MEMORY_SCHEMA_VALIDATION_FAILED",
      `Failed to parse governance memory file: ${err instanceof Error ? err.message : String(err)}`,
      { filePath },
    );
  }
}

export function saveGovernanceMemoryFile(
  filePath: string,
  data: GovernanceMemoryPersistedFile,
): void {
  const json = stableStringify(data);
  writeFileSync(filePath, json, "utf-8");
}

export function createEmptyGovernanceMemoryFile(): GovernanceMemoryPersistedFile {
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
export function appendGovernanceMemoryFileEntry(
  file: GovernanceMemoryPersistedFile,
  entry: GovernanceMemoryEntry,
): void {
  const existing = file.entries.find((e) => e.id === entry.id);
  if (existing) {
    throw new GovernanceMemoryFileError(
      "GOVERNANCE_MEMORY_APPEND_ONLY_VIOLATION",
      `Entry ${entry.id} already exists — append-only, cannot overwrite`,
      { entryId: entry.id },
    );
  }
  file.entries.push(JSON.parse(JSON.stringify(entry)));
}

/**
 * Append a freeze snapshot to the file.
 * Throws FREEZE_SNAPSHOT_ALREADY_EXISTS if same freezeVersion + adrId combo exists.
 */
export function appendFreezeSnapshotToFile(
  file: GovernanceMemoryPersistedFile,
  snapshot: FreezeSnapshot,
): void {
  const existing = file.freezeSnapshots.find(
    (s) => s.freezeVersion === snapshot.freezeVersion && s.adrId === snapshot.adrId,
  );
  if (existing) {
    throw new GovernanceMemoryFileError(
      "FREEZE_SNAPSHOT_ALREADY_EXISTS",
      `Freeze snapshot for ADR ${snapshot.adrId} at version ${snapshot.freezeVersion} already exists — immutable`,
      { adrId: snapshot.adrId, freezeVersion: snapshot.freezeVersion },
    );
  }
  file.freezeSnapshots.push(JSON.parse(JSON.stringify(snapshot)));
}

/**
 * Append an ADR to the file.
 * Throws ACCEPTED_ADR_IMMUTABLE if ADR with same ID already exists.
 */
export function appendADRToFile(
  file: GovernanceMemoryPersistedFile,
  adr: CognitiveAdrJson,
): void {
  const existing = file.adrs.find((a) => a.id === adr.id);
  if (existing) {
    throw new GovernanceMemoryFileError(
      "ACCEPTED_ADR_IMMUTABLE",
      `ADR ${adr.id} already exists — accepted ADRs are immutable`,
      { adrId: adr.id },
    );
  }
  file.adrs.push(JSON.parse(JSON.stringify(adr)));
}

/* ── Replay Block Check ──────────────────────────────────── */

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
export function checkReplayBlock(
  warnings: Array<{ type: string; severity: string; description: string; detail?: string }>,
): GovernanceReplayBlockResult {
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
