/**
 * Drift Replay — Governance drift detection and historical decision replay.
 *
 * Provides 6 replay functions that check proposals against historical
 * governance records, invariant registries, and routing protocols.
 *
 * ============================================================
 *  P3.0 Architecture Memory & Governance Persistence
 * ============================================================ */

import type { CognitiveAdrJson } from "./adr-types.js";
import type { InvariantEntry, InvariantViolation, ViolationReport } from "./invariant-registry.js";
import type { GovernanceMemoryEntry, FreezeSnapshot } from "./governance-memory.js";
import type { RoutingDecisionLog } from "../review/review-types.js";

/* ── Result Types ───────────────────────────────────────── */

export interface DecisionReplayResult {
  adr: CognitiveAdrJson;
  governanceEntries: GovernanceMemoryEntry[];
  touchedInvariants: InvariantEntry[];
  freezeSnapshot: FreezeSnapshot | null;
  supersededBy: DecisionReplayResult | null;
  supersedes: DecisionReplayResult | null;
}

export interface FreezeLineageTransition {
  from: string;
  to: string;
  timestamp: string;
  actor: string;
  reason: string;
}

export interface FreezeLineageResult {
  adrId: string;
  freezeVersion: string;
  transitions: FreezeLineageTransition[];
  finalStatus: "FROZEN" | "THAWED" | "DRAFT";
  thawRecord?: {
    reason: string;
    thawedBy: string;
    timestamp: string;
  };
}

export interface DriftWarning {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  detail: string;
}

/* ── Replay Dependencies ────────────────────────────────── */

export interface DriftReplayDeps {
  getADRById: (id: string) => CognitiveAdrJson | undefined;
  getRelatedADRs: (adrId: string) => CognitiveAdrJson[];
  getEntriesByADRId: (adrId: string) => GovernanceMemoryEntry[];
  getFreezeSnapshotsByADRId: (adrId: string) => FreezeSnapshot[];
  getTouchedInvariants: (invariantIds: string[]) => InvariantEntry[];
  getInvariantById: (id: string) => InvariantEntry | undefined;
  checkInvariantViolation: (adrId: string, invariantIds: string[]) => ViolationReport;
}

/* ── Replay Functions ───────────────────────────────────── */

/**
 * Replay a governance decision by ADR ID. Recursively resolves
 * supersede chains.
 */
export function replayGovernanceDecision(
  adrId: string,
  deps: DriftReplayDeps,
): DecisionReplayResult | null {
  const adr = deps.getADRById(adrId);
  if (!adr) return null;

  const governanceEntries = deps.getEntriesByADRId(adrId);
  const touchedInvariants = deps.getTouchedInvariants(adr.relatedInvariants);
  const freezeSnapshots = deps.getFreezeSnapshotsByADRId(adrId);
  const freezeSnapshot = freezeSnapshots.length > 0 ? freezeSnapshots[freezeSnapshots.length - 1] : null;

  // Find supersede chain
  const relatedADRs = deps.getRelatedADRs(adrId);
  let supersededBy: DecisionReplayResult | null = null;
  let supersedes: DecisionReplayResult | null = null;

  for (const related of relatedADRs) {
    if (related.status === "SUPERSEDED") {
      // Current ADR supersedes this one
      supersedes = replayGovernanceDecision(related.id, deps);
    }
  }

  // Check if any related ADR has this ADR in its relatedADRs with SUPERSEDES
  // meaning this ADR was superseded by another
  for (const related of relatedADRs) {
    if (related.relatedADRs.includes(adrId) && related.status === "ACCEPTED") {
      supersededBy = replayGovernanceDecision(related.id, deps);
      break;
    }
  }

  return {
    adr: { ...adr },
    governanceEntries: governanceEntries.map((e) => ({ ...e })),
    touchedInvariants: touchedInvariants.map((i) => ({ ...i })),
    freezeSnapshot: freezeSnapshot ? { ...freezeSnapshot } : null,
    supersededBy,
    supersedes,
  };
}

/**
 * Replay freeze lineage for an ADR. Traces all transitions
 * and final freeze/thaw status.
 */
export function replayFreezeLineage(
  adrId: string,
  deps: DriftReplayDeps,
): FreezeLineageResult {
  const adr = deps.getADRById(adrId);
  const freezeSnapshots = deps.getFreezeSnapshotsByADRId(adrId);

  const transitions: FreezeLineageTransition[] = [];
  let finalStatus: "FROZEN" | "THAWED" | "DRAFT" = "DRAFT";
  let thawRecord: FreezeLineageResult["thawRecord"];

  for (const snap of freezeSnapshots) {
    transitions.push({
      from: "DRAFT",
      to: "FROZEN",
      timestamp: snap.frozenAt,
      actor: snap.frozenBy,
      reason: `Freeze snapshot ${snap.id} created`,
    });

    if (snap.status === "THAWED") {
      transitions.push({
        from: "FROZEN",
        to: "THAWED",
        timestamp: snap.thawedAt!,
        actor: snap.thawedBy!,
        reason: snap.thawReason ?? "Thawed",
      });
      finalStatus = "THAWED";
      thawRecord = {
        reason: snap.thawReason ?? "Unknown",
        thawedBy: snap.thawedBy ?? "Unknown",
        timestamp: snap.thawedAt ?? snap.frozenAt,
      };
    } else {
      finalStatus = "FROZEN";
    }
  }

  return {
    adrId,
    freezeVersion: adr?.freezeVersion ?? "",
    transitions,
    finalStatus,
    thawRecord,
  };
}

/**
 * Detect historical invariant violations for a proposal.
 * Checks against all 8 default invariants.
 */
export function detectHistoricalInvariantViolation(
  adrId: string,
  proposedInvariants: string[],
  deps: DriftReplayDeps,
): ViolationReport {
  return deps.checkInvariantViolation(adrId, proposedInvariants);
}

/**
 * Detect authority drift in a governance memory entry.
 * Checks arbitration ownership and reviewer model authority.
 */
export function detectAuthorityDrift(
  entry: GovernanceMemoryEntry,
): DriftWarning[] {
  const warnings: DriftWarning[] = [];

  // Rule: Arbitration owner must be claude-opus
  if (entry.arbitrationOwner !== "claude-opus") {
    warnings.push({
      type: "AUTHORITY_DRIFT",
      severity: "CRITICAL",
      description: "Non-Opus arbitration owner",
      detail: `Arbitration owner is '${entry.arbitrationOwner}', must be 'claude-opus'`,
    });
  }

  // Rule: L3 entries must have claude-opus involvement
  if (entry.reviewLevel === "L3" && !entry.reviewerModels.includes("claude-opus")) {
    warnings.push({
      type: "AUTHORITY_DRIFT",
      severity: "HIGH",
      description: "L3 review without claude-opus",
      detail: "L3 review level requires claude-opus in reviewer models",
    });
  }

  // Rule: Mini models cannot be final Freeze Gate reviewer
  if (entry.reviewLevel === "L3") {
    const miniModels = entry.reviewerModels.filter(
      (m) => m.includes("mini") || m.includes("flash"),
    );
    if (miniModels.length > 0) {
      warnings.push({
        type: "AUTHORITY_DRIFT",
        severity: "CRITICAL",
        description: "Mini model in L3 review",
        detail: `Mini/flash models [${miniModels.join(", ")}] cannot be final Freeze Gate reviewer`,
      });
    }
  }

  return warnings;
}

/**
 * Detect routing drift from a RoutingDecisionLog entry.
 */
export function detectRoutingDrift(
  logEntry: RoutingDecisionLog,
): DriftWarning[] {
  const warnings: DriftWarning[] = [];

  // Rule: MINI model cannot be cognitive reviewer
  if (
    logEntry.role === "COGNITIVE_REVIEWER" &&
    logEntry.selectedModel.includes("mini")
  ) {
    warnings.push({
      type: "ROUTING_DRIFT",
      severity: "HIGH",
      description: "Mini model as cognitive reviewer",
      detail: `Model '${logEntry.selectedModel}' used as COGNITIVE_REVIEWER — not allowed for final review`,
    });
  }

  // Rule: Only designated reviewer models for cognitive review
  if (
    logEntry.role === "COGNITIVE_REVIEWER" &&
    (logEntry.selectedModel as string) !== "openai-reviewer"
  ) {
    warnings.push({
      type: "ROUTING_DRIFT",
      severity: "MEDIUM",
      description: "Non-standard cognitive reviewer",
      detail: `Model '${logEntry.selectedModel}' is not the standard cognitive reviewer`,
    });
  }

  // Rule: Architecture governor must be claude-opus
  if (
    logEntry.role === "ARCHITECTURE_GOVERNOR" &&
    logEntry.selectedModel !== "claude-opus"
  ) {
    warnings.push({
      type: "ROUTING_DRIFT",
      severity: "CRITICAL",
      description: "Non-Opus architecture governor",
      detail: `Architecture governor is '${logEntry.selectedModel}', must be 'claude-opus'`,
    });
  }

  return warnings;
}

/**
 * Detect governance/runtime boundary leakage.
 * Checks for cross-boundary contamination between governance
 * and runtime layers.
 */
export function detectGovernanceRuntimeLeakage(
  entry: GovernanceMemoryEntry,
): DriftWarning[] {
  const warnings: DriftWarning[] = [];

  // Rule: Governance entries must not reference runtime secrets
  const secretPatterns = ["api_key", "secret", "token", "password", "credential"];
  for (const field of [entry.decisionId, ...entry.relatedADRIds]) {
    if (secretPatterns.some((p) => field.toLowerCase().includes(p))) {
      warnings.push({
        type: "GOVERNANCE_RUNTIME_LEAKAGE",
        severity: "CRITICAL",
        description: "Secret reference in governance entry",
        detail: `Governance entry references '${field}' which contains secret pattern`,
      });
    }
  }

  // Rule: Freeze version should not reference runtime
  if (entry.freezeVersion && /^runtime-|^exec-/i.test(entry.freezeVersion)) {
    warnings.push({
      type: "GOVERNANCE_RUNTIME_LEAKAGE",
      severity: "HIGH",
      description: "Runtime-prefixed freeze version",
      detail: `Freeze version '${entry.freezeVersion}' uses runtime prefix`,
    });
  }

  return warnings;
}
