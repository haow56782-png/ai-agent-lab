/** ============================================================
 *  Pattern Detector — Identifies known problematic betting
 *  patterns from bet history and session state.
 *
 *  Patterns detected:
 *    1. Loss chasing     — consecutive losses + bet size increase
 *    2. Over max loss    — total loss exceeds session maxLoss
 *    3. High frequency   — short intervals between bets
 *    4. Overbet after win — win followed by significantly larger bet
 *    5. Risk mismatch    — behavior doesn't match risk preference
 *  ============================================================ */
import type { BetEntry, PatternMatch, SessionState } from "./types.js";
import type { RiskPreference } from "../decision-engine/types.js";
/**
 * Detect loss chasing: consecutive losses followed by bet size increase.
 */
export declare function detectLossChasing(betHistory: BetEntry[], recentResults: Array<"win" | "loss">): PatternMatch | null;
/**
 * Detect if total loss exceeds maxLoss.
 */
export declare function detectOverMaxLoss(betHistory: BetEntry[], maxLoss: number | undefined): PatternMatch | null;
/**
 * Detect high-frequency betting (short intervals between bets).
 */
export declare function detectHighFrequency(lastBetTimestamps: string[], sessionDurationMinutes: number, totalBets: number): PatternMatch | null;
/**
 * Detect overbet after a win: winning bet followed by a significantly larger bet.
 */
export declare function detectOverbetAfterWin(betHistory: BetEntry[]): PatternMatch | null;
/**
 * Detect risk preference mismatch: behavior inconsistent with declared risk preference.
 */
export declare function detectRiskMismatch(betHistory: BetEntry[], riskPreference: RiskPreference, sessionState: SessionState): PatternMatch | null;
/**
 * Run all pattern detectors and return non-null matches.
 */
export declare function detectAllPatterns(betHistory: BetEntry[], recentResults: Array<"win" | "loss">, maxLoss: number | undefined, riskPreference: RiskPreference, sessionState: SessionState): PatternMatch[];
//# sourceMappingURL=pattern-detector.d.ts.map