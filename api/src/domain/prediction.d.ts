/**
 * VIB AI — Prediction Service
 *
 * Domain service for game prediction. Currently uses pattern-based
 * heuristics as baseline; will integrate with DeepSeek model inference
 * in Milestone 2.
 */
import { type PredictionInput, type PredictionResult } from "./game.js";
/**
 * Run prediction for a given game.
 *
 * Currently uses a placeholder heuristic. Production will delegate
 * to DeepSeek model inference via the LLM client.
 */
export declare function predict(input: PredictionInput): Promise<PredictionResult>;
//# sourceMappingURL=prediction.d.ts.map