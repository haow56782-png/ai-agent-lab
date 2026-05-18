/** ============================================================
 *  Game Prediction — Shared domain types for Dice/Crash/Mines
 *  ============================================================ */
/* ─── Helpers ─── */
export function combinations(n, k) {
    if (k < 0 || k > n)
        return 0;
    if (k === 0 || k === n)
        return 1;
    k = Math.min(k, n - k);
    let result = 1;
    for (let i = 1; i <= k; i++) {
        result = (result * (n - k + i)) / i;
    }
    return result;
}
//# sourceMappingURL=types.js.map