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
export function createPrior(confidence: number, strength = 10): BetaDist {
  const safeConfidence = Math.max(0.01, Math.min(0.99, confidence));
  return {
    alpha: 1 + safeConfidence * (strength - 2),
    beta: 1 + (1 - safeConfidence) * (strength - 2),
  };
}

/**
 * Update Beta posterior after observing wins and losses.
 * Applies overconfidence penalty to reduce effective weight of
 * high-confidence errors.
 */
export function updatePosterior(
  prior: BetaDist,
  wins: number,
  losses: number,
  overconfidencePenalty = 0,
): BetaDist {
  const effectiveWeight = Math.max(0.1, 1 - overconfidencePenalty * 0.5);
  return {
    alpha: prior.alpha + wins * effectiveWeight,
    beta: prior.beta + losses * effectiveWeight,
  };
}

/** Mean of Beta distribution: α / (α + β) */
export function posteriorMean(dist: BetaDist): number {
  return dist.alpha / (dist.alpha + dist.beta);
}

/** Mode of Beta distribution: (α-1) / (α+β-2) for α,β > 1 */
export function posteriorMode(dist: BetaDist): number {
  if (dist.alpha <= 1 || dist.beta <= 1) return posteriorMean(dist);
  return (dist.alpha - 1) / (dist.alpha + dist.beta - 2);
}

/** Variance of Beta distribution */
export function posteriorVariance(dist: BetaDist): number {
  const sum = dist.alpha + dist.beta;
  return (dist.alpha * dist.beta) / (sum * sum * (sum + 1));
}

/**
 * Compute overconfidence penalty.
 * Scales with confidence — higher confidence errors are penalized more.
 */
export function computeOverconfidencePenalty(confidence: number, wasCorrect: boolean): number {
  if (wasCorrect) return 0;
  if (confidence <= 0.5) return 0;
  // Square the excess confidence beyond 0.5
  return ((confidence - 0.5) / 0.5) ** 2;
}

/**
 * Suppress streak bias — longer streaks have diminishing marginal impact.
 */
export function suppressStreakBias(consecutiveErrors: number, rawPenalty: number): number {
  if (consecutiveErrors <= 1) return rawPenalty;
  // Diminishing returns: each additional error matters less
  return rawPenalty / Math.sqrt(consecutiveErrors);
}

/**
 * Widen uncertainty when posterior variance is high.
 * Returns a confidence discount factor [0, 1].
 */
export function widenUncertainty(dist: BetaDist): number {
  const variance = posteriorVariance(dist);
  // Variance threshold: 0.03 corresponds to ~15% standard deviation
  if (variance <= 0.03) return 1.0;
  // Scale down confidence as variance increases
  return Math.max(0.5, 1 - (variance - 0.03) * 5);
}

/**
 * Full Bayesian update: prior → observation → posterior → calibrated confidence.
 * Returns a confidence value in [0.01, 0.99].
 */
export function bayesianCalibratedConfidence(
  currentConfidence: number,
  priorStrength: number,
  historicalWins: number,
  historicalLosses: number,
  wasCorrect: boolean,
  consecutiveErrors: number,
): number {
  const prior = createPrior(currentConfidence, priorStrength);
  const overconfidencePenalty = computeOverconfidencePenalty(currentConfidence, wasCorrect);
  const suppressedPenalty = suppressStreakBias(consecutiveErrors, overconfidencePenalty);

  const winContribution = wasCorrect ? 1 : 0;
  const lossContribution = wasCorrect ? 0 : 1;

  const posterior = updatePosterior(prior, historicalWins + winContribution, historicalLosses + lossContribution, suppressedPenalty);

  let calibrated = posteriorMean(posterior);

  // Apply uncertainty widening
  const uncertaintyFactor = widenUncertainty(posterior);
  calibrated = 0.5 + (calibrated - 0.5) * uncertaintyFactor;

  return Math.max(0.01, Math.min(0.99, calibrated));
}
