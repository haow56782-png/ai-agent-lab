/** ============================================================
 *  OpenAI Reviewer Provider — Real runtime call via fetch
 *
 *  Calls OpenAI /chat/completions for cognitive architecture
 *  review. No hardcoded API keys — reads from env.
 *
 *  Env vars:
 *    OPENAI_API_KEY   — required at runtime (missing → fallback)
 *    OPENAI_BASE_URL  — default https://api.openai.com/v1
 *    OPENAI_MODEL     — default gpt-4.1-mini (set in config)
 *
 *  Error types are discriminated for audit logging:
 *    MISSING_API_KEY, NETWORK_ERROR, TIMEOUT, INVALID_JSON,
 *    SCHEMA_VALIDATION_FAILED, PROVIDER_REJECTED
 *  ============================================================ */

import type {
  CognitiveReviewInputV2,
  CognitiveReviewOutputV2,
  OpenAIReviewerConfig,
  ProviderErrorCode,
} from "./review-types.js";
import { DEFAULT_OPENAI_REVIEWER_CONFIG } from "./review-types.js";
import type {
  CognitiveReviewerProvider,
  ProviderReviewResult,
} from "./cognitive-reviewer-provider.js";
import { createFallbackResult } from "./cognitive-reviewer-provider.js";

export class OpenAIReviewerProvider implements CognitiveReviewerProvider {
  readonly name = "openai-reviewer";
  private config: OpenAIReviewerConfig;

  constructor(config?: Partial<OpenAIReviewerConfig>) {
    const envModel = process.env.OPENAI_MODEL || undefined;
    this.config = {
      ...DEFAULT_OPENAI_REVIEWER_CONFIG,
      model: envModel ?? DEFAULT_OPENAI_REVIEWER_CONFIG.model,
      ...config,
    };
  }

  async review(input: CognitiveReviewInputV2): Promise<ProviderReviewResult> {
    const startTime = Date.now();
    const apiKey = process.env.OPENAI_API_KEY;

    // ── MISSING_API_KEY → safe fallback ────────────────────
    if (!apiKey) {
      return createFallbackResult("OPENAI_API_KEY environment variable not set", undefined, "MISSING_API_KEY");
    }

    const baseUrl = this.resolveBaseUrl();
    const model = this.config.model;
    const prompt = this.buildReviewPrompt(input);

    // ── Build fetch request with timeout ───────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.fetchWithRetry(baseUrl, apiKey, model, prompt, controller.signal);

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      // ── PROVIDER_REJECTED (non-2xx) ──────────────────────
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const summary = `HTTP ${response.status}: ${body.slice(0, 200)}`;
        return createFallbackResult(
          `Provider rejected (HTTP ${response.status})`,
          model,
          "PROVIDER_REJECTED",
          summary,
        );
      }

      // ── Parse response body ──────────────────────────────
      const body = await response.json().catch(() => null);
      if (!body) {
        return createFallbackResult("Empty or non-JSON response from provider", model, "INVALID_JSON");
      }

      const text = this.extractText(body);
      const parsed = this.parseJSONOutput(text, model);

      if (parsed) {
        return {
          output: parsed,
          providerName: this.name,
          modelUsed: model,
          fallbackUsed: false,
          latencyMs,
        };
      }

      // ── INVALID_JSON: model returned text but not valid JSON ─
      return createFallbackResult(
        "Provider returned non-JSON response",
        model,
        "INVALID_JSON",
        text.slice(0, 300),
      );
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof DOMException && err.name === "AbortError") {
        return createFallbackResult("Request timed out", model, "TIMEOUT");
      }

      const message = err instanceof Error ? err.message : String(err);
      return createFallbackResult(`Network error: ${message}`, model, "NETWORK_ERROR");
    }
  }

  /* ── HTTP helpers ───────────────────────────────────────── */

  private resolveBaseUrl(): string {
    if (this.config.endpoint) return this.config.endpoint;
    const envUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    return `${envUrl.replace(/\/+$/, "")}/chat/completions`;
  }

  private async fetchWithRetry(
    url: string,
    apiKey: string,
    model: string,
    prompt: string,
    signal: AbortSignal,
  ): Promise<Response> {
    let lastError: Error | undefined;
    let lastResponse: Response | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            max_tokens: 4096,
          }),
          signal,
        });

        // Retry on server errors (5xx), return immediately on client errors
        if (response.ok || response.status < 500) return response;
        lastResponse = response; // track last non-ok server response
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }

      if (attempt < this.config.maxRetries) {
        await this.sleep(this.config.retryBackoffMs * Math.pow(2, attempt));
      }
    }

    // If we exhausted retries with a server error response, return it
    if (lastResponse) return lastResponse;
    throw lastError ?? new Error("Max retries exceeded");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  /* ── Prompt building ───────────────────────────────────── */

  private buildReviewPrompt(input: CognitiveReviewInputV2): string {
    const d = input.architectureDraft;
    const sections: string[] = [
      "You are the Cognitive Architecture Reviewer. Your role is to critique architectures, not to rewrite them.",
      "",
      "## Architecture Draft",
      `Title: ${d.title}`,
      `ADR ID: ${d.adrId}`,
      `Context: ${d.context}`,
      `Decision: ${d.decision}`,
      `Module Boundaries: ${d.moduleBoundaries.join(", ") || "(none)"}`,
      `Interfaces: ${d.interfaces.join(", ") || "(none)"}`,
      `Invariants: ${d.invariants.join(", ") || "(none)"}`,
      `Acceptance Criteria: ${d.acceptanceCriteria.join(", ") || "(none)"}`,
      "",
      "## Constraints",
      "- Do NOT output implementation code.",
      "- Do NOT rewrite the architecture.",
      "- Identify hidden assumptions, missing interfaces, invariant gaps, coupling risks.",
      "- Rate each risk: LOW, MEDIUM, HIGH, or CRITICAL.",
      "- Provide a verdict: APPROVE, APPROVE_WITH_CHANGES, or REJECT.",
      "",
      "Respond with ONLY a valid JSON object (no markdown fences, no extra text):",
      "{",
      '  "verdict": "APPROVE | APPROVE_WITH_CHANGES | REJECT",',
      '  "topRisks": [{ "id": "string", "description": "string", "severity": "LOW|MEDIUM|HIGH|CRITICAL" }],',
      '  "hiddenAssumptions": ["string"],',
      '  "missingInterfaces": ["string"],',
      '  "invariantGaps": ["string"],',
      '  "couplingRisks": ["string"],',
      '  "simplificationOpportunities": ["string"],',
      '  "requiredChangesBeforeFreeze": ["string"],',
      '  "optionalImprovements": ["string"],',
      '  "finalRecommendation": "string"',
      "}",
    ];
    return sections.join("\n");
  }

  /* ── Response parsing ──────────────────────────────────── */

  private extractText(body: Record<string, unknown>): string {
    // /chat/completions format
    const choices = body.choices as Array<{ message?: { content?: string } }> | undefined;
    if (choices?.[0]?.message?.content) return choices[0].message.content;

    // Fallback: try output_text (Responses API)
    if (typeof body.output_text === "string") return body.output_text;

    // Last-resort: try output array
    const output = body.output as Array<{ content?: Array<{ text?: string }> }> | undefined;
    if (output?.[0]?.content?.[0]?.text) return output[0].content[0].text;

    return JSON.stringify(body);
  }

  private parseJSONOutput(text: string, model: string): CognitiveReviewOutputV2 | null {
    // Strip markdown fences if present
    let clean = text.trim();
    const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) clean = fenceMatch[1].trim();

    // Extract JSON object
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    try {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

      // Basic schema validation
      if (typeof parsed.verdict !== "string") return null;
      if (!["APPROVE", "APPROVE_WITH_CHANGES", "REJECT"].includes(parsed.verdict)) return null;

      return {
        verdict: parsed.verdict as CognitiveReviewOutputV2["verdict"],
        topRisks: Array.isArray(parsed.topRisks) ? parsed.topRisks.map((r: Record<string, unknown>) => ({
          id: String(r.id ?? ""),
          description: String(r.description ?? ""),
          severity: (r.severity === "LOW" || r.severity === "MEDIUM" || r.severity === "HIGH" || r.severity === "CRITICAL")
            ? r.severity : "MEDIUM",
        })) : [],
        hiddenAssumptions: this.ensureStringArray(parsed.hiddenAssumptions),
        missingInterfaces: this.ensureStringArray(parsed.missingInterfaces),
        invariantGaps: this.ensureStringArray(parsed.invariantGaps),
        couplingRisks: this.ensureStringArray(parsed.couplingRisks),
        simplificationOpportunities: this.ensureStringArray(parsed.simplificationOpportunities),
        requiredChangesBeforeFreeze: this.ensureStringArray(parsed.requiredChangesBeforeFreeze),
        optionalImprovements: this.ensureStringArray(parsed.optionalImprovements),
        finalRecommendation: String(parsed.finalRecommendation ?? ""),
        reviewerModel: model,
        reviewedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private ensureStringArray(val: unknown): string[] {
    if (!Array.isArray(val)) return [];
    return val.map((v) => String(v));
  }
}
