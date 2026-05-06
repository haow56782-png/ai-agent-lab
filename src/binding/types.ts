/**
 * VIB AI — Agent Runtime Flow Types
 *
 * Types for the URL→Site→Auth→Bind→Analyze→Signal pipeline.
 */

// ─── States ─────────────────────────────────────────

export type BindingState =
  | "INIT"
  | "URL_INPUT"
  | "INVALID_URL"
  | "SITE_RECOGNIZING"
  | "UNSUPPORTED_SITE"
  | "SITE_RECOGNIZED"
  | "AUTH_CONFIRM_REQUIRED"
  | "AUTH_REJECTED"
  | "THIRD_PARTY_AUTHORIZING"
  | "AUTH_FAILED"
  | "ACCOUNT_INFO_FETCHING"
  | "ACCOUNT_FETCH_FAILED"
  | "ACCOUNT_BIND_CONFIRM"
  | "BIND_FAILED"
  | "ACCOUNT_BOUND"
  | "AGENT_ANALYZING"
  | "SIGNAL_GENERATION_FAILED"
  | "SIGNAL_READY";

// ─── Runtime Event ─────────────────────────────────

/** Schema for every stage transition event emitted during binding. */
export interface RuntimeEvent {
  stage: BindingState;
  timestamp: string; // ISO-8601
  status: "entered" | "completed" | "failed";
  durationMs?: number;
  data?: Record<string, unknown>;
  error?: string;
}

// ─── Provider Interface ────────────────────────────

export interface RecognizeResult {
  supported: boolean;
  siteDomain: string;
  providerName: string;
  displayName: string;
  supportedGames: string[];
}

export interface AuthorizeResult {
  success: boolean;
  authToken?: string;
  error?: string;
}

export interface AccountInfo {
  platformUserId: string;
  nickname: string;
  avatar: string;
  gameAccountId: string;
}

export interface SignalResult {
  success: boolean;
  signal?: {
    confidence: number;
    prediction: string;
    factors: string[];
  };
  error?: string;
}

export interface SiteProvider {
  readonly name: string;
  recognize(url: string): Promise<RecognizeResult>;
  authorize(authCode: string): Promise<AuthorizeResult>;
  fetchAccount(authToken: string): Promise<AccountInfo>;
  generateSignal(account: AccountInfo): Promise<SignalResult>;
}

// ─── Workflow Result ───────────────────────────────

export type BindingFailure =
  | "INVALID_URL"
  | "UNSUPPORTED_SITE"
  | "AUTH_REJECTED"
  | "AUTH_FAILED"
  | "ACCOUNT_FETCH_FAILED"
  | "BIND_FAILED"
  | "SIGNAL_GENERATION_FAILED";

export interface BindingSession {
  sessionId: string;
  url: string;
  state: BindingState;
  provider?: string;
  siteDomain?: string;
  account?: AccountInfo;
  signal?: SignalResult["signal"];
  failure?: BindingFailure;
  error?: string;
  startedAt: string;
  completedAt?: string;
  events: RuntimeEvent[];
}

export interface BindingResult {
  success: boolean;
  session: BindingSession;
  events: RuntimeEvent[];
}

// ─── Workflow Options ──────────────────────────────

export interface BindingOptions {
  /** The game site URL to bind. */
  url: string;
  /** Optional callback to confirm authorization (return true = confirm). */
  confirmAuth?: () => Promise<boolean>;
  /** Optional callback to confirm binding (return true = confirm). */
  confirmBind?: () => Promise<boolean>;
  /** Simulate a specific failure scenario for testing. */
  failureMode?: BindingFailure;
}
