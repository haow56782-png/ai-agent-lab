export interface WorkflowResult {
    plan: string;
    output: string;
    review: string;
    refined?: string;
    stages: number;
}
/** Check whether the review text genuinely indicates issues need fixing */
export declare function needsRefinement(review: string): boolean;
/**
 * Plan → Execute → Review → Refine multi-step workflow.
 * Each stage is independently wrapped so a single LLM failure
 * produces a partial result instead of crashing the entire workflow.
 */
export declare function runWorkflow(task: string, context?: {
    systemPrompt?: string;
}): Promise<WorkflowResult>;
//# sourceMappingURL=workflow.d.ts.map