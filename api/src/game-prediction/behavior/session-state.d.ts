/** ============================================================
 *  Session State — Builds a snapshot of the current betting
 *  session: total bets, frequency, streaks, profit/loss,
 *  and bankroll trajectory.
 *  ============================================================ */
import type { BetEntry, SessionState } from "./types.js";
/**
 * Build a SessionState from bet history and bankroll data.
 */
export declare function buildSessionState(betHistory: BetEntry[], bankrollHistory: number[], sessionDurationMinutes: number, recentResults: Array<"win" | "loss">): SessionState;
//# sourceMappingURL=session-state.d.ts.map