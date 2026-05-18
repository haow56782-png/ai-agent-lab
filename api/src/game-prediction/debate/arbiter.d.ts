/** ============================================================
 *  Final Arbiter — Synthesizes all agent reviews into a
 *  final decision with action, confidence adjustment, risk
 *  adjustment, and a full decision trace.
 *
 *  Decision priority:
 *    1. If any agent OPPOSEs with score ≤ 0.2 → override
 *    2. Majority vote determines action direction
 *    3. Arbiter resolves ties with risk-preference bias
 *  ============================================================ */
import type { DecisionOutput } from "../decision-engine/types.js";
import type { AgentDebateOutput, FinalDebateOutput } from "./types.js";
export declare function finalArbiter(agents: AgentDebateOutput[], decision: DecisionOutput): FinalDebateOutput;
//# sourceMappingURL=arbiter.d.ts.map