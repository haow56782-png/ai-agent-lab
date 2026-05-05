import "dotenv/config";
import OpenAI from "openai";

export type LLMMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

export interface LLMConfig {
  baseURL?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export function createLLM(config?: LLMConfig) {
  const client = new OpenAI({
    baseURL: config?.baseURL ?? process.env.LLM_BASE_URL ?? "https://api.deepseek.com",
    apiKey: config?.apiKey ?? process.env.DEEPSEEK_API_KEY,
  });

  const defaultModel = config?.model ?? process.env.LLM_MODEL ?? "deepseek-chat";

  async function chat(
    messages: LLMMessage[],
    overrides?: Partial<LLMConfig>,
  ) {
    const response = await client.chat.completions.create({
      model: overrides?.model ?? defaultModel,
      messages,
      temperature: overrides?.temperature ?? config?.temperature ?? 0.7,
      max_tokens: overrides?.maxTokens ?? config?.maxTokens ?? 4096,
    });

    return response.choices[0]?.message?.content ?? "";
  }

  /** Stream a chat response, yielding text chunks */
  async function* stream(
    messages: LLMMessage[],
    overrides?: Partial<LLMConfig>,
  ): AsyncGenerator<string> {
    const stream = await client.chat.completions.create({
      model: overrides?.model ?? defaultModel,
      messages,
      temperature: overrides?.temperature ?? config?.temperature ?? 0.7,
      max_tokens: overrides?.maxTokens ?? config?.maxTokens ?? 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) yield delta;
    }
  }

  return { chat, stream, client };
}
