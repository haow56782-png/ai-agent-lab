/**
 * Signal Output Adapter — Converts raw tool outputs into structured
 * SignalOutputContract for all prediction / decision / simulation tools.
 *
 * Each normalize* function handles one source type. The toSignalOutputContract()
 * factory dispatches to the correct normalizer based on domain and source type.
 *
 * ============================================================
 *  P3.2 Signal Output Contract & Decision Evidence Protocol
 * ============================================================ */
import type { SignalOutputContract, SignalRiskLevel, SignalAction } from "../protocols/signal-output-contract.js";
import type { Signal as DomainSignal } from "../game-prediction/domains/types.js";
import type { DecisionOutput } from "../game-prediction/decision-engine/types.js";
import type { PredictionResult, GameMetrics } from "../domain/game.js";
export declare function normalizeFromDomainSignal(signal: DomainSignal, toolName: string, traceId?: string): SignalOutputContract;
export declare function normalizeFromDecisionOutput(decision: DecisionOutput, toolName: string, traceId?: string): SignalOutputContract;
export declare function normalizeFromPredictionResult(result: PredictionResult, toolName: string, traceId?: string): SignalOutputContract;
export declare function normalizeFromGameMetrics(metrics: GameMetrics, toolName: string, traceId?: string): SignalOutputContract;
export declare function normalizeFromSimulation(params: {
    label: string;
    confidence: number;
    probability: number;
    assumptions: string[];
    simulatedOutcome: string;
    probabilityRange: {
        min: number;
        max: number;
    };
    sensitivityFactors: Array<{
        name: string;
        impact: string;
    }>;
    failureModes: string[];
    riskLevel: SignalRiskLevel;
    reasoning: string;
    traceId?: string;
}, toolName: string): SignalOutputContract;
export type NormalizableInput = {
    type: "domain_signal";
    data: DomainSignal;
} | {
    type: "decision_output";
    data: DecisionOutput;
} | {
    type: "prediction_result";
    data: PredictionResult;
} | {
    type: "game_metrics";
    data: GameMetrics;
} | {
    type: "simulation";
    data: Parameters<typeof normalizeFromSimulation>[0];
};
export declare function toSignalOutputContract(input: NormalizableInput, toolName: string, traceId?: string): SignalOutputContract;
export declare function inferAction(input: {
    recommendation?: string;
    confidence: number;
    riskLevel: string;
}): SignalAction;
/**
 * Determine whether a signal requires external review (for cost guard integration).
 */
export declare function shouldRequireReview(signal: SignalOutputContract): boolean;
//# sourceMappingURL=signal-output-adapter.d.ts.map