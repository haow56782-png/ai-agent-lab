/** ============================================================
 *  Mines — Combinatorial grid probability prediction
 *
 *  A 5×5 grid (25 squares) hides M mines.  The player picks
 *  squares to reveal.  Hitting a mine loses the bet; surviving
 *  all picks wins.
 *
 *  Survival probability is pure combinatorial math:
 *    P(survive N picks) = C(25 - M, N) / C(25, N)
 *
 *  Each pick is independent — past successful picks do not
 *  change the conditional probability of future picks.
 *  ============================================================ */
import type { MinesInput, Signal, RiskProfile } from "./types.js";
export declare function getRiskProfile(): RiskProfile;
export interface ValidatedMinesInput {
    gridSize: number;
    minesCount: number;
    picksCount: number;
}
export declare function parseMinesInput(input: MinesInput): ValidatedMinesInput;
/**
 * Survival probability after N picks on a grid with M mines.
 *
 *   P(survive N picks) = C(25 - M, N) / C(25, N)
 *
 * where C(n, k) is the binomial coefficient.
 */
export declare function calculateProbability(parsed: ValidatedMinesInput): number;
export declare function calculateConfidence(): number;
export declare function generateRecommendation(parsed: ValidatedMinesInput, probability: number): {
    recommendation: "BET" | "SKIP" | "CAUTION";
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
};
export declare function getExplanation(parsed: ValidatedMinesInput, probability: number): string;
export declare function generateSignal(input: MinesInput): Signal;
//# sourceMappingURL=mines.d.ts.map