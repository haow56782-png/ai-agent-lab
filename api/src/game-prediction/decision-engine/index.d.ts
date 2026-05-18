/** ============================================================
 *  Decision Engine — Main entry point
 *
 *  Takes a DecisionInput (game type, bankroll, risk preference,
 *  domain signal, etc.) and produces a structured DecisionOutput
 *  with action, recommended bet size, risk analysis, and full
 *  explanation.
 *
 *  Flow:
 *    1. Select strategy based on game type + risk preference
 *    2. Run risk assessment (bankroll, overbet, ruin, stop)
 *    3. Apply decision policy rules
 *    4. Build final DecisionOutput with explanation
 *  ============================================================ */
import type { DecisionInput, DecisionOutput } from "./types.js";
/**
 * Main decision entry point.
 */
export declare function decide(input: DecisionInput): DecisionOutput;
export { selectStrategyName, getStrategy } from "./decision-policy.js";
//# sourceMappingURL=index.d.ts.map