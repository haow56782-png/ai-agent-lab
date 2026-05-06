import { createLLM } from "./llm.js";

export interface WorkflowResult {
  plan: string;
  output: string;
  review: string;
  refined?: string;
  stages: number;
}

/** List of negation phrases that indicate keyword should not trigger refine */
const NEGATION_PATTERNS = [
  "no issue", "no fix", "no error", "no bug",
  "without issue", "no problem",
  "all good", "looks good", "no need",
  "nothing to", "doesn't require", "don't need", "does not require",
];

/** Check whether the review text genuinely indicates issues need fixing */
export function needsRefinement(review: string): boolean {
  const lower = review.toLowerCase();
  const hasSignal =
    lower.includes("issue") ||
    lower.includes("fix") ||
    lower.includes("error") ||
    lower.includes("bug") ||
    lower.includes("incorrect");
  if (!hasSignal) return false;
  const negated = NEGATION_PATTERNS.some((p) => lower.includes(p));
  return !negated;
}

async function safeChat(
  llm: ReturnType<typeof createLLM>,
  messages: { role: "system" | "user"; content: string }[],
  fallback: string,
): Promise<string> {
  try {
    return await llm.chat(messages);
  } catch (err) {
    return `${fallback}: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * Plan → Execute → Review → Refine multi-step workflow.
 * Each stage is independently wrapped so a single LLM failure
 * produces a partial result instead of crashing the entire workflow.
 */
export async function runWorkflow(
  task: string,
  context?: { systemPrompt?: string },
): Promise<WorkflowResult> {
  const llm = createLLM({ temperature: 0.6 });

  // --- Plan ---
  const plan = await safeChat(
    llm,
    [
      {
        role: "system",
        content:
          context?.systemPrompt ??
          "You are a technical planner. Analyze the task and produce a clear step-by-step plan.",
      },
      { role: "user", content: `Task: ${task}\n\nProduce a numbered execution plan.` },
    ],
    "[Plan failed]",
  );

  // --- Execute ---
  const output = await safeChat(
    llm,
    [
      {
        role: "system",
        content: `You are an executor. Follow the plan below precisely.\n\nPlan:\n${plan}`,
      },
      { role: "user", content: task },
    ],
    "[Execute failed]",
  );

  // --- Review ---
  const review = await safeChat(
    llm,
    [
      {
        role: "system",
        content: "You are a code reviewer. Check correctness, completeness, and style.",
      },
      {
        role: "user",
        content: `Task: ${task}\n\nOutput:\n${output}\n\nReview the output. List issues if any.`,
      },
    ],
    "[Review failed]",
  );

  // --- Refine (if review genuinely found issues) ---
  const refine = needsRefinement(review);

  let refined: string | undefined;
  if (refine) {
    refined = await safeChat(
      llm,
      [
        {
          role: "system",
          content: "Apply the review feedback and produce an improved version.",
        },
        {
          role: "user",
          content: `Original task: ${task}\n\nPrevious output:\n${output}\n\nReview feedback:\n${review}\n\nProduce the refined output.`,
        },
      ],
      "[Refine failed]",
    );
  }

  return { plan, output, review, refined, stages: refine ? 4 : 3 };
}
