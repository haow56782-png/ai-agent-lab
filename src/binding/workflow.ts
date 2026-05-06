/**
 * VIB AI — Binding Workflow Orchestrator
 *
 * Runs the URL→Site→Auth→Bind→Analyze→Signal pipeline.
 * Each stage emits a RuntimeEvent and records to tracer/telemetry/StateStore.
 */

import { logger } from "../logger.js";
import { generateId } from "../tracer.js";
import { recordLLMCall, recordToolCall } from "../telemetry.js";
import type { StateStore } from "../state/types.js";
import {
  type BindingState,
  type RuntimeEvent,
  type BindingSession,
  type BindingResult,
  type BindingOptions,
  type BindingFailure,
  type AccountInfo,
  type SiteProvider,
} from "./types.js";
import { MockProviderManager } from "./mock-provider.js";

// ─── URL Validation ────────────────────────────────

interface ParsedUrl {
  protocol: string;
  hostname: string;
  href: string;
}

function parseAndValidateUrl(raw: string): { ok: true; parsed: ParsedUrl } | { ok: false; error: string } {
  if (!raw || raw.trim().length === 0) {
    return { ok: false, error: "URL is empty" };
  }
  const trimmed = raw.trim();

  // Accept demo:xxx prefixed commands
  if (trimmed.startsWith("demo:")) {
    return { ok: true, parsed: { protocol: "demo:", hostname: trimmed, href: trimmed } };
  }

  // Must have protocol
  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, error: "URL must start with http:// or https://" };
  }

  let hostname: string;
  try {
    hostname = new URL(trimmed).hostname;
  } catch {
    return { ok: false, error: "Invalid URL format — could not parse hostname" };
  }

  if (!hostname || hostname.length < 3) {
    return { ok: false, error: "URL hostname is too short" };
  }

  return { ok: true, parsed: { protocol: "https:", hostname, href: trimmed } };
}

// ─── Event Helpers ─────────────────────────────────

let _eventStartMs = 0;
function emitEvent(
  events: RuntimeEvent[],
  stage: BindingState,
  status: RuntimeEvent["status"],
  data?: Record<string, unknown>,
  error?: string,
  startMs?: number,
): RuntimeEvent {
  const nowMs = performance.now();
  const event: RuntimeEvent = {
    stage,
    timestamp: new Date().toISOString(),
    status,
    durationMs: startMs !== undefined ? Math.round(nowMs - startMs) : Math.round(nowMs - _eventStartMs),
    data,
    error,
  };
  events.push(event);
  if (status === "entered") _eventStartMs = nowMs;
  return event;
}

function logStage(stage: BindingState, status: string, detail?: string): void {
  const icon = status === "completed" ? "✅" : status === "failed" ? "❌" : "🔄";
  logger.info(`binding.stage.${stage}`, { stage, status, detail });
  // Also stdout for CLI visibility
  const label = stage.padEnd(28);
  console.log(`  ${icon} ${label} ${detail ?? ""}`);
}

// ─── Main Workflow ─────────────────────────────────

/**
 * Run the complete binding workflow from URL input to Signal Ready.
 *
 * @param options - URL, callbacks, and optional failure mode
 * @param store   - Optional StateStore for persistence
 */
export async function runBindingWorkflow(
  options: BindingOptions,
  store?: StateStore,
): Promise<BindingResult> {
  const events: RuntimeEvent[] = [];
  const sessionId = generateId();
  const startWall = new Date().toISOString();
  let state: BindingState = "INIT";

  // ── Record initial state ─────────────────────────
  emitEvent(events, "INIT", "entered");
  emitEvent(events, "INIT", "completed");

  console.log(`\n╭── VIB Agent Runtime Flow ─────────────────╮`);
  console.log(`│   Session: ${sessionId.padEnd(28)}│`);
  console.log(`╰────────────────────────────────────────────╯\n`);

  logger.info("binding.flow.start", { sessionId, url: options.url });

  const session: BindingSession = {
    sessionId,
    url: options.url,
    state,
    startedAt: startWall,
    events: [],
  };

  // ── Helper: transition to next state ─────────────
  async function transition(
    from: BindingState,
    to: BindingState,
    label: string,
    fn: () => Promise<{ data?: Record<string, unknown>; result?: string }>,
    spanName = `binding.${to.toLowerCase()}`,
  ): Promise<{ ok: boolean; failure?: BindingFailure; error?: string }> {
    state = from;
    emitEvent(events, from, "entered");
    logStage(from, "processing", label);

    const startMs = performance.now();
    emitEvent(events, to, "entered");

    try {
      const { data, result } = await fn();
      const endMs = performance.now();
      state = to;
      emitEvent(events, to, "completed", data, undefined, startMs);
      logStage(to, "completed", result);

      // Persist trace span if store available
      if (store) {
        await store.saveTraceSpan({
          id: generateId(),
          traceId: sessionId,
          spanId: generateId(),
          name: spanName,
          startMs,
          endMs,
          durationMs: Math.round(endMs - startMs),
          metadata: JSON.stringify({ from, to, data }),
        });
      }

      return { ok: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const endMs = performance.now();
      state = to; // error state
      emitEvent(events, to, "failed", undefined, error, startMs);
      logStage(to, "failed", error);

      logger.error(spanName, { from, to, error });

      // Persist failed trace span
      if (store) {
        await store.saveTraceSpan({
          id: generateId(),
          traceId: sessionId,
          spanId: generateId(),
          name: spanName,
          startMs,
          endMs,
          durationMs: Math.round(endMs - startMs),
          metadata: JSON.stringify({ from, to, error }),
        });
      }

      return { ok: false, failure: to as BindingFailure, error };
    }
  }

  // ── Stage 1: URL Validation ─────────────────────

  // Check for failure mode: invalid-url
  if (options.failureMode === "INVALID_URL") {
    const r = await transition("URL_INPUT", "INVALID_URL", "Validating URL...", async () => {
      throw new Error("URL format is invalid: missing protocol");
    });
    session.state = "INVALID_URL";
    session.failure = "INVALID_URL";
    session.error = r.error;
    return finalize(false, session, events, store);
  }

  const urlCheck = parseAndValidateUrl(options.url);
  if (!urlCheck.ok) {
    await transition("URL_INPUT", "INVALID_URL", "Validating URL...", async () => {
      throw new Error(urlCheck.error);
    });
    session.state = "INVALID_URL";
    session.failure = "INVALID_URL";
    session.error = urlCheck.error;
    return finalize(false, session, events, store);
  }

  const parsedUrl = urlCheck.parsed;
  emitEvent(events, "URL_INPUT", "entered");
  emitEvent(events, "URL_INPUT", "completed", { url: parsedUrl.href });
  logStage("URL_INPUT", "completed", `URL valid: ${parsedUrl.hostname}`);

  // ── Stage 2: Site Recognition ───────────────────

  const manager = new MockProviderManager();

  // Check for failure mode: unsupported-site
  if (options.failureMode === "UNSUPPORTED_SITE") {
    const r = await transition("SITE_RECOGNIZING", "UNSUPPORTED_SITE", "Identifying site...", async () => {
      throw new Error("No provider found for this URL");
    });
    session.state = "UNSUPPORTED_SITE";
    session.failure = "UNSUPPORTED_SITE";
    session.error = r.error;
    return finalize(false, session, events, store);
  }

  const recognition = await manager.recognizeUrl(parsedUrl.href);

  if (!recognition) {
    const known = manager.getKnownDomains().join(", ");
    const r = await transition("SITE_RECOGNIZING", "UNSUPPORTED_SITE", "Identifying site...", async () => {
      throw new Error(`Unsupported site. Known providers: ${known}`);
    });
    session.state = "UNSUPPORTED_SITE";
    session.failure = "UNSUPPORTED_SITE";
    session.error = r.error;
    return finalize(false, session, events, store);
  }

  const { provider, result: siteInfo } = recognition;

  await transition("SITE_RECOGNIZING", "SITE_RECOGNIZED", "Identifying site...", async () => ({
    data: {
      provider: siteInfo.providerName,
      siteDomain: siteInfo.siteDomain,
      displayName: siteInfo.displayName,
      supportedGames: siteInfo.supportedGames,
    },
    result: `${siteInfo.displayName} — ${siteInfo.supportedGames.length} games`,
  }));

  session.provider = siteInfo.providerName;
  session.siteDomain = siteInfo.siteDomain;

  // ── Stage 3: Authorization ──────────────────────

  const authConfirmed = options.confirmAuth
    ? await options.confirmAuth()
    : true;

  if (!authConfirmed) {
    const r = await transition("AUTH_CONFIRM_REQUIRED", "AUTH_REJECTED", "User authorization...", async () => {
      throw new Error("User declined authorization");
    });
    session.state = "AUTH_REJECTED";
    session.failure = "AUTH_REJECTED";
    session.error = r.error;
    return finalize(false, session, events, store);
  }

  // Check for failure mode: auth-reject
  if (options.failureMode === "AUTH_REJECTED") {
    const r = await transition("THIRD_PARTY_AUTHORIZING", "AUTH_REJECTED", "Performing OAuth...", async () => {
      throw new Error("OAuth authorization was rejected by the provider");
    });
    session.state = "AUTH_REJECTED";
    session.failure = "AUTH_REJECTED";
    session.error = r.error;
    return finalize(false, session, events, store);
  }

  let authToken: string;
  {
    const r = await transition("THIRD_PARTY_AUTHORIZING", "ACCOUNT_INFO_FETCHING", "Performing OAuth...", async () => {
      const authResult = await provider.authorize("mock_auth_code");
      if (!authResult.success) {
        throw new Error(authResult.error ?? "Authorization failed");
      }
      authToken = authResult.authToken!;
      return { data: { authToken: authToken.slice(0, 20) + "..." }, result: "Token acquired" };
    });
    if (!r.ok) {
      session.state = "AUTH_FAILED";
      session.failure = "AUTH_FAILED";
      session.error = r.error;
      return finalize(false, session, events, store);
    }
    authToken = authToken!;
  }

  // Record telemetry: simulated OAuth call
  recordToolCall({ name: "provider.authorize", latencyMs: 800, success: true });

  // ── Stage 4: Account Fetch ──────────────────────

  // Check for failure mode: fetch-fail
  if (options.failureMode === "ACCOUNT_FETCH_FAILED") {
    const r = await transition("ACCOUNT_INFO_FETCHING", "ACCOUNT_FETCH_FAILED", "Fetching account info...", async () => {
      throw new Error("Provider API returned 503 Service Unavailable");
    });
    session.state = "ACCOUNT_FETCH_FAILED";
    session.failure = "ACCOUNT_FETCH_FAILED";
    session.error = r.error;
    return finalize(false, session, events, store);
  }

  let account: AccountInfo;
  {
    const r = await transition("ACCOUNT_INFO_FETCHING", "ACCOUNT_BIND_CONFIRM", "Fetching account info...", async () => {
      account = await provider.fetchAccount(authToken);
      return {
        data: { platformUserId: account.platformUserId, nickname: account.nickname, gameAccountId: account.gameAccountId },
        result: `${account.nickname} (${account.gameAccountId})`,
      };
    });
    if (!r.ok) {
      session.state = "ACCOUNT_FETCH_FAILED";
      session.failure = "ACCOUNT_FETCH_FAILED";
      session.error = r.error;
      return finalize(false, session, events, store);
    }
    account = account!;
  }

  recordToolCall({ name: "provider.fetchAccount", latencyMs: 600, success: true });

  // ── Stage 5: Bind Confirmation ──────────────────

  const bindConfirmed = options.confirmBind
    ? await options.confirmBind()
    : true;

  if (!bindConfirmed) {
    const r = await transition("ACCOUNT_BIND_CONFIRM", "BIND_FAILED", "Confirming binding...", async () => {
      throw new Error("User declined binding");
    });
    session.state = "BIND_FAILED";
    session.failure = "BIND_FAILED";
    session.error = r.error;
    return finalize(false, session, events, store);
  }

  emitEvent(events, "ACCOUNT_BIND_CONFIRM", "entered");
  emitEvent(events, "ACCOUNT_BIND_CONFIRM", "completed");
  logStage("ACCOUNT_BIND_CONFIRM", "completed", "Binding confirmed");

  emitEvent(events, "ACCOUNT_BOUND", "entered");
  emitEvent(events, "ACCOUNT_BOUND", "completed", {
    gameAccountId: account.gameAccountId,
    platformUserId: account.platformUserId,
  });
  logStage("ACCOUNT_BOUND", "completed", `${account.nickname} → ${account.gameAccountId}`);

  session.account = account;
  state = "ACCOUNT_BOUND";

  // ── Stage 6: Agent Analysis → Signal ────────────

  // Check for failure mode: signal-fail
  if (options.failureMode === "SIGNAL_GENERATION_FAILED") {
    const r = await transition("AGENT_ANALYZING", "SIGNAL_GENERATION_FAILED", "Generating signal...", async () => {
      throw new Error("Signal generation failed: model returned insufficient confidence");
    });
    session.state = "SIGNAL_GENERATION_FAILED";
    session.failure = "SIGNAL_GENERATION_FAILED";
    session.error = r.error;
    return finalize(false, session, events, store);
  }

  let signalResult: Awaited<ReturnType<SiteProvider["generateSignal"]>>;
  {
    const r = await transition("AGENT_ANALYZING", "SIGNAL_READY", "Generating signal...", async () => {
      const sr = await provider.generateSignal(account);
      if (!sr.success) {
        throw new Error(sr.error ?? "Signal generation failed");
      }
      signalResult = sr;
      return {
        data: { confidence: sr.signal!.confidence, prediction: sr.signal!.prediction },
        result: `confidence ${(sr.signal!.confidence * 100).toFixed(0)}%`,
      };
    });
    if (!r.ok) {
      session.state = "SIGNAL_GENERATION_FAILED";
      session.failure = "SIGNAL_GENERATION_FAILED";
      session.error = r.error;
      return finalize(false, session, events, store);
    }
    signalResult = signalResult!;
  }

  session.signal = signalResult!.signal;
  session.state = "SIGNAL_READY";

  // Record telemetry: signal generation
  recordLLMCall({
    model: "binding-signal-analyzer",
    latencyMs: 400,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    success: true,
  });

  return finalize(true, session, events, store);
}

// ─── Finalize ─────────────────────────────────────

async function finalize(
  success: boolean,
  session: BindingSession,
  events: RuntimeEvent[],
  store?: StateStore,
): Promise<BindingResult> {
  const completedAt = new Date().toISOString();
  session.state = session.state; // already set during transitions
  session.completedAt = completedAt;
  session.events = events;

  // Persist session to StateStore
  if (store) {
    try {
      await store.saveSession({
        id: session.sessionId,
        traceId: session.sessionId,
        startedAt: session.startedAt,
        endedAt: completedAt,
        metadata: JSON.stringify({
          type: "binding",
          url: session.url,
          state: session.state,
          provider: session.provider,
          siteDomain: session.siteDomain,
          failure: session.failure,
          error: session.error,
          eventCount: events.length,
        }),
      });
    } catch (err) {
      logger.error("binding.persist_failed", { error: String(err) });
    }
  }

  // Summary
  const outcome = success ? "✅ SIGNAL_READY" : `❌ ${session.failure ?? "FAILED"}`;
  const duration = events.length >= 2
    ? `${((new Date(events[events.length - 1]!.timestamp).getTime() - new Date(events[0]!.timestamp).getTime()) / 1000).toFixed(1)}s`
    : "—";

  console.log(`\n╭── Binding Complete ───────────────────────╮`);
  console.log(`│   Outcome:  ${outcome.padEnd(35)}│`);
  console.log(`│   Provider: ${(session.provider ?? "—").padEnd(34)}│`);
  console.log(`│   Account:  ${(session.account?.gameAccountId ?? "—").padEnd(34)}│`);
  console.log(`│   Duration: ${duration.padEnd(34)}│`);
  console.log(`│   Events:   ${String(events.length).padEnd(34)}│`);
  if (session.signal) {
    console.log(`│   Signal:   ${session.signal.prediction.slice(0, 36).padEnd(34)}│`);
  }
  if (session.error) {
    console.log(`│   Error:    ${session.error.slice(0, 36).padEnd(34)}│`);
  }
  console.log(`╰────────────────────────────────────────────╯\n`);

  logger.info("binding.flow.complete", {
    sessionId: session.sessionId,
    success,
    state: session.state,
    failure: session.failure,
    events: events.length,
  });

  return { success, session, events };
}
