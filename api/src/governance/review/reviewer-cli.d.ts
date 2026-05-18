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
export {};
//# sourceMappingURL=reviewer-cli.d.ts.map