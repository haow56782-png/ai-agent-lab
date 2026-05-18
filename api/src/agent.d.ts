import { createLLM } from "./llm.js";
export interface AgentConfig {
    projectRoot?: string;
    systemPrompt?: string;
    maxIterations?: number;
    sessionId?: string;
    /** Injectable LLM client for testing. Falls back to createLLM() if omitted. */
    llm?: ReturnType<typeof createLLM>;
    /** Enable E0–E3 boundary-aware model selection in run(). */
    enableBoundaryRouting?: boolean;
    /** Opus model name for E2/E3 execution. Falls through to DeepSeek if unset. */
    opusModel?: string;
}
export declare function createAgent(config?: AgentConfig): {
    run: (userInput: string) => Promise<string>;
    runStream: (userInput: string) => AsyncGenerator<string>;
};
//# sourceMappingURL=agent.d.ts.map