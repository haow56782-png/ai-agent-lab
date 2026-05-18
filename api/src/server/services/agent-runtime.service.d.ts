/**
 * Agent Runtime Service — wraps existing agent loop, prediction pipeline,
 * governance review-runner, and tools into a shared service layer.
 *
 * Used by both the API Server and (future) CLI refactor.
 */
import type { SignalOutputContract } from "../../protocols/signal-output-contract.js";
export interface AnalyzeInput {
    prompt: string;
    userId?: string;
}
export interface AnalyzeResult {
    output: string;
    signal?: SignalOutputContract;
}
/**
 * Run the agent on a given prompt and return the result.
 *
 * This is the shared entry point for both CLI and API Server.
 * Currently wraps the existing createAgent().run() path.
 */
export declare function runAgent(input: AnalyzeInput): Promise<AnalyzeResult>;
//# sourceMappingURL=agent-runtime.service.d.ts.map