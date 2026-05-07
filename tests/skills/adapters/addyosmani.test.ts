import { describe, it, expect } from "vitest";
import {
  vibToAddyosmani,
  addyosmaniToVib,
} from "../../../src/skills/adapters/addyosmani.js";
import type { VibCapability } from "../../../src/skills/adapters/types.js";

/* ─── Fixtures ─── */

const FULL_VIB: VibCapability = {
  name: "Context Engineering",
  description: "Controls how agents use context to prevent drift.",
  category: "protocol",
  version: "0.2.0",
  owner: "platform-team",
  inputs: [
    { name: "user_intent", type: "string", required: true, description: "Core intent" },
    { name: "constraints", type: "array", required: false, description: "Constraints" },
  ],
  outputs: [
    { name: "context_summary", type: "object", description: "Summary", alwaysPresent: true },
  ],
  tools: [
    { name: "read", purpose: "Read references", required: true },
    { name: "grep", purpose: "Search codebase", required: false },
  ],
  verification: [
    { id: "gate-checked", description: "Context checked", type: "existence", severity: "critical" },
  ],
  failure_modes: [
    { when: "Missing context", code: "MISSING_CTX", recoverable: true, recovery: "Ask user" },
  ],
  fallback: { strategy: "degrade", plan: "Use local rules" },
  handoff: [{ to: "verification-gate", when: "done", payload: "summary" }],
  cost_tracking: { estimatedTokens: 1500, estimatedTimeMs: 2000 },
};

const MINIMAL_VIB: VibCapability = {
  name: "minimal",
  description: "A minimal skill. Use when testing.",
  category: "process",
  version: "0.1.0",
  inputs: [],
  outputs: [],
  tools: [],
  verification: [],
  failure_modes: [],
};

/* ════════════════════════════════════════════════════════════
   VIB → addyosmani
   ════════════════════════════════════════════════════════════ */

describe("vibToAddyosmani", () => {
  it("maps name and description from a full VIB capability", () => {
    const result = vibToAddyosmani(FULL_VIB);
    expect(result.success).toBe(true);
    expect(result.data.name).toBe("context-engineering");
    expect(result.data.description).toContain("Use when...");
  });

  it("emits warnings for populated fields that have no addyosmani equivalent", () => {
    const result = vibToAddyosmani(FULL_VIB);
    const fields = result.warnings.map((w) => w.field);
    // Name + description warnings (normalization / Use when appended)
    expect(fields).toContain("name");
    expect(fields).toContain("description");
    // Populated unmapped VIB fields
    expect(fields).toContain("category");
    expect(fields).toContain("version");
    expect(fields).toContain("owner");
    expect(fields).toContain("inputs");
    expect(fields).toContain("outputs");
    expect(fields).toContain("tools");
    expect(fields).toContain("verification");
    expect(fields).toContain("failure_modes");
    expect(fields).toContain("fallback");
    expect(fields).toContain("handoff");
    expect(fields).toContain("cost_tracking");
    // Unset optionals do NOT generate warnings
    expect(fields).not.toContain("memory");
    expect(fields).not.toContain("workflow");
  });

  it("does not warn about empty arrays or undefined optionals", () => {
    const result = vibToAddyosmani(MINIMAL_VIB);
    const fields = result.warnings.map((w) => w.field);
    // Empty arrays do NOT generate warnings
    expect(fields).not.toContain("inputs");
    expect(fields).not.toContain("outputs");
    expect(fields).not.toContain("tools");
    expect(fields).not.toContain("verification");
    expect(fields).not.toContain("failure_modes");
    // Undefined optionals do NOT generate warnings
    expect(fields).not.toContain("memory");
    expect(fields).not.toContain("workflow");
    expect(fields).not.toContain("fallback");
    expect(fields).not.toContain("handoff");
    expect(fields).not.toContain("cost_tracking");
    // category + version ARE populated strings → generate warnings
    expect(fields).toContain("category");
    expect(fields).toContain("version");
  });

  it("normalizes name to lowercase hyphenated and warns", () => {
    const result = vibToAddyosmani(FULL_VIB);
    expect(result.data.name).toBe("context-engineering");
    expect(result.warnings.some((w) => w.field === "name")).toBe(true);
  });

  it("does not modify an already-normalized name", () => {
    const result = vibToAddyosmani(MINIMAL_VIB);
    expect(result.data.name).toBe("minimal");
    expect(result.warnings.some((w) => w.field === "name")).toBe(false);
  });

  it("appends 'Use when...' to description missing it and warns", () => {
    const result = vibToAddyosmani(FULL_VIB);
    expect(result.data.description).toMatch(/Use when\.\.\./);
    expect(result.warnings.some((w) => w.field === "description")).toBe(true);
  });

  it("does not modify description that already has 'Use when'", () => {
    const withUseWhen: VibCapability = {
      ...MINIMAL_VIB,
      description: "Do X. Use when building features.",
    };
    const result = vibToAddyosmani(withUseWhen);
    expect(result.data.description).toBe("Do X. Use when building features.");
    expect(result.warnings.some((w) => w.field === "description")).toBe(false);
  });

  it("handles whitespace edge cases", () => {
    const vib: VibCapability = {
      ...MINIMAL_VIB,
      name: "  My Skill  ",
      description: "  Do something  ",
    };
    const result = vibToAddyosmani(vib);
    expect(result.data.name).toBe("my-skill");
    expect(result.data.description).toMatch(/^Do something/);
  });

  it("returns success: true even with warnings", () => {
    const result = vibToAddyosmani(FULL_VIB);
    expect(result.success).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════
   addyosmani → VIB
   ════════════════════════════════════════════════════════════ */

describe("addyosmaniToVib", () => {
  it("fills a minimal addyosmani skill into a full VIB capability", () => {
    const result = addyosmaniToVib({
      name: "test-driven-development",
      description: "TDD workflow. Use when building features test-first.",
    });

    expect(result.success).toBe(true);
    expect(result.data.name).toBe("test-driven-development");
    expect(result.data.description).toBe("TDD workflow. Use when building features test-first.");

    // Defaults
    expect(result.data.category).toBe("process");
    expect(result.data.version).toBe("0.1.0");
    expect(result.data.owner).toBe("community");

    // Empty arrays
    expect(result.data.inputs).toEqual([]);
    expect(result.data.outputs).toEqual([]);
    expect(result.data.tools).toEqual([]);
    expect(result.data.verification).toEqual([]);
    expect(result.data.failure_modes).toEqual([]);

    // Omitted optionals
    expect(result.data.memory).toBeUndefined();
    expect(result.data.workflow).toBeUndefined();
    expect(result.data.fallback).toBeUndefined();
    expect(result.data.handoff).toBeUndefined();
    expect(result.data.cost_tracking).toBeUndefined();
  });

  it("emits 13 warnings for all synthesized fields", () => {
    const result = addyosmaniToVib({
      name: "foo",
      description: "Bar. Use when needed.",
    });
    expect(result.warnings.length).toBe(13);
  });

  it("trims whitespace on name and description", () => {
    const result = addyosmaniToVib({
      name: "  spaced-name  ",
      description: "  Spaced desc. Use when.  ",
    });
    expect(result.data.name).toBe("spaced-name");
    expect(result.data.description).toBe("Spaced desc. Use when.");
  });
});

/* ════════════════════════════════════════════════════════════
   Round-trip
   ════════════════════════════════════════════════════════════ */

describe("round-trip (VIB → addyosmani → VIB)", () => {
  it("preserves name and description through the full cycle", () => {
    const first = vibToAddyosmani(FULL_VIB);

    const second = addyosmaniToVib(first.data);

    expect(second.data.name).toBe(first.data.name);
    expect(second.data.description).toBe(first.data.description);
  });

  it("generates warnings on both conversion legs", () => {
    const first = vibToAddyosmani(FULL_VIB);
    expect(first.warnings.length).toBeGreaterThan(0);

    const second = addyosmaniToVib(first.data);
    expect(second.warnings.length).toBeGreaterThan(0);
  });
});

/* ════════════════════════════════════════════════════════════
   TypeScript type safety
   ════════════════════════════════════════════════════════════ */

describe("type safety", () => {
  it("vibToAddyosmani returns typed AddyosmaniSkill data", () => {
    const result = vibToAddyosmani(MINIMAL_VIB);
    // Access fields specific to AddyosmaniSkill without cast
    const n: string = result.data.name;
    const d: string = result.data.description;
    expect(typeof n).toBe("string");
    expect(typeof d).toBe("string");
  });

  it("addyosmaniToVib returns typed VibCapability data", () => {
    const result = addyosmaniToVib({ name: "x", description: "y. Use when." });
    const c: string = result.data.category;
    const v: string = result.data.version;
    expect(typeof c).toBe("string");
    expect(typeof v).toBe("string");
  });
});
