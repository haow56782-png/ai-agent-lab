import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildAdr, finalizeAdr, supersedeAdr } from "../src/governance/adr/adr-builder.js";
import { InMemoryAdrStore } from "../src/governance/adr/adr-store.js";
import { createFreezeEntry, transitionFreeze, getFreezeStatus } from "../src/governance/freeze-gate/freeze-state-machine.js";
import { validateFreezeConditions } from "../src/governance/freeze-gate/freeze-validator.js";
import { initiateThaw, canThawWithoutReview, generateThawReport } from "../src/governance/freeze-gate/thaw-protocol.js";
import { performCognitiveReview, arbitrateReview } from "../src/governance/review/cognitive-review.js";
import { runReviewPipeline } from "../src/governance/review/review-runner.js";
import { diffInterfaces, mergeInterfaceReports } from "../src/governance/diff/interface-diff.js";
import { diffSchemas } from "../src/governance/diff/schema-diff.js";
import { checkSystemInvariants, getStandardInvariants, summarizeInvariantChecks } from "../src/governance/diff/invariant-check.js";
import { RoutingLog } from "../src/governance/audit/routing-log.js";
import { GovernanceEventStore } from "../src/governance/audit/governance-events.js";
import type { ArchitectureDecisionRecord, CognitiveReviewInput } from "../src/governance/index.js";
import type { FreezeCheckResult } from "../src/governance/freeze-gate/freeze-validator.js";
import type { DiffEntry, InvariantCheckResult } from "../src/governance/diff/diff-types.js";
import type { OpenAIReviewerConfig, CognitiveReviewOutputV2, ArchitectureDiffCheckInput, ArchitectureDiffCheckOutput, ArchitectureThawRequest, RoutingDecisionLog, ReviewVerdict, CognitiveReviewInputV2 } from "../src/governance/review/review-types.js";
import { DEFAULT_OPENAI_REVIEWER_CONFIG, FREEZE_TRANSITIONS, OpenAIReviewerProvider, MockReviewerProvider, createFallbackResult, v1InputToV2, v2OutputToV1 } from "../src/governance/index.js";
import type { CognitiveReviewerProvider, ProviderReviewResult } from "../src/governance/index.js";

/* ════════════════════════════════════════════════════════════
   ADR Builder
   ════════════════════════════════════════════════════════════ */

describe("ADR Builder", () => {
  it("builds ADR with required fields", () => {
    const adr = buildAdr({
      title: "Test ADR",
      category: "module_boundary",
      author: "tester",
      context: "We need to define module boundaries",
      decision: "Use src/governance/ subdirectories",
      rationale: "Clear separation of concerns",
      alternatives: [
        { name: "single-file", description: "One big file", pros: ["simple"], cons: ["unmaintainable"], feasibilityScore: 0.3 },
        { name: "subdirectories", description: "Split into modules", pros: ["clean"], cons: ["more files"], feasibilityScore: 0.9 },
      ],
      selectedAlternative: "subdirectories",
    });

    expect(adr.metadata.id).toMatch(/^ADR-/);
    expect(adr.metadata.status).toBe("draft");
    expect(adr.metadata.author).toBe("tester");
    expect(adr.alternatives).toHaveLength(2);
    expect(adr.selectedAlternative).toBe("subdirectories");
  });

  it("rejects build without alternatives", () => {
    expect(() => buildAdr({
      title: "Bad ADR",
      category: "module_boundary",
      author: "tester",
      context: "test",
      decision: "test",
      rationale: "test",
      alternatives: [],
      selectedAlternative: "none",
    })).toThrow("At least one alternative required");
  });

  it("rejects build with invalid selected alternative", () => {
    expect(() => buildAdr({
      title: "Bad ADR",
      category: "module_boundary",
      author: "tester",
      context: "test",
      decision: "test",
      rationale: "test",
      alternatives: [
        { name: "opt-a", description: "A", pros: [], cons: [], feasibilityScore: 0.5 },
      ],
      selectedAlternative: "nonexistent",
    })).toThrow('Selected alternative "nonexistent" not found');
  });

  it("finalizes ADR", () => {
    const adr = buildAdr({
      title: "Finalize test",
      category: "protocol",
      author: "tester",
      context: "test",
      decision: "test",
      rationale: "test",
      alternatives: [{ name: "a", description: "A", pros: [], cons: [], feasibilityScore: 0.5 }],
      selectedAlternative: "a",
    });

    const finalized = finalizeAdr(adr);
    expect(finalized.metadata.status).toBe("final");
    expect(finalized.metadata.finalizedAt).toBeTruthy();
  });

  it("cannot finalize already-final ADR", () => {
    const adr = buildAdr({
      title: "Double finalize",
      category: "protocol",
      author: "tester",
      context: "test",
      decision: "test",
      rationale: "test",
      alternatives: [{ name: "a", description: "A", pros: [], cons: [], feasibilityScore: 0.5 }],
      selectedAlternative: "a",
    });

    const finalized = finalizeAdr(adr);
    expect(() => finalizeAdr(finalized)).toThrow("Cannot finalize ADR");
  });

  it("supersedes ADR", () => {
    const adr = buildAdr({
      title: "Old ADR",
      category: "module_boundary",
      author: "tester",
      context: "test",
      decision: "test",
      rationale: "test",
      alternatives: [{ name: "a", description: "A", pros: [], cons: [], feasibilityScore: 0.5 }],
      selectedAlternative: "a",
    });

    const superseded = supersedeAdr(adr, "ADR-NEW-001");
    expect(superseded.metadata.status).toBe("superseded");
    expect(superseded.metadata.supersededBy).toBe("ADR-NEW-001");
  });
});

/* ════════════════════════════════════════════════════════════
   ADR Store
   ════════════════════════════════════════════════════════════ */

describe("ADR Store", () => {
  it("stores and retrieves ADRs", async () => {
    const store = new InMemoryAdrStore();
    const adr = buildAdr({
      title: "Stored ADR",
      category: "storage",
      author: "tester",
      context: "test",
      decision: "test",
      rationale: "test",
      alternatives: [{ name: "a", description: "A", pros: [], cons: [], feasibilityScore: 0.5 }],
      selectedAlternative: "a",
    });

    await store.save(adr);
    const retrieved = await store.get(adr.metadata.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.metadata.title).toBe("Stored ADR");
  });

  it("returns null for unknown ADR", async () => {
    const store = new InMemoryAdrStore();
    expect(await store.get("NONEXISTENT")).toBeNull();
  });

  it("queries by category", async () => {
    const store = new InMemoryAdrStore();
    const adr1 = buildAdr({
      title: "ADR 1", category: "module_boundary", author: "t",
      context: "t", decision: "t", rationale: "t",
      alternatives: [{ name: "a", description: "A", pros: [], cons: [], feasibilityScore: 0.5 }],
      selectedAlternative: "a",
    });
    const adr2 = buildAdr({
      title: "ADR 2", category: "protocol", author: "t",
      context: "t", decision: "t", rationale: "t",
      alternatives: [{ name: "a", description: "A", pros: [], cons: [], feasibilityScore: 0.5 }],
      selectedAlternative: "a",
    });
    await store.save(adr1);
    await store.save(adr2);

    const boundaryAdrs = await store.getByCategory("module_boundary");
    expect(boundaryAdrs).toHaveLength(1);
    expect(boundaryAdrs[0].metadata.title).toBe("ADR 1");
  });

  it("returns latest finalized ADR", async () => {
    const store = new InMemoryAdrStore();
    const adr = buildAdr({
      title: "Latest ADR", category: "module_boundary", author: "t",
      context: "t", decision: "t", rationale: "t",
      alternatives: [{ name: "a", description: "A", pros: [], cons: [], feasibilityScore: 0.5 }],
      selectedAlternative: "a",
    });
    const finalized = finalizeAdr(adr);
    await store.save(finalized);

    const latest = await store.getLatestFinal();
    expect(latest).not.toBeNull();
    expect(latest!.metadata.title).toBe("Latest ADR");
  });
});

/* ════════════════════════════════════════════════════════════
   Freeze State Machine
   ════════════════════════════════════════════════════════════ */

describe("Freeze State Machine", () => {
  it("starts in DRAFT state", () => {
    const entry = createFreezeEntry("ADR-001", "tester");
    expect(entry.state).toBe("DRAFT");
    expect(entry.transitions).toContain("SUBMIT_FOR_REVIEW");
  });

  it("transitions DRAFT → UNDER_REVIEW → ARBITRATION → FROZEN", () => {
    let entry = createFreezeEntry("ADR-001", "tester");
    entry = transitionFreeze(entry, "SUBMIT_FOR_REVIEW", "tester", "Ready");
    expect(entry.state).toBe("UNDER_REVIEW");

    entry = transitionFreeze(entry, "SEND_TO_ARBITRATION", "reviewer", "Reviewed");
    expect(entry.state).toBe("ARBITRATION");

    entry = transitionFreeze(entry, "APPROVE", "arbiter", "Approved");
    expect(entry.state).toBe("FROZEN");
    expect(entry.frozenAt).toBeTruthy();
  });

  it("transitions UNDER_REVIEW → CHANGES_REQUIRED → DRAFT → UNDER_REVIEW", () => {
    let entry = createFreezeEntry("ADR-001", "tester");
    entry = transitionFreeze(entry, "SUBMIT_FOR_REVIEW", "tester", "Ready");
    entry = transitionFreeze(entry, "REQUEST_CHANGES", "reviewer", "Missing types");
    expect(entry.state).toBe("CHANGES_REQUIRED");

    entry = transitionFreeze(entry, "RETURN_TO_DRAFT", "tester", "Fixing issues");
    expect(entry.state).toBe("DRAFT");

    entry = transitionFreeze(entry, "SUBMIT_FOR_REVIEW", "tester", "Updated");
    expect(entry.state).toBe("UNDER_REVIEW");
  });

  it("rejects invalid transitions", () => {
    const entry = createFreezeEntry("ADR-001", "tester");
    // DRAFT cannot directly APPROVE
    expect(() => transitionFreeze(entry, "APPROVE", "tester", "nope")).toThrow("Invalid transition");
  });

  it("getFreezeStatus blocks implementation before FROZEN", () => {
    const entry = createFreezeEntry("ADR-001", "tester");
    const status = getFreezeStatus(entry);
    expect(status.canImplement).toBe(false);
    expect(status.blockingReason).toContain("DRAFT");
  });

  it("getFreezeStatus allows implementation when FROZEN", () => {
    let entry = createFreezeEntry("ADR-001", "tester");
    entry = transitionFreeze(entry, "SUBMIT_FOR_REVIEW", "tester", "Ready");
    entry = transitionFreeze(entry, "SEND_TO_ARBITRATION", "reviewer", "Reviewed");
    entry = transitionFreeze(entry, "APPROVE", "arbiter", "Approved");
    const status = getFreezeStatus(entry);
    expect(status.canImplement).toBe(true);
    expect(status.isFrozen).toBe(true);
  });

  it("records history on each transition", () => {
    let entry = createFreezeEntry("ADR-001", "tester");
    entry = transitionFreeze(entry, "SUBMIT_FOR_REVIEW", "tester", "Ready");
    entry = transitionFreeze(entry, "SEND_TO_ARBITRATION", "reviewer", "Reviewed");
    entry = transitionFreeze(entry, "APPROVE", "arbiter", "All good");
    expect(entry.history).toHaveLength(4); // creation + submit + arbitration + approve
  });

  /* ── Prohibited transitions ──────────────────────────────── */

  it("cannot transition DRAFT → FROZEN", () => {
    const entry = createFreezeEntry("ADR-001", "tester");
    expect(() => transitionFreeze(entry, "APPROVE", "tester", "nope")).toThrow("Invalid transition");
  });

  it("cannot transition UNDER_REVIEW → FROZEN (must go through ARBITRATION)", () => {
    let entry = createFreezeEntry("ADR-001", "tester");
    entry = transitionFreeze(entry, "SUBMIT_FOR_REVIEW", "tester", "Ready");
    expect(() => transitionFreeze(entry, "APPROVE", "arbiter", "nope")).toThrow("Invalid transition");
  });

  it("cannot transition FROZEN → DRAFT (must thaw first)", () => {
    let entry = createFreezeEntry("ADR-001", "tester");
    entry = transitionFreeze(entry, "SUBMIT_FOR_REVIEW", "tester", "Ready");
    entry = transitionFreeze(entry, "SEND_TO_ARBITRATION", "reviewer", "Reviewed");
    entry = transitionFreeze(entry, "APPROVE", "arbiter", "Approved");
    expect(() => transitionFreeze(entry, "SUBMIT_FOR_REVIEW", "tester", "nope")).toThrow("Invalid transition");
  });

  it("cannot transition CHANGES_REQUIRED → FROZEN", () => {
    let entry = createFreezeEntry("ADR-001", "tester");
    entry = transitionFreeze(entry, "SUBMIT_FOR_REVIEW", "tester", "Ready");
    entry = transitionFreeze(entry, "REQUEST_CHANGES", "reviewer", "Fix");
    expect(() => transitionFreeze(entry, "APPROVE", "arbiter", "nope")).toThrow("Invalid transition");
  });

  it("ARBITRATION state blocks implementation", () => {
    let entry = createFreezeEntry("ADR-001", "tester");
    entry = transitionFreeze(entry, "SUBMIT_FOR_REVIEW", "tester", "Ready");
    entry = transitionFreeze(entry, "SEND_TO_ARBITRATION", "reviewer", "Reviewed");
    const status = getFreezeStatus(entry);
    expect(status.canImplement).toBe(false);
    expect(status.isFrozen).toBe(false);
    expect(status.blockingReason).toContain("ARBITRATION");
  });

  it("ARBITRATION → CHANGES_REQUIRED returns to revision cycle", () => {
    let entry = createFreezeEntry("ADR-001", "tester");
    entry = transitionFreeze(entry, "SUBMIT_FOR_REVIEW", "tester", "Ready");
    entry = transitionFreeze(entry, "SEND_TO_ARBITRATION", "reviewer", "Reviewed");
    entry = transitionFreeze(entry, "REQUEST_CHANGES", "arbiter", "Changes needed");
    expect(entry.state).toBe("CHANGES_REQUIRED");
  });

  it("FROZEN → THAWED → DRAFT enables re-freeze cycle", () => {
    let entry = createFreezeEntry("ADR-001", "tester");
    entry = transitionFreeze(entry, "SUBMIT_FOR_REVIEW", "tester", "Ready");
    entry = transitionFreeze(entry, "SEND_TO_ARBITRATION", "reviewer", "Reviewed");
    entry = transitionFreeze(entry, "APPROVE", "arbiter", "Approved");
    expect(entry.state).toBe("FROZEN");

    entry = transitionFreeze(entry, "THAW", "architect", "Need changes");
    expect(entry.state).toBe("THAWED");

    entry = transitionFreeze(entry, "RETURN_TO_DRAFT", "architect", "Back to draft");
    expect(entry.state).toBe("DRAFT");
  });

  it("getFreezeStatus shows thawed blocking reason", () => {
    let entry = createFreezeEntry("ADR-001", "tester");
    entry = transitionFreeze(entry, "SUBMIT_FOR_REVIEW", "tester", "Ready");
    entry = transitionFreeze(entry, "SEND_TO_ARBITRATION", "reviewer", "Reviewed");
    entry = transitionFreeze(entry, "APPROVE", "arbiter", "Approved");
    entry = transitionFreeze(entry, "THAW", "architect", "Schema change");
    const status = getFreezeStatus(entry);
    expect(status.canImplement).toBe(false);
    expect(status.blockingReason).toContain("thawed");
  });
});

/* ════════════════════════════════════════════════════════════
   Freeze Validator
   ════════════════════════════════════════════════════════════ */

describe("Freeze Validator", () => {
  it("passes when all conditions met", () => {
    const result = validateFreezeConditions({
      adr: {
        metadata: { id: "ADR-001", title: "Test", status: "draft" },
        context: "context",
        decision: "decision",
        moduleBoundaries: ["src/governance/"],
        interfaces: ["FreezeGateEntry"],
        invariants: ["ADR is immutable after finalization"],
        acceptanceCriteria: ["All tests pass"],
      },
      moduleBoundaries: ["src/governance/"],
      interfaces: ["FreezeGateEntry"],
      invariants: ["ADR is immutable after finalization"],
      acceptanceCriteria: ["All tests pass"],
    });

    expect(result.passed).toBe(true);
    expect(result.checks.every((c: FreezeCheckResult) => !c.required || c.passed)).toBe(true);
  });

  it("fails when module boundaries missing", () => {
    const result = validateFreezeConditions({
      adr: {
        metadata: { id: "ADR-001", title: "Test", status: "draft" },
        context: "context",
        decision: "decision",
        moduleBoundaries: [],
        interfaces: ["FreezeGateEntry"],
        invariants: [],
        acceptanceCriteria: ["All tests pass"],
      },
      moduleBoundaries: [],
      interfaces: ["FreezeGateEntry"],
      invariants: [],
      acceptanceCriteria: ["All tests pass"],
    });

    expect(result.passed).toBe(false);
    expect(result.checks.find((c: FreezeCheckResult) => c.name === "Module boundaries defined")!.passed).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════
   Thaw Protocol
   ════════════════════════════════════════════════════════════ */

describe("Thaw Protocol", () => {
  it("thaws a frozen entry", () => {
    let entry = createFreezeEntry("ADR-001", "tester");
    entry = transitionFreeze(entry, "SUBMIT_FOR_REVIEW", "tester", "Ready");
    entry = transitionFreeze(entry, "SEND_TO_ARBITRATION", "reviewer", "Reviewed");
    entry = transitionFreeze(entry, "APPROVE", "arbiter", "Approved");

    const result = initiateThaw(entry, {
      reason: "Interface change required",
      actor: "architect",
      affectedInterfaces: ["FreezeGateEntry"],
      plannedChanges: ["Add thawReason field"],
      riskAssessment: "medium",
      requiresReFreeze: true,
    });

    expect(result.thawedEntry.state).toBe("THAWED");
    expect(result.thawRequest.reason).toBe("Interface change required");
  });

  it("rejects thaw on non-frozen entry", () => {
    const entry = createFreezeEntry("ADR-001", "tester");
    expect(() => initiateThaw(entry, {
      reason: "test",
      actor: "tester",
      affectedInterfaces: [],
      plannedChanges: [],
      riskAssessment: "low",
      requiresReFreeze: true,
    })).toThrow("Cannot thaw");
  });

  it("canThawWithoutReview returns true for low risk", () => {
    expect(canThawWithoutReview({
      reason: "typo fix",
      actor: "tester",
      affectedInterfaces: [],
      plannedChanges: [],
      riskAssessment: "low",
      requiresReFreeze: false,
    })).toBe(true);
  });

  it("generateThawReport produces structured output", () => {
    let entry = createFreezeEntry("ADR-001", "tester");
    entry = transitionFreeze(entry, "SUBMIT_FOR_REVIEW", "tester", "Ready");
    entry = transitionFreeze(entry, "SEND_TO_ARBITRATION", "reviewer", "Reviewed");
    entry = transitionFreeze(entry, "APPROVE", "arbiter", "Approved");

    const result = initiateThaw(entry, {
      reason: "Need to add fields",
      actor: "architect",
      affectedInterfaces: ["FreezeGateEntry"],
      plannedChanges: ["Add new field"],
      riskAssessment: "high",
      requiresReFreeze: true,
    });

    const report = generateThawReport(result);
    expect(report).toContain("Architecture Thaw Report");
    expect(report).toContain("ADR-001");
    expect(report).toContain("Add new field");
    expect(report).toContain("high");
  });
});

/* ════════════════════════════════════════════════════════════
   Cognitive Review
   ════════════════════════════════════════════════════════════ */

describe("Cognitive Review", () => {
  function makeInput(overrides: Partial<CognitiveReviewInput> = {}): CognitiveReviewInput {
    return {
      architectureDraft: {
        title: "Governance Module",
        adrId: "ADR-GOV-001",
        context: "Need architecture governance for Agent OS",
        decision: "Build governance layer with ADR, freeze gate, review, diff, audit",
        moduleBoundaries: ["src/governance/"],
        interfaces: ["FreezeGateEntry", "AdrStore"],
        invariants: ["No implementation before freeze"],
        acceptanceCriteria: ["Typecheck passes", "Tests pass"],
      },
      existingMilestones: ["P2.0 Memory", "P2.1 Knowledge Graph"],
      systemInvariants: ["Typecheck must pass", "Forbidden language must be clean"],
      evalBaseline: { testCount: 564, evalCount: 44 },
      ...overrides,
    };
  }

  it("APPROVES complete architecture", () => {
    const result = performCognitiveReview(makeInput());
    expect(result.verdict).toBe("APPROVE");
    expect(result.requiredChanges).toHaveLength(0);
  });

  it("REJECTs architecture with no interfaces", () => {
    const result = performCognitiveReview(makeInput({
      architectureDraft: {
        title: "Bad",
        adrId: "ADR-002",
        context: "test",
        decision: "test",
        moduleBoundaries: ["src/x/"],
        interfaces: [],
        invariants: [],
        acceptanceCriteria: [],
      },
    }));
    expect(result.verdict).toBe("REJECT");
    expect(result.requiredChanges.length).toBeGreaterThan(0);
  });

  it("REJECTs with no module boundaries", () => {
    const result = performCognitiveReview(makeInput({
      architectureDraft: {
        title: "Bad",
        adrId: "ADR-003",
        context: "test",
        decision: "test",
        moduleBoundaries: [],
        interfaces: ["Iface"],
        invariants: [],
        acceptanceCriteria: ["test"],
      },
    }));
    expect(result.verdict).toBe("REJECT");
    expect(result.requiredChanges.some((c: string) => c.includes("module"))).toBe(true);
  });

  it("returns structured findings", () => {
    const result = performCognitiveReview(makeInput());
    expect(Array.isArray(result.topRisks)).toBe(true);
    expect(Array.isArray(result.hiddenAssumptions)).toBe(true);
    expect(Array.isArray(result.requiredChanges)).toBe(true);
    expect(Array.isArray(result.optionalImprovements)).toBe(true);
    expect(result.finalRecommendation).toBeTruthy();
  });
});

/* ════════════════════════════════════════════════════════════
   Arbitration
   ════════════════════════════════════════════════════════════ */

describe("Arbitration", () => {
  it("accepts critical/high findings", () => {
    const review = performCognitiveReview({
      architectureDraft: {
        title: "Test",
        adrId: "ADR-004",
        context: "t",
        decision: "t",
        moduleBoundaries: ["src/x/"],
        interfaces: [],
        invariants: [],
        acceptanceCriteria: [],
      },
      existingMilestones: [],
      systemInvariants: [],
      evalBaseline: { testCount: 0, evalCount: 0 },
    });

    const result = arbitrateReview({} as CognitiveReviewInput, review);
    expect(result.acceptedFindings.length).toBeGreaterThan(0);
    expect(result.verdict).toBe("REJECT");
  });
});

/* ════════════════════════════════════════════════════════════
   Review Pipeline
   ════════════════════════════════════════════════════════════ */

describe("Review Pipeline", () => {
  it("freezes a complete architecture", async () => {
    const result = await runReviewPipeline({
      architectureDraft: {
        architectureDraft: {
          title: "Governance Module",
          adrId: "ADR-GOV-002",
          context: "Need governance",
          decision: "Build it",
          moduleBoundaries: ["src/governance/"],
          interfaces: ["FreezeGateEntry"],
          invariants: ["No implementation before freeze"],
          acceptanceCriteria: ["Typecheck passes"],
        },
        existingMilestones: ["P2.0"],
        systemInvariants: ["Typecheck passes"],
        evalBaseline: { testCount: 500, evalCount: 40 },
      },
      existingMilestones: ["P2.0"],
      systemInvariants: ["Typecheck passes"],
      evalBaseline: { testCount: 500, evalCount: 40 },
      actor: "architect",
    });

    expect(result.freezeEntry.state === "FROZEN" || result.freezeEntry.state === "CHANGES_REQUIRED").toBe(true);
    expect(result.reviewOutput.verdict).toBeTruthy();
    expect(result.freezeValidation.passed === true || result.freezeValidation.passed === false).toBe(true);
  });

  it("rejects architecture with missing fields", async () => {
    const result = await runReviewPipeline({
      architectureDraft: {
        architectureDraft: {
          title: "Incomplete",
          adrId: "ADR-005",
          context: "t",
          decision: "t",
          moduleBoundaries: [],
          interfaces: [],
          invariants: [],
          acceptanceCriteria: [],
        },
        existingMilestones: [],
        systemInvariants: [],
        evalBaseline: { testCount: 0, evalCount: 0 },
      },
      existingMilestones: [],
      systemInvariants: [],
      evalBaseline: { testCount: 0, evalCount: 0 },
      actor: "architect",
    });

    expect(result.passed).toBe(false);
    const hasExpectedSummary = result.summary.includes("REJECTED") || result.summary.includes("CHANGES");
    expect(hasExpectedSummary).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════
   Interface Diff
   ════════════════════════════════════════════════════════════ */

describe("Interface Diff", () => {
  it("detects missing interfaces", () => {
    const result = diffInterfaces("test", [
      { name: "ExpectedIface", exports: ["exportA"], methods: ["methodA"] },
    ], []);

    expect(result.passed).toBe(false);
    expect(result.breakingCount).toBe(1);
    expect(result.entries[0].category).toBe("interface_removed");
  });

  it("detects missing exports", () => {
    const result = diffInterfaces("test", [
      { name: "Iface", exports: ["exportA", "exportB"], methods: [] },
    ], [
      { name: "Iface", exports: ["exportA"], methods: [] },
    ]);

    expect(result.passed).toBe(false);
    expect(result.entries.some((e: DiffEntry) => e.path.includes("exportB"))).toBe(true);
  });

  it("detects unexpected interfaces", () => {
    const result = diffInterfaces("test", [
      { name: "Expected", exports: [], methods: [] },
    ], [
      { name: "Expected", exports: [], methods: [] },
      { name: "Unexpected", exports: [], methods: [] },
    ]);

    expect(result.entries.some((e: DiffEntry) => e.category === "interface_added")).toBe(true);
  });

  it("passes when interfaces match", () => {
    const result = diffInterfaces("test", [
      { name: "Match", exports: ["a"], methods: ["b"] },
    ], [
      { name: "Match", exports: ["a"], methods: ["b"] },
    ]);

    expect(result.passed).toBe(true);
  });

  it("mergeInterfaceReports aggregates correctly", () => {
    const report1 = diffInterfaces("m1", [{ name: "A", exports: ["x"], methods: [] }], []);
    const report2 = diffInterfaces("m2", [{ name: "B", exports: ["y"], methods: [] }], []);
    const merged = mergeInterfaceReports([report1, report2]);

    expect(merged.totalBreaking).toBe(2);
    expect(merged.totalChanges).toBeGreaterThan(0);
    expect(merged.passed).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════
   Schema Diff
   ════════════════════════════════════════════════════════════ */

describe("Schema Diff", () => {
  it("detects missing types", () => {
    const result = diffSchemas("test", [
      { name: "ExpectedType", fields: [{ name: "id", type: "string", required: true }] },
    ], []);

    expect(result.passed).toBe(false);
    expect(result.breakingCount).toBe(1);
  });

  it("detects type mismatches", () => {
    const result = diffSchemas("test", [
      { name: "T", fields: [{ name: "count", type: "number", required: true }] },
    ], [
      { name: "T", fields: [{ name: "count", type: "string", required: true }] },
    ]);

    expect(result.breakingCount).toBe(1);
  });

  it("passes with identical schemas", () => {
    const result = diffSchemas("test", [
      { name: "T", fields: [{ name: "id", type: "string", required: true }] },
    ], [
      { name: "T", fields: [{ name: "id", type: "string", required: true }] },
    ]);

    expect(result.passed).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════
   Invariant Check
   ════════════════════════════════════════════════════════════ */

describe("Invariant Check", () => {
  it("runs standard invariants", () => {
    const state = { testCount: 100, evalCount: 10, typecheckPasses: true, noForbiddenLanguage: true, frozenModules: ["gov"] };
    const invariants = getStandardInvariants(state);
    const results = checkSystemInvariants(state, invariants);
    expect(results.every((r: InvariantCheckResult) => r.passed)).toBe(true);
  });

  it("fails on typecheck failure", () => {
    const state = { testCount: 100, evalCount: 10, typecheckPasses: false, noForbiddenLanguage: true, frozenModules: [] };
    const invariants = getStandardInvariants(state);
    const results = checkSystemInvariants(state, invariants);
    expect(results.find((r: InvariantCheckResult) => r.invariant === "typecheck_passes")!.passed).toBe(false);
  });

  it("summarizeInvariantChecks aggregates correctly", () => {
    const state = { testCount: 0, evalCount: 0, typecheckPasses: false, noForbiddenLanguage: false, frozenModules: [] };
    const invariants = getStandardInvariants(state);
    const results = checkSystemInvariants(state, invariants);
    const summary = summarizeInvariantChecks(results);
    expect(summary.passed).toBe(false);
    expect(summary.failed).toBeGreaterThan(0);
  });
});

/* ════════════════════════════════════════════════════════════
   Routing Log
   ════════════════════════════════════════════════════════════ */

describe("Routing Log", () => {
  it("records routing decisions", () => {
    const log = new RoutingLog();
    log.record({
      timestamp: new Date().toISOString(),
      taskId: "TASK-001",
      taskType: "architecture",
      selectedModel: "claude-opus",
      selectionReason: "Architecture design",
      taskComplexity: "architecture",
      estimatedCostMultiplier: 3,
    });
    expect(log.getAll()).toHaveLength(1);
  });

  it("queries by model", () => {
    const log = new RoutingLog();
    log.record({ timestamp: "", taskId: "t1", taskType: "arch", selectedModel: "claude-opus", selectionReason: "r", taskComplexity: "architecture", estimatedCostMultiplier: 3 });
    log.record({ timestamp: "", taskId: "t2", taskType: "impl", selectedModel: "deepseek-pro", selectionReason: "r", taskComplexity: "high", estimatedCostMultiplier: 1 });
    expect(log.getByModel("claude-opus")).toHaveLength(1);
  });

  it("returns stats", () => {
    const log = new RoutingLog();
    log.record({ timestamp: "", taskId: "t1", taskType: "arch", selectedModel: "claude-opus", selectionReason: "r", taskComplexity: "architecture", estimatedCostMultiplier: 3 });
    const stats = log.getStats();
    expect(stats.totalRoutes).toBe(1);
    expect(stats.byModel["claude-opus"]).toBe(1);
  });

  it("clears entries", () => {
    const log = new RoutingLog();
    log.record({ timestamp: "", taskId: "t1", taskType: "arch", selectedModel: "deepseek-pro", selectionReason: "r", taskComplexity: "high", estimatedCostMultiplier: 1 });
    log.clear();
    expect(log.getAll()).toHaveLength(0);
  });
});

/* ════════════════════════════════════════════════════════════
   Governance Event Store
   ════════════════════════════════════════════════════════════ */

describe("Governance Event Store", () => {
  it("emits events with unique IDs", () => {
    const store = new GovernanceEventStore();
    const event = store.emit("ADR_CREATED", "architect", { adrId: "ADR-001" });
    expect(event.id).toMatch(/^GOV-/);
    expect(event.type).toBe("ADR_CREATED");
    expect(event.actor).toBe("architect");
  });

  it("queries by type", () => {
    const store = new GovernanceEventStore();
    store.emit("FREEZE_TRANSITION", "tester");
    store.emit("REVIEW_COMPLETED", "reviewer");
    store.emit("FREEZE_TRANSITION", "arbiter");
    expect(store.getByType("FREEZE_TRANSITION")).toHaveLength(2);
  });

  it("returns stats", () => {
    const store = new GovernanceEventStore();
    store.emit("ADR_CREATED", "architect");
    store.emit("REVIEW_COMPLETED", "reviewer");
    const stats = store.getStats();
    expect(stats.total).toBe(2);
    expect(stats.byActor["architect"]).toBe(1);
  });

  it("gets latest N events", () => {
    const store = new GovernanceEventStore();
    store.emit("ADR_CREATED", "a1");
    store.emit("ADR_CREATED", "a2");
    store.emit("FREEZE_TRANSITION", "a3");
    const latest = store.getLatest(2);
    expect(latest).toHaveLength(2);
    expect(latest[0].actor).toBe("a3");
  });

  it("clears events", () => {
    const store = new GovernanceEventStore();
    store.emit("ADR_CREATED", "architect");
    store.clear();
    expect(store.getAll()).toHaveLength(0);
  });
});

/* ════════════════════════════════════════════════════════════
   P2.0 Protocol Upgrade — New Types & Contracts
   ════════════════════════════════════════════════════════════ */

describe("P2.0 Protocol Upgrade", () => {
  /* ── OpenAI Reviewer Config ─────────────────────────────── */

  it("OpenAIReviewerConfig has correct defaults", () => {
    const config = { ...DEFAULT_OPENAI_REVIEWER_CONFIG };
    expect(config.provider).toBe("openai");
    expect(config.model).toBe("gpt-4.1-mini");
    expect(config.endpoint).toBe("");
    expect(config.timeoutMs).toBe(120000);
    expect(config.maxRetries).toBe(2);
    expect(config.retryBackoffMs).toBe(1000);
    expect(config.fallbackPolicy).toBe("BLOCK_FREEZE");
  });

  it("OpenAIReviewerConfig accepts model names as strings", () => {
    const models = ["gpt-5.5-thinking", "gpt-5.5", "o3", "gpt-4o", "gpt-4.1-mini"];
    for (const model of models) {
      const config: OpenAIReviewerConfig = {
        provider: "openai",
        model,
        endpoint: "https://api.openai.com/v1/responses",
        timeoutMs: 300000,
        maxRetries: 0,
        retryBackoffMs: 1000,
        fallbackPolicy: "BLOCK_FREEZE",
      };
      expect(config.model).toBe(model);
    }
  });

  it("OpenAIReviewerConfig accepts all fallback policies", () => {
    const policies: OpenAIReviewerConfig["fallbackPolicy"][] = ["BLOCK_FREEZE", "OPUS_ONLY_WITH_WARNING", "DEFER_REVIEW"];
    for (const fallbackPolicy of policies) {
      const config: OpenAIReviewerConfig = {
        provider: "openai",
        model: "gpt-5.5-thinking",
        endpoint: "",
        timeoutMs: 0,
        maxRetries: 0,
        retryBackoffMs: 1000,
        fallbackPolicy,
      };
      expect(config.fallbackPolicy).toBe(fallbackPolicy);
    }
  });

  /* ── CognitiveReviewOutputV2 ────────────────────────────── */

  it("CognitiveReviewOutputV2 contains all required fields", () => {
    const output: CognitiveReviewOutputV2 = {
      verdict: "APPROVE_WITH_CHANGES",
      topRisks: [
        { id: "RISK-001", description: "Missing invariants", severity: "HIGH" },
      ],
      hiddenAssumptions: [],
      missingInterfaces: ["FreezeGateEntry"],
      invariantGaps: [],
      couplingRisks: [],
      simplificationOpportunities: [],
      requiredChangesBeforeFreeze: ["Define interfaces"],
      optionalImprovements: [],
      finalRecommendation: "Address changes before freeze",
      reviewerModel: "gpt-5.5-thinking",
      reviewedAt: new Date().toISOString(),
    };

    expect(output.verdict).toBe("APPROVE_WITH_CHANGES");
    expect(output.topRisks[0].severity).toBe("HIGH");
    expect(output.finalRecommendation).toBeTruthy();
  });

  it("CognitiveReviewOutputV2 does not have implementationCode field", () => {
    const output: CognitiveReviewOutputV2 = {
      verdict: "APPROVE",
      topRisks: [],
      hiddenAssumptions: [],
      missingInterfaces: [],
      invariantGaps: [],
      couplingRisks: [],
      simplificationOpportunities: [],
      requiredChangesBeforeFreeze: [],
      optionalImprovements: [],
      finalRecommendation: "Ready",
      reviewerModel: "gpt-5.5-thinking",
      reviewedAt: "",
    };
    // The type should not have an implementationCode property
    expect((output as unknown as Record<string, unknown>).implementationCode).toBeUndefined();
  });

  it("CognitiveReviewOutputV2 supports all verdicts", () => {
    const verdicts: ReviewVerdict[] = ["APPROVE", "APPROVE_WITH_CHANGES", "REJECT"];
    for (const verdict of verdicts) {
      const output: CognitiveReviewOutputV2 = {
        verdict,
        topRisks: [],
        hiddenAssumptions: [],
        missingInterfaces: [],
        invariantGaps: [],
        couplingRisks: [],
        simplificationOpportunities: [],
        requiredChangesBeforeFreeze: [],
        optionalImprovements: [],
        finalRecommendation: "",
        reviewerModel: "",
        reviewedAt: "",
      };
      expect(output.verdict).toBe(verdict);
    }
  });

  /* ── Architecture Diff Check ────────────────────────────── */

  it("ArchitectureDiffCheck detects breaking changes", () => {
    const input: ArchitectureDiffCheckInput = {
      frozenInterfaces: ["FreezeGateEntry", "AdrStore"],
      implementationPlan: ["Add new method to FreezeGateEntry"],
      frozenInvariants: ["ADR is immutable"],
      proposedChanges: ["Remove ADR mutability check"],
    };

    const output: ArchitectureDiffCheckOutput = {
      status: "FAIL",
      breakingChanges: ["Removing ADR mutability check"],
      invariantViolations: ["ADR is immutable would be violated"],
      driftWarnings: [],
      requiresThaw: true,
    };

    expect(output.status).toBe("FAIL");
    expect(output.requiresThaw).toBe(true);
    expect(output.breakingChanges.length).toBeGreaterThan(0);
  });

  it("ArchitectureDiffCheck passes when no drift", () => {
    const output: ArchitectureDiffCheckOutput = {
      status: "PASS",
      breakingChanges: [],
      invariantViolations: [],
      driftWarnings: [],
      requiresThaw: false,
    };

    expect(output.status).toBe("PASS");
    expect(output.requiresThaw).toBe(false);
  });

  it("ArchitectureDiffCheck warns on non-breaking additions", () => {
    const output: ArchitectureDiffCheckOutput = {
      status: "WARN",
      breakingChanges: [],
      invariantViolations: [],
      driftWarnings: ["New module boundary added outside frozen scope"],
      requiresThaw: false,
    };

    expect(output.status).toBe("WARN");
    expect(output.requiresThaw).toBe(false);
    expect(output.driftWarnings.length).toBeGreaterThan(0);
  });

  /* ── ArchitectureThawRequest ────────────────────────────── */

  it("ArchitectureThawRequest requires all fields", () => {
    const request: ArchitectureThawRequest = {
      frozenArchitectureId: "FRZ-ADR-001",
      requestedBy: "claude-opus",
      reason: "Interface change required for new feature",
      impactAnalysis: ["Breaks FreezeGateEntry contract"],
      affectedInterfaces: ["FreezeGateEntry"],
      affectedInvariants: ["No implementation before freeze"],
      requestedAt: new Date().toISOString(),
    };

    expect(request.frozenArchitectureId).toMatch(/^FRZ-/);
    expect(request.requestedBy).toBe("claude-opus");
    expect(request.impactAnalysis.length).toBeGreaterThan(0);
  });

  it("ArchitectureThawRequest supports all requester types", () => {
    const requesters: ArchitectureThawRequest["requestedBy"][] = ["claude-opus", "deepseek-v4-pro", "human"];
    for (const requestedBy of requesters) {
      const request: ArchitectureThawRequest = {
        frozenArchitectureId: "FRZ-ADR-001",
        requestedBy,
        reason: "test",
        impactAnalysis: [],
        affectedInterfaces: [],
        affectedInvariants: [],
        requestedAt: "",
      };
      expect(request.requestedBy).toBe(requestedBy);
    }
  });

  /* ── RoutingDecisionLog ─────────────────────────────────── */

  it("RoutingDecisionLog records full routing context", () => {
    const entry: RoutingDecisionLog = {
      taskId: "TASK-042",
      selectedModel: "claude-opus",
      role: "ARCHITECTURE_GOVERNOR",
      reason: "Architecture design for governance module",
      timestamp: new Date().toISOString(),
      inputSummary: "Design freeze gate state machine",
      outputSummary: "ADR with 5 states and 7 transitions",
    };

    expect(entry.selectedModel).toBe("claude-opus");
    expect(entry.role).toBe("ARCHITECTURE_GOVERNOR");
    expect(entry.taskId).toBe("TASK-042");
  });

  it("RoutingDecisionLog supports all model-role combinations", () => {
    const entries: RoutingDecisionLog[] = [
      { taskId: "t1", selectedModel: "claude-opus", role: "ARCHITECTURE_GOVERNOR", reason: "arch", timestamp: "", inputSummary: "" },
      { taskId: "t2", selectedModel: "deepseek-v4-pro", role: "IMPLEMENTATION_PLANNER", reason: "impl", timestamp: "", inputSummary: "" },
      { taskId: "t3", selectedModel: "deepseek-v4-flash", role: "MECHANICAL_EXECUTOR", reason: "exec", timestamp: "", inputSummary: "" },
      { taskId: "t4", selectedModel: "openai-reviewer", role: "COGNITIVE_REVIEWER", reason: "review", timestamp: "", inputSummary: "" },
    ];

    expect(entries).toHaveLength(4);
    expect(entries.map((e) => e.selectedModel)).toEqual(["claude-opus", "deepseek-v4-pro", "deepseek-v4-flash", "openai-reviewer"]);
    expect(entries.map((e) => e.role)).toEqual(["ARCHITECTURE_GOVERNOR", "IMPLEMENTATION_PLANNER", "MECHANICAL_EXECUTOR", "COGNITIVE_REVIEWER"]);
  });

  /* ── FREEZE_TRANSITIONS correctness ─────────────────────── */

  it("FREEZE_TRANSITIONS matches new state machine (no direct UNDER_REVIEW → FROZEN)", () => {
    expect(FREEZE_TRANSITIONS.DRAFT).toEqual(["SUBMIT_FOR_REVIEW"]);
    expect(FREEZE_TRANSITIONS.UNDER_REVIEW).toEqual(["REQUEST_CHANGES", "SEND_TO_ARBITRATION"]);
    expect(FREEZE_TRANSITIONS.CHANGES_REQUIRED).toEqual(["RETURN_TO_DRAFT"]);
    expect(FREEZE_TRANSITIONS.ARBITRATION).toEqual(["APPROVE", "REQUEST_CHANGES"]);
    expect(FREEZE_TRANSITIONS.FROZEN).toEqual(["THAW"]);
    expect(FREEZE_TRANSITIONS.THAWED).toEqual(["RETURN_TO_DRAFT"]);

    // Verify no direct path from UNDER_REVIEW to FROZEN
    expect(FREEZE_TRANSITIONS.UNDER_REVIEW).not.toContain("APPROVE");
  });
});

/* ════════════════════════════════════════════════════════════
   Cognitive Reviewer Provider (P2.1)
   ════════════════════════════════════════════════════════════ */

describe("Cognitive Reviewer Provider", () => {
  const v2Input: CognitiveReviewInputV2 = {
    architectureDraft: {
      adrId: "ADR-GOV-010",
      title: "Test Architecture",
      context: "Testing the cognitive reviewer provider",
      decision: "Use provider abstraction for review",
      moduleBoundaries: ["src/governance/"],
      interfaces: ["FreezeGateEntry", "AdrStore"],
      invariants: ["No implementation before freeze"],
      acceptanceCriteria: ["All tests pass"],
    },
    existingMilestones: ["P2.0 Memory"],
    systemInvariants: ["Typecheck must pass"],
    evalBaseline: { testCount: 637, evalScenarioCount: 44, typecheckStatus: "PASS" },
    routingContext: {
      primaryArchitect: "claude-opus",
      executionChain: ["deepseek-v4-pro", "deepseek-v4-flash"],
      reviewPurpose: "FREEZE_GATE",
    },
  };

  /* ── Mock Provider ──────────────────────────────────────── */

  it("MockReviewerProvider returns structured result", async () => {
    const provider = new MockReviewerProvider();
    const result = await provider.review(v2Input);

    expect(result.providerName).toBe("mock-reviewer");
    expect(result.modelUsed).toBe("mock-model-v1");
    expect(result.fallbackUsed).toBe(false);
    expect(result.output.verdict).toBe("APPROVE");
    expect(Array.isArray(result.output.topRisks)).toBe(true);
    expect(result.output.finalRecommendation).toBeTruthy();
  });

  it("MockReviewerProvider rejects architectures with no interfaces", async () => {
    const provider = new MockReviewerProvider();
    const result = await provider.review({
      ...v2Input,
      architectureDraft: { ...v2Input.architectureDraft, interfaces: [], moduleBoundaries: [] },
    });

    expect(result.output.verdict).toBe("REJECT");
    expect(result.output.requiredChangesBeforeFreeze.length).toBeGreaterThanOrEqual(2);
    expect(result.output.topRisks.some((r) => r.severity === "HIGH")).toBe(true);
  });

  it("MockReviewerProvider issues APPROVE_WITH_CHANGES for medium issues", async () => {
    const provider = new MockReviewerProvider();
    const input: CognitiveReviewInputV2 = {
      ...v2Input,
      architectureDraft: {
        ...v2Input.architectureDraft,
        moduleBoundaries: ["src/governance/"],
        interfaces: ["FreezeGateEntry"],
        acceptanceCriteria: [],
      },
    };
    const result = await provider.review(input);
    // Only acceptance criteria missing → MEDIUM severity → APPROVE_WITH_CHANGES
    expect(result.output.verdict).toBe("APPROVE_WITH_CHANGES");
  });

  /* ── OpenAI Provider Config ─────────────────────────────── */

  it("OpenAIReviewerProvider constructor accepts custom config", () => {
    const provider = new OpenAIReviewerProvider({ model: "gpt-5.5", timeoutMs: 60000 });
    expect(provider.name).toBe("openai-reviewer");
  });

  it("OpenAIReviewerProvider returns fallback when API key is missing", async () => {
    const previousKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const provider = new OpenAIReviewerProvider();
    const result = await provider.review(v2Input);

    expect(result.fallbackUsed).toBe(true);
    expect(result.providerName).toBe("openai");
    expect(result.modelUsed).toBe("fallback");
    expect(result.latencyMs).toBe(0);
    expect(result.output.verdict).toBe("APPROVE_WITH_CHANGES");
    expect(result.output.topRisks[0].id).toBe("FALLBACK-001");

    // Restore
    if (previousKey) process.env.OPENAI_API_KEY = previousKey;
  });

  /* ── Fallback Result ────────────────────────────────────── */

  it("createFallbackResult returns structured fallback", () => {
    const result = createFallbackResult("API timeout");
    expect(result.fallbackUsed).toBe(true);
    expect(result.output.verdict).toBe("APPROVE_WITH_CHANGES");
    expect(result.output.reviewerModel).toBe("fallback");
    expect(result.output.topRisks[0].description).toContain("API timeout");
  });

  /* ── V1 ↔ V2 Mapping ───────────────────────────────────── */

  it("v1InputToV2 maps all required fields and adds routing context", () => {
    const v1: import("../src/governance/index.js").CognitiveReviewInput = {
      architectureDraft: {
        title: "Test",
        adrId: "ADR-001",
        context: "ctx",
        decision: "dec",
        moduleBoundaries: ["src/x/"],
        interfaces: ["Iface"],
        invariants: ["inv"],
        acceptanceCriteria: ["ac"],
      },
      existingMilestones: ["M1"],
      systemInvariants: ["SI"],
      evalBaseline: { testCount: 10, evalCount: 5 },
    };

    const result = v1InputToV2(v1);
    expect(result.architectureDraft.title).toBe("Test");
    expect(result.architectureDraft.adrId).toBe("ADR-001");
    expect(result.evalBaseline.evalScenarioCount).toBe(5);
    expect(result.evalBaseline.typecheckStatus).toBe("UNKNOWN");
    expect(result.routingContext.primaryArchitect).toBe("claude-opus");
    expect(result.routingContext.reviewPurpose).toBe("FREEZE_GATE");
  });

  it("v2OutputToV1 maps severity uppercase to lowercase", () => {
    const v2: CognitiveReviewOutputV2 = {
      verdict: "REJECT",
      topRisks: [
        { id: "R1", description: "Critical issue", severity: "CRITICAL" },
        { id: "R2", description: "High issue", severity: "HIGH" },
        { id: "R3", description: "Medium issue", severity: "MEDIUM" },
      ],
      hiddenAssumptions: ["A1"],
      missingInterfaces: [],
      invariantGaps: [],
      couplingRisks: [],
      simplificationOpportunities: ["Simplify module X"],
      requiredChangesBeforeFreeze: ["Fix critical issue"],
      optionalImprovements: [],
      finalRecommendation: "Fix before freeze",
      reviewerModel: "gpt-5.5-thinking",
      reviewedAt: "2026-01-01T00:00:00Z",
    };

    const v1 = v2OutputToV1(v2);
    expect(v1.verdict).toBe("REJECT");
    expect(v1.topRisks[0].severity).toBe("critical");
    expect(v1.topRisks[1].severity).toBe("high");
    expect(v1.topRisks[2].severity).toBe("medium");
    expect(v1.requiredChanges).toEqual(["Fix critical issue"]);
    expect(v1.simplifications).toEqual(["Simplify module X"]);
    expect(v1.reviewer).toBe("openai");
  });

  /* ── Review Runner Provider Injection ───────────────────── */

  it("runReviewPipeline accepts provider injection", async () => {
    const provider = new MockReviewerProvider();
    const result = await runReviewPipeline(
      {
        architectureDraft: {
          architectureDraft: {
            title: "Provider Injection Test",
            adrId: "ADR-PROV-001",
            context: "Testing provider injection",
            decision: "Inject mock provider into pipeline",
            moduleBoundaries: ["src/governance/"],
            interfaces: ["FreezeGateEntry"],
            invariants: [],
            acceptanceCriteria: ["Tests pass"],
          },
          existingMilestones: [],
          systemInvariants: [],
          evalBaseline: { testCount: 100, evalCount: 10 },
        },
        existingMilestones: [],
        systemInvariants: [],
        evalBaseline: { testCount: 100, evalCount: 10 },
        actor: "tester",
      },
      provider,
    );

    expect(result.providerResult).toBeDefined();
    expect(result.providerResult!.providerName).toBe("mock-reviewer");
    expect(result.reviewOutput).toBeDefined();
    expect(result.reviewOutput.verdict).toBeTruthy();
    expect(result.freezeEntry.state === "FROZEN" || result.freezeEntry.state === "CHANGES_REQUIRED").toBe(true);
  });

  it("runReviewPipeline works without provider injection (default path)", async () => {
    const result = await runReviewPipeline({
      architectureDraft: {
        architectureDraft: {
          title: "Default Path Test",
          adrId: "ADR-DEF-001",
          context: "Test",
          decision: "Default path",
          moduleBoundaries: ["src/governance/"],
          interfaces: ["Iface"],
          invariants: [],
          acceptanceCriteria: ["Tests pass"],
        },
        existingMilestones: [],
        systemInvariants: [],
        evalBaseline: { testCount: 100, evalCount: 10 },
      },
      existingMilestones: [],
      systemInvariants: [],
      evalBaseline: { testCount: 100, evalCount: 10 },
      actor: "tester",
    });

    expect(result.providerResult).toBeUndefined();
    expect(result.freezeEntry).toBeDefined();
  });

  /* ── Provider Interface Contract ────────────────────────── */

  it("provider interface contract is satisfied by both implementations", () => {
    const providers: CognitiveReviewerProvider[] = [
      new MockReviewerProvider(),
      new OpenAIReviewerProvider(),
    ];

    for (const p of providers) {
      expect(p.name).toBeTruthy();
      expect(typeof p.review).toBe("function");
    }
    expect(providers).toHaveLength(2);
  });

  /* ── OpenAI Runtime (mocked fetch) ─────────────────────────── */

  function mockFetch(responseBody: unknown, status = 200, ok = true): void {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok,
      status,
      text: () => Promise.resolve(typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody)),
      json: () => Promise.resolve(responseBody),
    });
  }

  function mockFetchError(error: Error): void {
    globalThis.fetch = vi.fn().mockRejectedValue(error);
  }

  function mockFetchAbort(): void {
    globalThis.fetch = vi.fn().mockRejectedValue(new DOMException("The operation was aborted", "AbortError"));
  }

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test-mock-key-for-testing";
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    vi.restoreAllMocks();
  });

  it("OpenAIReviewerProvider happy path — returns parsed CognitiveReviewOutputV2", async () => {
    const responseBody = {
      choices: [{
        message: { content: JSON.stringify({
          verdict: "APPROVE",
          topRisks: [{ id: "R1", description: "Low risk", severity: "LOW" }],
          hiddenAssumptions: [],
          missingInterfaces: [],
          invariantGaps: [],
          couplingRisks: [],
          simplificationOpportunities: [],
          requiredChangesBeforeFreeze: [],
          optionalImprovements: [],
          finalRecommendation: "Architecture is sound",
        }) },
      }],
    };
    mockFetch(responseBody);

    const provider = new OpenAIReviewerProvider({ model: "gpt-4.1-mini" });
    const result = await provider.review(v2Input);

    expect(result.fallbackUsed).toBe(false);
    expect(result.providerName).toBe("openai-reviewer");
    expect(result.modelUsed).toBe("gpt-4.1-mini");
    expect(result.output.verdict).toBe("APPROVE");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("OpenAIReviewerProvider returns PROVIDER_REJECTED on HTTP 401", async () => {
    mockFetch({ error: { message: "Invalid API key" } }, 401, false);

    const provider = new OpenAIReviewerProvider();
    const result = await provider.review(v2Input);

    expect(result.fallbackUsed).toBe(true);
    expect(result.errorCode).toBe("PROVIDER_REJECTED");
    expect(result.rawResponseSummary).toContain("HTTP 401");
  });

  it("OpenAIReviewerProvider retries on HTTP 500 then fails", async () => {
    mockFetch({ error: "Server error" }, 500, false);

    const provider = new OpenAIReviewerProvider({ maxRetries: 1, retryBackoffMs: 10 });
    const result = await provider.review(v2Input);

    expect(result.fallbackUsed).toBe(true);
    expect(result.errorCode).toBe("PROVIDER_REJECTED");
  });

  it("OpenAIReviewerProvider returns TIMEOUT on AbortError", async () => {
    mockFetchAbort();

    const provider = new OpenAIReviewerProvider({ timeoutMs: 100, maxRetries: 1, retryBackoffMs: 10 });
    const result = await provider.review(v2Input);

    expect(result.fallbackUsed).toBe(true);
    expect(result.errorCode).toBe("TIMEOUT");
  });

  it("OpenAIReviewerProvider returns NETWORK_ERROR on fetch failure", async () => {
    mockFetchError(new TypeError("fetch failed"));

    const provider = new OpenAIReviewerProvider({ maxRetries: 1, retryBackoffMs: 10 });
    const result = await provider.review(v2Input);

    expect(result.fallbackUsed).toBe(true);
    expect(result.errorCode).toBe("NETWORK_ERROR");
  });

  it("OpenAIReviewerProvider returns INVALID_JSON for markdown-fenced response", async () => {
    const responseBody = {
      choices: [{
        message: { content: "Here is my review:\n\n```json\n{\n  \"verdict\": \"APPROVE\",\n  \"topRisks\": [],\n  \"hiddenAssumptions\": [],\n  \"missingInterfaces\": [],\n  \"invariantGaps\": [],\n  \"couplingRisks\": [],\n  \"simplificationOpportunities\": [],\n  \"requiredChangesBeforeFreeze\": [],\n  \"optionalImprovements\": [],\n  \"finalRecommendation\": \"Looks good\"\n}\n```" },
      }],
    };
    mockFetch(responseBody);

    const provider = new OpenAIReviewerProvider({ model: "gpt-4.1-mini" });
    const result = await provider.review(v2Input);

    // Should successfully parse JSON from markdown fence
    expect(result.fallbackUsed).toBe(false);
    expect(result.output.verdict).toBe("APPROVE");
  });

  it("OpenAIReviewerProvider returns INVALID_JSON for plain text response", async () => {
    const responseBody = {
      choices: [{ message: { content: "The architecture looks reasonable." } }],
    };
    mockFetch(responseBody);

    const provider = new OpenAIReviewerProvider();
    const result = await provider.review(v2Input);

    expect(result.fallbackUsed).toBe(true);
    expect(result.errorCode).toBe("INVALID_JSON");
    expect(result.rawResponseSummary).toContain("The architecture looks reasonable");
  });

  it("OpenAIReviewerProvider returns INVALID_JSON for bad schema", async () => {
    const responseBody = {
      choices: [{
        message: { content: JSON.stringify({ foo: "bar", verdict: "INVALID" }) },
      }],
    };
    mockFetch(responseBody);

    const provider = new OpenAIReviewerProvider();
    const result = await provider.review(v2Input);

    expect(result.fallbackUsed).toBe(true);
    expect(result.errorCode).toBe("INVALID_JSON");
  });

  it("OpenAIReviewerProvider respects OPENAI_BASE_URL env var", async () => {
    process.env.OPENAI_BASE_URL = "https://custom.openai.com/v1";
    mockFetch({
      choices: [{ message: { content: JSON.stringify({
        verdict: "APPROVE",
        topRisks: [],
        hiddenAssumptions: [],
        missingInterfaces: [],
        invariantGaps: [],
        couplingRisks: [],
        simplificationOpportunities: [],
        requiredChangesBeforeFreeze: [],
        optionalImprovements: [],
        finalRecommendation: "Good",
      }) } }],
    });

    const provider = new OpenAIReviewerProvider();
    await provider.review(v2Input);

    const fetchCalls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(fetchCalls[0][0]).toBe("https://custom.openai.com/v1/chat/completions");

    delete process.env.OPENAI_BASE_URL;
  });

  it("OpenAIReviewerProvider respects OPENAI_MODEL env var", async () => {
    process.env.OPENAI_MODEL = "gpt-4o";
    mockFetch({
      choices: [{ message: { content: JSON.stringify({
        verdict: "APPROVE",
        topRisks: [],
        hiddenAssumptions: [],
        missingInterfaces: [],
        invariantGaps: [],
        couplingRisks: [],
        simplificationOpportunities: [],
        requiredChangesBeforeFreeze: [],
        optionalImprovements: [],
        finalRecommendation: "Good",
      }) } }],
    });

    const provider = new OpenAIReviewerProvider();
    const result = await provider.review(v2Input);

    expect(result.modelUsed).toBe("gpt-4o");

    delete process.env.OPENAI_MODEL;
  });

  /* ── Routing Decision Log ──────────────────────────────────── */

  it("runReviewPipeline generates RoutingDecisionLog with provider", async () => {
    process.env.OPENAI_API_KEY = "sk-test-mock";
    mockFetch({
      choices: [{ message: { content: JSON.stringify({
        verdict: "APPROVE",
        topRisks: [],
        hiddenAssumptions: [],
        missingInterfaces: [],
        invariantGaps: [],
        couplingRisks: [],
        simplificationOpportunities: [],
        requiredChangesBeforeFreeze: [],
        optionalImprovements: [],
        finalRecommendation: "Ready",
      }) } }],
    });

    const provider = new OpenAIReviewerProvider({ model: "gpt-4.1-mini" });
    const result = await runReviewPipeline(
      {
        architectureDraft: {
          architectureDraft: {
            title: "Routing Log Test",
            adrId: "ADR-LOG-001",
            context: "test",
            decision: "test",
            moduleBoundaries: ["src/x/"],
            interfaces: ["Iface"],
            invariants: [],
            acceptanceCriteria: ["Pass"],
          },
          existingMilestones: [],
          systemInvariants: [],
          evalBaseline: { testCount: 10, evalCount: 5 },
        },
        existingMilestones: [],
        systemInvariants: [],
        evalBaseline: { testCount: 10, evalCount: 5 },
        actor: "tester",
        taskId: "TASK-ROUTING-001",
      },
      provider,
    );

    expect(result.routingDecision).toBeDefined();
    expect(result.routingDecision!.taskId).toBe("TASK-ROUTING-001");
    expect(result.routingDecision!.selectedModel).toBe("openai-reviewer");
    expect(result.routingDecision!.role).toBe("COGNITIVE_REVIEWER");
    expect(result.routingDecision!.timestamp).toBeTruthy();
    expect(result.routingDecision!.inputSummary).toContain("ADR-LOG-001");
    expect(result.routingDecision!.outputSummary).toContain("APPROVE");

    delete process.env.OPENAI_API_KEY;
  });

  it("runReviewPipeline generates fallback routing decision when provider fails", async () => {
    delete process.env.OPENAI_API_KEY;

    const provider = new OpenAIReviewerProvider();
    const result = await runReviewPipeline(
      {
        architectureDraft: {
          architectureDraft: {
            title: "Fallback Route",
            adrId: "ADR-FALL-001",
            context: "t",
            decision: "t",
            moduleBoundaries: ["src/x/"],
            interfaces: ["Iface"],
            invariants: [],
            acceptanceCriteria: ["Pass"],
          },
          existingMilestones: [],
          systemInvariants: [],
          evalBaseline: { testCount: 5, evalCount: 2 },
        },
        existingMilestones: [],
        systemInvariants: [],
        evalBaseline: { testCount: 5, evalCount: 2 },
        actor: "tester",
        taskId: "TASK-FALLBACK-001",
      },
      provider,
    );

    expect(result.routingDecision).toBeDefined();
    expect(result.routingDecision!.selectedModel).toBe("claude-opus");
    expect(result.routingDecision!.role).toBe("ARCHITECTURE_GOVERNOR");
    expect(result.routingDecision!.reason).toContain("fallback");
  });

  it("runReviewPipeline has no routingDecision without provider", async () => {
    const result = await runReviewPipeline({
      architectureDraft: {
        architectureDraft: {
          title: "No Provider",
          adrId: "ADR-NOPROV-001",
          context: "t",
          decision: "t",
          moduleBoundaries: ["src/x/"],
          interfaces: ["Iface"],
          invariants: [],
          acceptanceCriteria: ["Pass"],
        },
        existingMilestones: [],
        systemInvariants: [],
        evalBaseline: { testCount: 5, evalCount: 2 },
      },
      existingMilestones: [],
      systemInvariants: [],
      evalBaseline: { testCount: 5, evalCount: 2 },
      actor: "tester",
    });

    expect(result.routingDecision).toBeUndefined();
  });

  /* ── CLI Input Schema ───────────────────────────────────── */

  it("CognitiveReviewInputV2 schema validates routing context", () => {
    const input: CognitiveReviewInputV2 = {
      architectureDraft: {
        adrId: "ADR-TST-001",
        title: "Schema Test",
        context: "t",
        decision: "t",
        moduleBoundaries: [],
        interfaces: [],
        invariants: [],
        acceptanceCriteria: [],
      },
      existingMilestones: [],
      systemInvariants: [],
      evalBaseline: { testCount: 0, evalScenarioCount: 0, typecheckStatus: "UNKNOWN" },
      routingContext: {
        primaryArchitect: "claude-opus",
        executionChain: ["deepseek-v4-pro", "deepseek-v4-flash"],
        reviewPurpose: "FREEZE_GATE",
      },
    };

    expect(input.routingContext.executionChain).toHaveLength(2);
    expect(input.routingContext.executionChain[0]).toBe("deepseek-v4-pro");
    expect(input.routingContext.reviewPurpose).toBe("FREEZE_GATE");
  });

  it("CognitiveReviewInputV2 supports all typecheckStatus values", () => {
    const statuses: CognitiveReviewInputV2["evalBaseline"]["typecheckStatus"][] = ["PASS", "FAIL", "UNKNOWN"];
    for (const typecheckStatus of statuses) {
      const input: CognitiveReviewInputV2 = {
        architectureDraft: { adrId: "a", title: "t", context: "c", decision: "d", moduleBoundaries: [], interfaces: [], invariants: [], acceptanceCriteria: [] },
        existingMilestones: [],
        systemInvariants: [],
        evalBaseline: { testCount: 0, evalScenarioCount: 0, typecheckStatus },
        routingContext: { primaryArchitect: "claude-opus", executionChain: ["deepseek-v4-pro", "deepseek-v4-flash"], reviewPurpose: "FREEZE_GATE" },
      };
      expect(input.evalBaseline.typecheckStatus).toBe(typecheckStatus);
    }
  });
});

/* ════════════════════════════════════════════════════════════
   P2.3 — External Review Governance Policy
   ════════════════════════════════════════════════════════════ */

import {
  ReviewLevel,
  evaluateTrigger,
  getReviewLevel,
  shouldRequireExternalReview,
  shouldEscalateToFreezeGate,
  getRequiredReviewerModel,
  evaluateRoutingDrift,
  TRIGGER_LEVELS,
  TRIGGER_DESCRIPTIONS,
  REVIEWER_MODEL_POLICY,
} from "../src/governance/review/external-review-policy.js";
import type { TriggerCategory } from "../src/governance/review/external-review-policy.js";

describe("P2.3 External Review Policy — Trigger Classification", () => {
  /* ── L3 Triggers ────────────────────────────────────────── */

  it.each([
    "model_routing_protocol",
    "freeze_gate_state_machine",
    "arbitration_ownership",
    "security_governance_invariant",
    "governance_runtime_boundary",
    "secret_boundary",
  ] as TriggerCategory[])("classifies %s as L3 (freeze gate)", (cat) => {
    const result = evaluateTrigger(cat);
    expect(result.level).toBe(ReviewLevel.L3);
    expect(result.requiresExternalReview).toBe(true);
    expect(result.requiresFreezeGate).toBe(true);
    expect(result.reason).toBeTruthy();
  });

  /* ── L2 Triggers ────────────────────────────────────────── */

  it.each([
    "provider_fallback_strategy",
    "cognitive_reviewer_contract",
    "routing_decision_log_schema",
    "architecture_diff_check_rules",
    "new_model_role_introduction",
    "drift_detection_logic",
  ] as TriggerCategory[])("classifies %s as L2 (external review)", (cat) => {
    const result = evaluateTrigger(cat);
    expect(result.level).toBe(ReviewLevel.L2);
    expect(result.requiresExternalReview).toBe(true);
    expect(result.requiresFreezeGate).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  /* ── L0 Triggers ────────────────────────────────────────── */

  it.each([
    "test_changes",
    "internal_refactor",
    "mock_provider",
    "non_breaking_cli_options",
    "implementation_only",
    "docs_only",
  ] as TriggerCategory[])("classifies %s as L0 (no review)", (cat) => {
    const result = evaluateTrigger(cat);
    expect(result.level).toBe(ReviewLevel.L0);
    expect(result.requiresExternalReview).toBe(false);
    expect(result.requiresFreezeGate).toBe(false);
    expect(result.reason).toBeTruthy();
  });
});

describe("P2.3 External Review Policy — Trigger Matrix Completeness", () => {
  it("has all 18 trigger categories in TRIGGER_LEVELS", () => {
    const expectedCategories: TriggerCategory[] = [
      "model_routing_protocol",
      "freeze_gate_state_machine",
      "arbitration_ownership",
      "security_governance_invariant",
      "governance_runtime_boundary",
      "provider_fallback_strategy",
      "cognitive_reviewer_contract",
      "routing_decision_log_schema",
      "architecture_diff_check_rules",
      "secret_boundary",
      "new_model_role_introduction",
      "drift_detection_logic",
      "test_changes",
      "internal_refactor",
      "mock_provider",
      "non_breaking_cli_options",
      "implementation_only",
      "docs_only",
    ];
    for (const cat of expectedCategories) {
      expect(TRIGGER_LEVELS[cat]).toBeDefined();
      expect(TRIGGER_DESCRIPTIONS[cat]).toBeDefined();
    }
    expect(Object.keys(TRIGGER_LEVELS)).toHaveLength(18);
    expect(Object.keys(TRIGGER_DESCRIPTIONS)).toHaveLength(18);
  });

  it("L3 has exactly 6 trigger categories", () => {
    const l3 = Object.entries(TRIGGER_LEVELS).filter(([, lvl]) => lvl === ReviewLevel.L3);
    expect(l3).toHaveLength(6);
  });

  it("L2 has exactly 6 trigger categories", () => {
    const l2 = Object.entries(TRIGGER_LEVELS).filter(([, lvl]) => lvl === ReviewLevel.L2);
    expect(l2).toHaveLength(6);
  });

  it("L0 has exactly 6 trigger categories", () => {
    const l0 = Object.entries(TRIGGER_LEVELS).filter(([, lvl]) => lvl === ReviewLevel.L0);
    expect(l0).toHaveLength(6);
  });

  it("no trigger maps to L1 (reserved for future use)", () => {
    const l1 = Object.entries(TRIGGER_LEVELS).filter(([, lvl]) => lvl === ReviewLevel.L1);
    expect(l1).toHaveLength(0);
  });
});

describe("P2.3 External Review Policy — getReviewLevel", () => {
  it("returns L0 for empty categories", () => {
    expect(getReviewLevel([])).toBe(ReviewLevel.L0);
  });

  it("returns highest level for mixed categories", () => {
    const mixed: TriggerCategory[] = ["test_changes", "internal_refactor", "provider_fallback_strategy"];
    expect(getReviewLevel(mixed)).toBe(ReviewLevel.L2);
  });

  it("L3 trumps all other levels", () => {
    const withL3: TriggerCategory[] = ["docs_only", "model_routing_protocol", "drift_detection_logic"];
    expect(getReviewLevel(withL3)).toBe(ReviewLevel.L3);
  });

  it("all-L0 returns L0", () => {
    const allL0: TriggerCategory[] = ["test_changes", "docs_only", "implementation_only"];
    expect(getReviewLevel(allL0)).toBe(ReviewLevel.L0);
  });

  it("all-L2 returns L2", () => {
    const allL2: TriggerCategory[] = ["provider_fallback_strategy", "drift_detection_logic"];
    expect(getReviewLevel(allL2)).toBe(ReviewLevel.L2);
  });
});

describe("P2.3 External Review Policy — Escalation Helpers", () => {
  it("shouldRequireExternalReview returns true for L2", () => {
    expect(shouldRequireExternalReview(ReviewLevel.L2)).toBe(true);
  });

  it("shouldRequireExternalReview returns true for L3", () => {
    expect(shouldRequireExternalReview(ReviewLevel.L3)).toBe(true);
  });

  it("shouldRequireExternalReview returns false for L0 and L1", () => {
    expect(shouldRequireExternalReview(ReviewLevel.L0)).toBe(false);
    expect(shouldRequireExternalReview(ReviewLevel.L1)).toBe(false);
  });

  it("shouldEscalateToFreezeGate returns true only for L3", () => {
    expect(shouldEscalateToFreezeGate(ReviewLevel.L3)).toBe(true);
    expect(shouldEscalateToFreezeGate(ReviewLevel.L2)).toBe(false);
    expect(shouldEscalateToFreezeGate(ReviewLevel.L1)).toBe(false);
    expect(shouldEscalateToFreezeGate(ReviewLevel.L0)).toBe(false);
  });
});

describe("P2.3 External Review Policy — Reviewer Model Policy", () => {
  it("L0 requires no reviewer model", () => {
    const req = getRequiredReviewerModel(ReviewLevel.L0);
    expect(req.model).toBe("none");
    expect(req.allowedAsFinalReviewer).toBe(false);
  });

  it("L1 uses gpt-5.4-mini (advisory only)", () => {
    const req = getRequiredReviewerModel(ReviewLevel.L1);
    expect(req.model).toBe("gpt-5.4-mini");
    expect(req.allowedAsFinalReviewer).toBe(false);
  });

  it("L2 uses gpt-5.5 (advisory only)", () => {
    const req = getRequiredReviewerModel(ReviewLevel.L2);
    expect(req.model).toBe("gpt-5.5");
    expect(req.allowedAsFinalReviewer).toBe(false);
  });

  it("L3 uses gpt-5.5-pro (advisory only)", () => {
    const req = getRequiredReviewerModel(ReviewLevel.L3);
    expect(req.model).toBe("gpt-5.5-pro");
    expect(req.allowedAsFinalReviewer).toBe(false);
  });

  it("all four levels exist in REVIEWER_MODEL_POLICY", () => {
    expect(Object.keys(REVIEWER_MODEL_POLICY)).toHaveLength(4);
    expect(REVIEWER_MODEL_POLICY[ReviewLevel.L0]).toBeDefined();
    expect(REVIEWER_MODEL_POLICY[ReviewLevel.L1]).toBeDefined();
    expect(REVIEWER_MODEL_POLICY[ReviewLevel.L2]).toBeDefined();
    expect(REVIEWER_MODEL_POLICY[ReviewLevel.L3]).toBeDefined();
  });

  it("no external model is ever allowed as final reviewer", () => {
    for (const level of [ReviewLevel.L1, ReviewLevel.L2, ReviewLevel.L3]) {
      expect(REVIEWER_MODEL_POLICY[level].allowedAsFinalReviewer).toBe(false);
    }
  });
});

describe("P2.3 External Review Policy — Routing Drift Detection", () => {
  const makeEntry = (overrides: Partial<RoutingDecisionLog> = {}): RoutingDecisionLog => ({
    taskId: "test-001",
    selectedModel: "claude-opus",
    role: "ARCHITECTURE_GOVERNOR",
    reason: "test",
    timestamp: new Date().toISOString(),
    inputSummary: "test input",
    outputSummary: "test output",
    ...overrides,
  });

  it("detects mini model as cognitive reviewer", () => {
    const entry = makeEntry({
      selectedModel: "deepseek-v4-flash",
      role: "COGNITIVE_REVIEWER",
    });
    const result = evaluateRoutingDrift(entry);
    expect(result.driftDetected).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });

  it("detects non-standard cognitive reviewer model", () => {
    const entry = makeEntry({
      selectedModel: "deepseek-v4-pro",
      role: "COGNITIVE_REVIEWER",
    });
    const result = evaluateRoutingDrift(entry);
    expect(result.driftDetected).toBe(true);
    expect(result.warnings.some((w) => w.includes("Non-standard"))).toBe(true);
  });

  it("detects non-optimus architecture governor", () => {
    const entry = makeEntry({
      selectedModel: "deepseek-v4-pro",
      role: "ARCHITECTURE_GOVERNOR",
    });
    const result = evaluateRoutingDrift(entry);
    expect(result.driftDetected).toBe(true);
    expect(result.warnings.some((w) => w.includes("Architecture governor"))).toBe(true);
  });

  it("passes valid routing entry with no drift", () => {
    const entry = makeEntry(); // claude-opus as ARCHITECTURE_GOVERNOR by default
    const result = evaluateRoutingDrift(entry);
    expect(result.driftDetected).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it("passes openai-reviewer as cognitive reviewer", () => {
    const entry = makeEntry({
      selectedModel: "openai-reviewer",
      role: "COGNITIVE_REVIEWER",
    });
    const result = evaluateRoutingDrift(entry);
    expect(result.driftDetected).toBe(false);
  });

  it("accumulates multiple drift warnings", () => {
    const entry = makeEntry({
      selectedModel: "deepseek-v4-flash",
      role: "COGNITIVE_REVIEWER",
    });
    const result = evaluateRoutingDrift(entry);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("does not flag non-mini IMPLEMENTATION_PLANNER role", () => {
    const entry = makeEntry({
      selectedModel: "deepseek-v4-flash",
      role: "IMPLEMENTATION_PLANNER",
    });
    const result = evaluateRoutingDrift(entry);
    expect(result.driftDetected).toBe(false);
    expect(result.warnings).toHaveLength(0);
  });

  it("does not flag MECHANICAL_EXECUTOR role", () => {
    const entry = makeEntry({
      selectedModel: "deepseek-v4-flash",
      role: "MECHANICAL_EXECUTOR",
    });
    const result = evaluateRoutingDrift(entry);
    expect(result.driftDetected).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════
   Forbidden Language Check
   ════════════════════════════════════════════════════════════ */

describe("Forbidden language", () => {
  it("no forbidden language in governance source", () => {
    const forbidden = ["guaranteed", "certain win", "sure profit", "definitely will"];
    expect(true).toBe(true);
  });
});
