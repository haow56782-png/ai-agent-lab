#!/usr/bin/env tsx
/**
 * Reviewer CLI — Cognitive Review Runner with P3.0 Governance Memory.
 *
 * Usage:
 *   tsx reviewer-cli.ts --input input.json --provider openai
 *   tsx reviewer-cli.ts --input input.json --provider mock --output result.json
 *   tsx reviewer-cli.ts --input input.json --enable-memory --enable-replay --memory-file ./memory.json
 *   tsx reviewer-cli.ts --input input.json --create-adr --adr-output ./adr.md --freeze-version freeze-2026-05-07
 *   tsx reviewer-cli.ts --help
 *
 * NOTE: This CLI must NEVER read API keys directly. API keys are
 * read by the provider (OpenAIReviewerProvider via process.env).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { OpenAIReviewerProvider } from "./openai-reviewer-provider.js";
import { MockReviewerProvider } from "./mock-reviewer-provider.js";
import { GovernanceMemoryStore } from "../memory/governance-memory.js";
import { ReviewLevel } from "./external-review-policy.js";
import { InvariantRegistry } from "../memory/invariant-registry.js";
import { GovernanceCostGuard } from "../memory/governance-cost-guard.js";
import { loadGovernanceMemoryFile, saveGovernanceMemoryFile, createEmptyGovernanceMemoryFile, appendGovernanceMemoryFileEntry, appendFreezeSnapshotToFile, checkReplayBlock, } from "../memory/governance-memory-file.js";
import { detectAuthorityDrift, detectGovernanceRuntimeLeakage, } from "../memory/drift-replay.js";
function printHelp() {
    console.log(`
Usage: tsx reviewer-cli.ts [options]

Options:
  --input <path>       Path to JSON file containing CognitiveReviewInputV2 (required)
  --output <path>      Write result to file instead of stdout
  --provider <type>    Provider: "openai" | "mock" (default: "mock")
  --timeout <ms>       Request timeout in milliseconds (default: 120000)
  --model <name>       Override the OpenAI model name (default: gpt-4.1-mini)

Governance Memory (P3.0):
  --memory-file <path> Path to governance memory JSON file
  --enable-memory      Enable governance memory tracking
  --enable-replay      Replay governance memory before review (blocks on CRITICAL violations)
  --write-memory       Write governance memory entry after review
  --create-adr         Generate a Cognitive ADR draft from review results
  --adr-output <path>  Write ADR draft to file (requires --create-adr)
  --freeze-version <v> Freeze version label for snapshot (e.g. freeze-2026-05-07)
  --decision-id <id>   Decision identifier for governance tracking

Cost Guard (P3.1):
  --cost-guard <bool>         Enable cost guard (default: true)
  --max-cost-tier <tier>      Max allowed cost tier: ZERO_COST|LOW_COST|MEDIUM_COST|HIGH_COST (default: MEDIUM_COST)
  --allow-l1-external-review  Allow external reviewer call for L1 proposals
  --disable-review-cache      Disable review result caching by decision hash
  --replay-scope <scope>      Replay scope: touched|related|full (default: touched)

  --help               Show this help message

Examples:
  tsx reviewer-cli.ts --input ./review-input.json --provider openai
  tsx reviewer-cli.ts --input ./input.json --enable-memory --enable-replay --memory-file ./mem.json
  tsx reviewer-cli.ts --input ./input.json --create-adr --adr-output ./adr-draft.md --freeze-version v1
`);
}
function parseArgs() {
    const args = process.argv.slice(2);
    const opts = {
        provider: "mock",
        help: false,
        enableMemory: false,
        enableReplay: false,
        writeMemory: false,
        createAdr: false,
        costGuardEnabled: true,
        allowL1ExternalReview: false,
        disableReviewCache: false,
        replayScope: "touched",
    };
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case "--input":
                opts.input = args[++i];
                break;
            case "--output":
                opts.output = args[++i];
                break;
            case "--provider":
                opts.provider = args[++i] ?? "mock";
                break;
            case "--timeout":
                opts.timeout = Number(args[++i]) || undefined;
                break;
            case "--model":
                opts.model = args[++i];
                break;
            // P3.0 Governance Memory flags
            case "--memory-file":
                opts.memoryFile = args[++i];
                break;
            case "--enable-memory":
                opts.enableMemory = true;
                break;
            case "--enable-replay":
                opts.enableReplay = true;
                break;
            case "--write-memory":
                opts.writeMemory = true;
                break;
            case "--create-adr":
                opts.createAdr = true;
                break;
            case "--adr-output":
                opts.adrOutput = args[++i];
                break;
            case "--freeze-version":
                opts.freezeVersion = args[++i];
                break;
            case "--decision-id":
                opts.decisionId = args[++i];
                break;
            // P3.1 Cost Guard flags
            case "--cost-guard":
                opts.costGuardEnabled = args[++i] !== "false";
                break;
            case "--max-cost-tier":
                opts.maxCostTier = args[++i];
                break;
            case "--allow-l1-external-review":
                opts.allowL1ExternalReview = true;
                break;
            case "--disable-review-cache":
                opts.disableReviewCache = true;
                break;
            case "--replay-scope":
                opts.replayScope = args[++i];
                break;
            case "--help":
            case "-h":
                opts.help = true;
                break;
        }
    }
    return opts;
}
async function main() {
    const opts = parseArgs();
    if (opts.help) {
        printHelp();
        process.exit(0);
    }
    if (!opts.input) {
        console.error("Error: --input is required. Use --help for usage.");
        process.exit(1);
    }
    if (opts.enableReplay && !opts.memoryFile) {
        console.error("Error: --enable-replay requires --memory-file");
        process.exit(1);
    }
    if (opts.createAdr && !opts.adrOutput) {
        console.error("Error: --create-adr requires --adr-output");
        process.exit(1);
    }
    // Read and parse input
    let input;
    try {
        const raw = readFileSync(opts.input, "utf-8");
        input = JSON.parse(raw);
    }
    catch (err) {
        const errorResult = {
            success: false,
            error: {
                code: "INPUT_PARSE_FAILED",
                message: `Error reading input file "${opts.input}": ${err instanceof Error ? err.message : String(err)}`,
            },
        };
        console.log(JSON.stringify(errorResult, null, 2));
        process.exit(1);
    }
    // ── Governance Replay ──────────────────────────────────────
    const resolvedMemoryPath = opts.memoryFile;
    let memoryFile = resolvedMemoryPath && existsSync(resolvedMemoryPath)
        ? loadGovernanceMemoryFile(resolvedMemoryPath)
        : (opts.enableMemory || opts.enableReplay ? createEmptyGovernanceMemoryFile() : undefined);
    if (opts.enableReplay && memoryFile) {
        const memoryStore = new GovernanceMemoryStore();
        // Load existing entries into store for replay
        for (const entry of memoryFile.entries) {
            try {
                memoryStore.appendGovernanceMemoryEntry(entry);
            }
            catch { /* skip dupes */ }
        }
        const adrId = input.architectureDraft.adrId;
        const relevantEntries = memoryStore.getEntriesByADRId(adrId);
        // Authority drift check
        const driftWarnings = [];
        for (const entry of relevantEntries) {
            const authWarnings = detectAuthorityDrift(entry);
            driftWarnings.push(...authWarnings.map((w) => ({ ...w })));
            const leakWarnings = detectGovernanceRuntimeLeakage(entry);
            driftWarnings.push(...leakWarnings.map((w) => ({ ...w })));
        }
        // Check invariants
        const invariants = input.architectureDraft.invariants ?? [];
        const registry = new InvariantRegistry();
        for (const invId of invariants) {
            const inv = registry.getInvariantById(invId);
            if (inv && inv.severity === "CONSTITUTIONAL") {
                driftWarnings.push({
                    type: "INVARIANT_CHECK",
                    severity: "CRITICAL",
                    description: `Constitutional invariant ${invId} touched`,
                    detail: inv.description,
                });
            }
        }
        // Check block
        const blockResult = checkReplayBlock(driftWarnings);
        if (blockResult.blocked) {
            const errorResult = {
                success: false,
                governanceReplayBlocked: true,
                error: {
                    code: "GOVERNANCE_REPLAY_BLOCKED",
                    message: blockResult.reason ?? "Governance replay blocked execution",
                },
            };
            console.log(JSON.stringify({ ...errorResult, violations: blockResult.violations }, null, 2));
            process.exit(1);
        }
    }
    // ── Cost Guard Evaluation ──────────────────────────────────────
    let costGuardBlocked = false;
    let useLocalDecision = false;
    const costGuard = new GovernanceCostGuard();
    if (opts.costGuardEnabled) {
        const costGuardConfig = {
            enabled: true,
            maxCostTier: opts.maxCostTier ?? "MEDIUM_COST",
            allowL1ExternalReview: opts.allowL1ExternalReview,
            disableReviewCache: opts.disableReviewCache,
            replayScope: opts.replayScope,
        };
        const proposalMetadata = {
            title: input.architectureDraft.title,
            description: input.architectureDraft.context,
            triggerCategories: [],
            adrId: input.architectureDraft.adrId,
            decision: input.architectureDraft.decision,
            freezeVersion: opts.freezeVersion,
        };
        const costGuardResult = costGuard.evaluate(proposalMetadata, costGuardConfig);
        if (costGuardResult.blocked) {
            costGuardBlocked = true;
            const errorResult = {
                success: false,
                error: {
                    code: "COST_GUARD_BLOCKED",
                    message: costGuardResult.blockReason ?? `Cost tier ${costGuardResult.costTier} exceeds max ${costGuardConfig.maxCostTier}`,
                },
            };
            console.log(JSON.stringify(errorResult, null, 2));
            process.exit(1);
        }
        if (costGuardResult.reviewLevel === "L0" || (costGuardResult.reviewLevel === "L1" && !opts.allowL1ExternalReview)) {
            useLocalDecision = true;
        }
    }
    // Build provider config
    const providerConfig = {};
    if (opts.timeout)
        providerConfig.timeoutMs = opts.timeout;
    if (opts.model)
        providerConfig.model = opts.model;
    if (useLocalDecision) {
        // Local-only decision: bypass external provider
        const verboseResult = {
            success: true,
            result: { verdict: "APPROVE", reasoning: "Local decision — cost guard bypassed external review", requiredChanges: [], acceptedFindings: [], rejectedFindings: [], riskAssessment: { overall: "LOW", risks: [] }, recommendations: [] },
            governanceMemoryWritten: false,
            adrDraftCreated: false,
            freezeSnapshotCreated: false,
        };
        const output = JSON.stringify(verboseResult, null, 2);
        if (opts.output) {
            writeFileSync(opts.output, output, "utf-8");
            console.error(`Result written to ${opts.output}`);
        }
        else {
            console.log(output);
        }
        return;
    }
    const provider = opts.provider === "openai"
        ? new OpenAIReviewerProvider(providerConfig)
        : new MockReviewerProvider();
    // Run review
    try {
        const result = await provider.review(input);
        // ── Write Governance Memory Entry ─────────────────────────
        let governanceEntryId;
        if (opts.writeMemory && memoryFile) {
            const memoryStore = new GovernanceMemoryStore();
            // Load existing entries
            for (const entry of memoryFile.entries) {
                try {
                    memoryStore.appendGovernanceMemoryEntry(entry);
                }
                catch { /* skip */ }
            }
            const entry = memoryStore.createGovernanceMemoryEntry({
                decisionId: opts.decisionId ?? `cli-${input.architectureDraft.adrId}-${Date.now()}`,
                adrId: input.architectureDraft.adrId,
                reviewLevel: ReviewLevel.L2,
                reviewerModels: [opts.provider === "openai" ? "openai-reviewer" : "mock-reviewer", "claude-opus"],
                arbitrationOwner: "claude-opus",
                freezeVersion: opts.freezeVersion ?? "",
                invariantsTouched: input.architectureDraft.invariants ?? [],
                driftRiskLevel: result.fallbackUsed ? "HIGH" : "MEDIUM",
                relatedADRIds: [],
                auditLogIds: [],
                routingDecisionLogIds: [],
            });
            appendGovernanceMemoryFileEntry(memoryFile, entry);
            governanceEntryId = entry.id;
            // Create freeze snapshot if freeze version is provided
            if (opts.freezeVersion && !result.fallbackUsed) {
                const snapshot = memoryStore.createFreezeSnapshot({
                    adrId: input.architectureDraft.adrId,
                    freezeVersion: opts.freezeVersion,
                    frozenBy: "cli-user",
                    invariantsCaptured: input.architectureDraft.invariants ?? [],
                    relatedEntryIds: [entry.id],
                    decisionHash: entry.decisionHash,
                });
                appendFreezeSnapshotToFile(memoryFile, snapshot);
            }
            // Save file
            if (resolvedMemoryPath) {
                saveGovernanceMemoryFile(resolvedMemoryPath, memoryFile);
            }
        }
        // ── Create ADR Draft (markdown only — no memory entry) ────
        if (opts.createAdr && opts.adrOutput) {
            const reviewerOutcome = result.output?.verdict ?? "APPROVE_WITH_CHANGES";
            const adrContent = `# ADR-DRAFT: ${input.architectureDraft.title}

**Status:** DRAFT
**Review Level:** ${opts.freezeVersion ? "L3" : "L2"}
**Freeze Version:** ${opts.freezeVersion ?? "(not frozen)"}
**Date:** ${new Date().toISOString().slice(0, 10)}

## Context
${input.architectureDraft.context}

## Problem Statement
Architecture review for ${input.architectureDraft.title}

## Decision
${input.architectureDraft.decision}

## Rationale
Reviewed via ${opts.provider} provider. Arbitration ensures governance compliance.

## External Reviewer Findings
${result.fallbackUsed ? `- Provider fallback: ${result.errorCode ?? "unknown"}` : "- External review completed"}

## Arbitration Outcome
${reviewerOutcome}

## Drift Risk
${result.fallbackUsed ? "HIGH" : "MEDIUM"}

## Constitutional Impact
NONE

## Reversal Conditions
${opts.freezeVersion ? "- Requires L3 Freeze Gate thaw protocol" : "(none specified)"}

## Related Invariants
${(input.architectureDraft.invariants ?? []).map((i) => `- ${i}`).join("\n") || "(none)"}

---
*Auto-generated by reviewer-cli. Status is DRAFT — not ACCEPTED until Freeze Gate approval.*
`;
            writeFileSync(opts.adrOutput, adrContent, "utf-8");
        }
        // ── Output ────────────────────────────────────────────────
        const verboseResult = {
            success: true,
            result: result.output ?? result,
            governanceMemoryWritten: opts.writeMemory && memoryFile !== undefined,
            adrDraftCreated: opts.createAdr,
            freezeSnapshotCreated: !!(opts.freezeVersion && opts.writeMemory && memoryFile),
            governanceEntryId,
        };
        const output = JSON.stringify(verboseResult, null, 2);
        if (opts.output) {
            writeFileSync(opts.output, output, "utf-8");
            console.error(`Result written to ${opts.output}`);
        }
        else {
            console.log(output);
        }
    }
    catch (err) {
        const errorResult = {
            success: false,
            error: {
                code: "REVIEW_FAILED",
                message: err instanceof Error ? err.message : String(err),
            },
        };
        console.log(JSON.stringify(errorResult, null, 2));
        process.exit(1);
    }
}
main();
//# sourceMappingURL=reviewer-cli.js.map