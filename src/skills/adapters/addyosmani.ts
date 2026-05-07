/** ============================================================
 *  VIB Capability Protocol v0.1 ↔ addyosmani/agent-skills
 *  — Bidirectional adapter
 *  ============================================================
 *
 *  VIB  uses  a 15-field YAML frontmatter  schema (Capability Protocol).
 *  addyosmani/agent-skills uses a 2-field minimal schema (name + description).
 *  This module converts between them,  emitting non-critical warnings for
 *  fields that have no equivalent in the target format.
 *
 *  Usage:
 *    import { vibToAddyosmani, addyosmaniToVib } from "./addyosmani.js";
 *    const result = vibToAddyosmani(myVibSkill);
 *    console.log(result.warnings);  // 13 unmapped-field warnings
 */

import type {
  AddyosmaniSkill,
  VibCapability,
  ConversionResult,
  UnmappedFieldWarning,
} from "./types.js";

/* ─── Helper ─── */

/** True when val is a defined, non-empty value that would be meaningful to report. */
function hasValue(val: unknown): boolean {
  if (val === undefined || val === null) return false;
  if (typeof val === "string") return val.length > 0;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.keys(val).length > 0;
  return true; // numbers, booleans
}

/* ─── VIB → addyosmani ─── */

const UNMAPPED_VIB_FIELDS: (keyof VibCapability)[] = [
  "category",
  "version",
  "owner",
  "inputs",
  "outputs",
  "tools",
  "memory",
  "workflow",
  "verification",
  "failure_modes",
  "fallback",
  "handoff",
  "cost_tracking",
];

/**
 * Convert a full VIB 15-field Capability Protocol skill to addyosmani's
 * 2-field minimal format.  Fields without an addyosmani equivalent are
 * dropped and reported as non-critical warnings.
 */
export function vibToAddyosmani(vib: VibCapability): ConversionResult<AddyosmaniSkill> {
  const warnings: UnmappedFieldWarning[] = [];

  /* ── name ── */
  let name = vib.name.trim();
  const normalizedName = name.toLowerCase().replace(/\s+/g, "-");
  if (normalizedName !== name) {
    warnings.push({
      field: "name",
      reason: `normalized to "${normalizedName}" (addyosmani convention: lowercase, hyphen-separated)`,
    });
    name = normalizedName;
  }

  /* ── description ── */
  let description = vib.description.trim();
  if (!/use when/i.test(description)) {
    const suffix = description.endsWith(".") ? " Use when..." : ". Use when...";
    description += suffix;
    warnings.push({
      field: "description",
      reason: `appended "Use when..." usage guidance (addyosmani convention)`,
    });
  }

  /* ── unmapped VIB fields ── */
  for (const field of UNMAPPED_VIB_FIELDS) {
    const val = vib[field];
    if (hasValue(val)) {
      warnings.push({
        field,
        reason: `no addyosmani equivalent; dropped`,
      });
    }
  }

  return {
    success: true, // warnings are informational
    data: { name, description } satisfies AddyosmaniSkill,
    warnings,
  };
}

/* ─── addyosmani → VIB ─── */

/**
 * Populated as defaults when an addyosmani skill is promoted to VIB format.
 * All fields in this list generate warnings during conversion.
 */
const ADDY_DEFAULTS: Record<string, unknown> = {
  category: "process",
  version: "0.1.0",
  owner: "community",
};

const ADDY_DEFAULT_ARRAYS: (keyof VibCapability)[] = [
  "inputs",
  "outputs",
  "tools",
  "verification",
  "failure_modes",
];

const ADDY_OMITTED_OPTIONAL: (keyof VibCapability)[] = [
  "memory",
  "workflow",
  "fallback",
  "handoff",
  "cost_tracking",
];

/**
 * Convert an addyosmani 2-field minimal skill to VIB's 15-field Capability
 * Protocol format. Missing fields are filled with sensible defaults and
 * reported as non-critical warnings.
 */
export function addyosmaniToVib(skill: AddyosmaniSkill): ConversionResult<VibCapability> {
  const warnings: UnmappedFieldWarning[] = [];

  const data: VibCapability = {
    /* core — direct copy */
    name: skill.name.trim(),
    description: skill.description.trim(),

    /* defaults with warnings */
    category: ADDY_DEFAULTS.category as string,
    version: ADDY_DEFAULTS.version as string,
    owner: ADDY_DEFAULTS.owner as string,

    /* empty arrays */
    inputs: [],
    outputs: [],
    tools: [],
    verification: [],
    failure_modes: [],

    /* omitted */
    memory: undefined,
    workflow: undefined,
    fallback: undefined,
    handoff: undefined,
    cost_tracking: undefined,
  };

  /* warnings for synthetic fields */
  for (const [field, value] of Object.entries(ADDY_DEFAULTS)) {
    warnings.push({
      field,
      reason: `synthesized default: "${String(value)}" (no addyosmani equivalent)`,
    });
  }
  for (const field of ADDY_DEFAULT_ARRAYS) {
    warnings.push({
      field,
      reason: `synthesized default: [] (no addyosmani equivalent)`,
    });
  }
  for (const field of ADDY_OMITTED_OPTIONAL) {
    warnings.push({
      field,
      reason: `omitted (optional; no addyosmani equivalent)`,
    });
  }

  return {
    success: true,
    data,
    warnings,
  };
}

/* ─── Standalone smoke-test when run directly ─── */

if (import.meta.url === `file://${process.argv[1]}`) {
  const vib: VibCapability = {
    name: "Context Engineering",
    description: "Controls how agents use context to prevent drift.",
    category: "protocol",
    version: "0.2.0",
    owner: "platform-team",
    inputs: [
      { name: "user_intent", type: "string", required: true, description: "Core intent" },
    ],
    outputs: [
      { name: "context_summary", type: "object", description: "Summary", alwaysPresent: true },
    ],
    tools: [{ name: "read", purpose: "Read files", required: true }],
    verification: [
      { id: "gate-context-checked", description: "Context checked", type: "existence", severity: "critical" },
    ],
    failure_modes: [
      { when: "Missing context", code: "MISSING_CTX", recoverable: true, recovery: "Ask user" },
    ],
    fallback: { strategy: "degrade", plan: "Use local rules" },
    handoff: [{ to: "verification-gate", when: "done", payload: "summary" }],
    cost_tracking: { estimatedTokens: 1500, estimatedTimeMs: 2000 },
  };

  console.log("=== VIB → addyosmani ===");
  const r1 = vibToAddyosmani(vib);
  console.log("  success:", r1.success);
  console.log("  data:", JSON.stringify(r1.data, null, 2));
  console.log("  warnings:", r1.warnings.length);

  console.log("\n=== addyosmani → VIB ===");
  const r2 = addyosmaniToVib({ name: "test-driven-development", description: "TDD workflow. Use when building features test-first." });
  console.log("  success:", r2.success);
  console.log("  name:", r2.data.name);
  console.log("  category:", r2.data.category);
  console.log("  version:", r2.data.version);
  console.log("  warnings:", r2.warnings.length);
}
