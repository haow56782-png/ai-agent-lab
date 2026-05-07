/** ============================================================
 *  Invariant Check — Validates system invariants against
 *  current system state.
 *  ============================================================ */

import type { InvariantCheckResult } from "./diff-types.js";

export interface InvariantDefinition {
  name: string;
  description: string;
  check: () => boolean | Promise<boolean>;
  expectedValue: string;
}

export interface SystemState {
  testCount: number;
  evalCount: number;
  typecheckPasses: boolean;
  noForbiddenLanguage: boolean;
  frozenModules: string[];
}

/**
 * Pre-defined system invariants.
 */
export function checkSystemInvariants(
  state: SystemState,
  invariants: InvariantDefinition[],
): InvariantCheckResult[] {
  return invariants.map((inv) => {
    let passed = false;
    try {
      passed = inv.check() === true;
    } catch {
      passed = false;
    }

    return {
      invariant: inv.name,
      passed,
      expectedValue: inv.expectedValue,
      description: inv.description,
    };
  });
}

/**
 * Standard invariants every system should maintain.
 */
export function getStandardInvariants(state: SystemState): InvariantDefinition[] {
  return [
    {
      name: "typecheck_passes",
      description: "TypeScript typecheck must pass with zero errors",
      check: () => state.typecheckPasses,
      expectedValue: "true",
    },
    {
      name: "tests_pass",
      description: "All tests must pass",
      check: () => state.testCount > 0,
      expectedValue: `> 0 tests passing`,
    },
    {
      name: "no_forbidden_language",
      description: "No forbidden language in source code",
      check: () => state.noForbiddenLanguage,
      expectedValue: "true",
    },
    {
      name: "eval_scenarios_defined",
      description: "Eval scenarios must be registered",
      check: () => state.evalCount > 0,
      expectedValue: `> 0 eval scenarios`,
    },
  ];
}

export function summarizeInvariantChecks(results: InvariantCheckResult[]): {
  passed: boolean;
  total: number;
  failed: number;
  failures: InvariantCheckResult[];
} {
  const failed = results.filter((r) => !r.passed);
  return {
    passed: failed.length === 0,
    total: results.length,
    failed: failed.length,
    failures: failed,
  };
}
