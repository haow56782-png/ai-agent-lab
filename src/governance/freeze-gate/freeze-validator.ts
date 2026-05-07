/** ============================================================
 *  Freeze Validator — Checks freeze conditions against ADR.
 *
 *  Verifies that module boundaries, interfaces, invariants,
 *  and acceptance criteria are fully defined before freeze.
 *  ============================================================ */

import type { FreezeValidatorInput, ArchitectureDecisionRecordImport } from "./types.js";

export interface FreezeValidationResult {
  passed: boolean;
  checks: FreezeCheckResult[];
}

export interface FreezeCheckResult {
  name: string;
  passed: boolean;
  required: boolean;
  detail: string;
}

export function validateFreezeConditions(input: FreezeValidatorInput): FreezeValidationResult {
  const checks: FreezeCheckResult[] = [];

  // 1. ADR must be valid
  checks.push({
    name: "ADR status is draft or final",
    passed: input.adr.metadata.status === "draft" || input.adr.metadata.status === "final",
    required: true,
    detail: `ADR status: ${input.adr.metadata.status}`,
  });

  // 2. Module boundaries defined
  checks.push({
    name: "Module boundaries defined",
    passed: input.moduleBoundaries.length > 0,
    required: true,
    detail: input.moduleBoundaries.length > 0
      ? `${input.moduleBoundaries.length} boundaries defined`
      : "No module boundaries specified",
  });

  // 3. Interfaces defined
  checks.push({
    name: "Interfaces defined",
    passed: input.interfaces.length > 0,
    required: true,
    detail: input.interfaces.length > 0
      ? `${input.interfaces.length} interfaces defined`
      : "No interfaces specified",
  });

  // 4. Invariants defined
  checks.push({
    name: "Invariants defined",
    passed: input.invariants.length > 0,
    required: false,
    detail: input.invariants.length > 0
      ? `${input.invariants.length} invariants`
      : "No invariants (optional)",
  });

  // 5. Acceptance criteria defined
  checks.push({
    name: "Acceptance criteria defined",
    passed: input.acceptanceCriteria.length > 0,
    required: true,
    detail: input.acceptanceCriteria.length > 0
      ? `${input.acceptanceCriteria.length} criteria defined`
      : "No acceptance criteria",
  });

  // 6. ADR completeness
  checks.push({
    name: "ADR has context",
    passed: input.adr.context.length > 0,
    required: true,
    detail: input.adr.context.length > 0 ? "Context provided" : "Missing context",
  });

  checks.push({
    name: "ADR has decision",
    passed: input.adr.decision.length > 0,
    required: true,
    detail: input.adr.decision.length > 0 ? "Decision provided" : "Missing decision",
  });

  // 7. Title is set
  checks.push({
    name: "ADR has title",
    passed: input.adr.metadata.title.length > 0,
    required: true,
    detail: input.adr.metadata.title.length > 0 ? `Title: ${input.adr.metadata.title}` : "Missing title",
  });

  const passed = checks.every((c) => !c.required || c.passed);

  return { passed, checks };
}
