/** ============================================================
 *  Bayesian Update — Beta-Bernoulli conjugate model
 *
 *  Posterior ∝ Prior × Likelihood
 *
 *  Prior:  Beta(α₀, β₀) — centered on initial confidence
 *  Likelihood:  Bernoulli(wins, losses)
 *  Posterior:  Beta(α₀ + wins, β₀ + losses)
 *
 *  Overconfidence penalty reduces effective observation
 *  weight when high-confidence predictions are wrong.
 *  ============================================================ */
import type { BetaDist } from "./types.js";
/**
 * Create an informative Beta prior centered on a given confidence.
 * strength controls how informative the prior is (higher = more rigid).
 */
export declare function createPrior(confidence: number, strength?: number): BetaDist;
/**
 * Update Beta posterior after observing wins and losses.
 * Applies overconfidence penalty to reduce effective weight of
 * high-confidence errors.
 */
export declare function updatePosterior(prior: BetaDist, wins: number, losses: number, overconfidencePenalty?: number): BetaDist;
/** Mean of Beta distribution: α / (α + β) */
export declare function posteriorMean(dist: BetaDist): number;
/** Mode of Beta distribution: (α-1) / (α+β-2) for α,β > 1 */
export declare function posteriorMode(dist: BetaDist): number;
/** Variance of Beta distribution */
export declare function posteriorVariance(dist: BetaDist): number;
/**
 * Compute overconfidence penalty.
 * Scales with confidence — higher confidence errors are penalized more.
 */
export declare function computeOverconfidencePenalty(confidence: number, wasCorrect: boolean): number;
/**
 * Suppress streak bias — longer streaks have diminishing marginal impact.
 */
export declare function suppressStreakBias(consecutiveErrors: number, rawPenalty: number): number;
/**
 * Widen uncertainty when posterior variance is high.
 * Returns a confidence discount factor [0, 1].
 */
export declare function widenUncertainty(dist: BetaDist): number;
/**
 * Full Bayesian update: prior → observation → posterior → calibrated confidence.
 * Returns a confidence value in [0.01, 0.99].
 */
export declare function bayesianCalibratedConfidence(currentConfidence: number, priorStrength: number, historicalWins: number, historicalLosses: number, wasCorrect: boolean, consecutiveErrors: number): number;
//# sourceMappingURL=bayesian.d.ts.map