/** Validation for POST /api/agent/analyze */
export interface AnalyzeRequestBody {
    url: string;
    gameId?: string;
    platform?: string;
    userId?: string;
}
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
export declare function validateAnalyzeRequest(body: Record<string, unknown>): ValidationResult;
//# sourceMappingURL=agent.schema.d.ts.map