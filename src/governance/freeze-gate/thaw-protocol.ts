/** ============================================================
 *  Thaw Protocol — Controlled architecture freeze release.
 *
 *  Thawing requires recorded reason and creates a new DRAFT
 *  cycle. The frozen state is preserved in history.
 *  ============================================================ */

import type { FreezeGateEntry, FreezeEvent } from "./types.js";
import { transitionFreeze } from "./freeze-state-machine.js";

export interface ThawRequest {
  reason: string;
  actor: string;
  evidence?: string;
  affectedInterfaces: string[];
  plannedChanges: string[];
  riskAssessment: "low" | "medium" | "high";
  requiresReFreeze: boolean;
}

export interface ThawResult {
  previousFrozen: FreezeGateEntry;
  thawedEntry: FreezeGateEntry;
  thawRequest: ThawRequest;
  timestamp: string;
}

export function initiateThaw(
  entry: FreezeGateEntry,
  request: ThawRequest,
): ThawResult {
  if (entry.state !== "FROZEN") {
    throw new Error(`Cannot thaw: entry is in state "${entry.state}", expected "FROZEN"`);
  }

  if (!request.reason.trim()) {
    throw new Error("Thaw reason is required");
  }

  if (request.affectedInterfaces.length === 0 && request.riskAssessment !== "low") {
    throw new Error("Affected interfaces must be specified for medium/high risk thaws");
  }

  const previousFrozen = { ...entry };
  const thawedEntry = transitionFreeze(
    entry,
    "THAW",
    request.actor,
    request.reason,
    request.evidence,
  );

  return {
    previousFrozen,
    thawedEntry,
    thawRequest: request,
    timestamp: new Date().toISOString(),
  };
}

export function canThawWithoutReview(request: ThawRequest): boolean {
  return request.riskAssessment === "low" && request.affectedInterfaces.length === 0;
}

export function generateThawReport(result: ThawResult): string {
  const lines = [
    `# Architecture Thaw Report`,
    `**ADR**: ${result.thawedEntry.adrId}`,
    `**Thawed by**: ${result.thawRequest.actor}`,
    `**Timestamp**: ${result.timestamp}`,
    `**Reason**: ${result.thawRequest.reason}`,
    `**Risk Assessment**: ${result.thawRequest.riskAssessment}`,
    `**Requires Re-Freeze**: ${result.thawRequest.requiresReFreeze ? "Yes" : "No"}`,
    ``,
    `## Affected Interfaces`,
    ...result.thawRequest.affectedInterfaces.map((i) => `- ${i}`),
    ``,
    `## Planned Changes`,
    ...result.thawRequest.plannedChanges.map((c) => `- ${c}`),
    ``,
    `## Freeze History`,
    ...result.thawedEntry.history.map(
      (h: FreezeEvent) => `- ${h.from} → ${h.to} (${h.reason})`,
    ),
  ];

  return lines.join("\n");
}
