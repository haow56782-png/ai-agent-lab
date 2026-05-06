import "dotenv/config";
import OpenAI from "openai";
import { get as getConfig } from "./config.js";
import { logger } from "./logger.js";
import { beginSpan, endSpan } from "./tracer.js";
import { recordLLMCall } from "./telemetry.js";

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
  timeoutMs?: number;
  retryMax?: number;
  retryDelayMs?: number;
}

export function createLLM(config?: LLMConfig) {
  const baseURL = config?.baseURL ?? process.env.LLM_BASE_URL ?? "https://api.deepseek.com";
  const apiKey = config?.apiKey ?? process.env.DEEPSEEK_API_KEY;
  const defaultModel = config?.model ?? process.env.LLM_MODEL ?? getConfig<string>("llm.model");
  const timeoutMs = config?.timeoutMs ?? getConfig<number>("llm.timeoutMs");
  const retryMax = config?.retryMax ?? getConfig<number>("llm.retry.max");
  const retryDelayMs = config?.retryDelayMs ?? getConfig<number>("llm.retry.delayMs");

  const client = new OpenAI({
    baseURL,
    apiKey,
    timeout: timeoutMs,
    maxRetries: 0, // we handle retry ourselves
  });

  async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Determine if an error is retryable */
  function isRetryable(error: unknown): boolean {
    if (error instanceof OpenAI.APIError) {
      // 429 rate limit, 5xx server errors → retryable
      return error.status === 429 || (error.status >= 500 && error.status < 600);
    }
    // Network errors (ECONNRESET, ETIMEDOUT, etc.) → retryable
    if (error instanceof TypeError) return true;
    return false;
  }

  async function chat(
    messages: LLMMessage[],
    overrides?: Partial<LLMConfig>,
  ) {
    const span = beginSpan("llm.chat", {
      model: overrides?.model ?? defaultModel,
      messageCount: messages.length,
    });

    let lastError: Error | undefined;
    const maxAttempts = overrides?.retryMax ?? retryMax;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const start = performance.now();
        const response = await client.chat.completions.create({
          model: overrides?.model ?? defaultModel,
          messages,
          temperature: overrides?.temperature ?? config?.temperature ?? getConfig<number>("llm.temperature"),
          max_tokens: overrides?.maxTokens ?? config?.maxTokens ?? getConfig<number>("llm.maxTokens"),
        });
        const latencyMs = Math.round(performance.now() - start);

        const content = response.choices[0]?.message?.content ?? "";
        const usage = response.usage;
        const promptTokens = usage?.prompt_tokens ?? 0;
        const completionTokens = usage?.completion_tokens ?? 0;
        const totalTokens = usage?.total_tokens ?? 0;

        // Record telemetry
        recordLLMCall({
          model: overrides?.model ?? defaultModel,
          latencyMs,
          promptTokens,
          completionTokens,
          totalTokens,
          success: true,
        });

        logger.debug("llm.chat.success", {
          model: overrides?.model ?? defaultModel,
          latencyMs,
          totalTokens,
          attempt,
        });

        endSpan(span, { latencyMs, totalTokens, success: true });
        return content;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (!isRetryable(err) || attempt >= maxAttempts) {
          // Non-retryable or out of attempts → fail
          logger.error("llm.chat.failed", {
            error: lastError.message,
            attempt,
            maxAttempts,
            status: err instanceof OpenAI.APIError ? err.status : undefined,
          });

          recordLLMCall({
            model: overrides?.model ?? defaultModel,
            latencyMs: 0,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            success: false,
            error: lastError.message,
          });

          endSpan(span, { success: false, error: lastError.message });
          throw lastError;
        }

        // Retry with exponential backoff
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        logger.warn("llm.retry", {
          attempt,
          maxAttempts,
          delayMs: delay,
          error: lastError.message,
          status: err instanceof OpenAI.APIError ? err.status : undefined,
        });
        await sleep(delay);
      }
    }

    throw lastError ?? new Error("LLM call failed after retries");
  }

  /** Stream a chat response, yielding text chunks */
  async function* stream(
    messages: LLMMessage[],
    overrides?: Partial<LLMConfig>,
  ): AsyncGenerator<string> {
    const span = beginSpan("llm.stream");

    try {
      const start = performance.now();
      const streamed = await client.chat.completions.create({
        model: overrides?.model ?? defaultModel,
        messages,
        temperature: overrides?.temperature ?? config?.temperature ?? getConfig<number>("llm.temperature"),
        max_tokens: overrides?.maxTokens ?? config?.maxTokens ?? getConfig<number>("llm.maxTokens"),
        stream: true,
      });

      let totalTokens = 0;
      for await (const chunk of streamed) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (delta) {
          totalTokens += delta.length;
          yield delta;
        }
      }

      const latencyMs = Math.round(performance.now() - start);
      recordLLMCall({
        model: overrides?.model ?? defaultModel,
        latencyMs,
        promptTokens: 0,
        completionTokens: totalTokens,
        totalTokens,
        success: true,
      });

      endSpan(span, { latencyMs, success: true });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      recordLLMCall({
        model: overrides?.model ?? defaultModel,
        latencyMs: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        success: false,
        error: error.message,
      });
      endSpan(span, { success: false, error: error.message });
      throw error;
    }
  }

  return { chat, stream, client };
}
