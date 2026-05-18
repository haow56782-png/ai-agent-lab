import "dotenv/config";
import OpenAI from "openai";
export type LLMMessage = {
    role: "system";
    content: string;
} | {
    role: "user";
    content: string;
} | {
    role: "assistant";
    content: string;
};
export interface LLMConfig {
    baseURL?: string;
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
    retryMax?: number;
    retryDelayMs?: number;
}
export declare function createLLM(config?: LLMConfig): {
    chat: (messages: LLMMessage[], overrides?: Partial<LLMConfig>) => Promise<string>;
    stream: (messages: LLMMessage[], overrides?: Partial<LLMConfig>) => AsyncGenerator<string>;
    client: OpenAI;
};
//# sourceMappingURL=llm.d.ts.map