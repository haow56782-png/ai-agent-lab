import { createLLM, type LLMMessage } from "./llm.js";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type Stage =
  | { phase: "plan"; prompt: string }
  | { phase: "execute"; prompt: string }
  | { phase: "review"; prompt: string }
  | { phase: "refine"; prompt: string };

export interface WorkflowResult {
  plan: string;
  output: string;
  review: string;
  refined?: string;
  stages: number;
}

/**
 * Plan → Execute → Review → Refine multi-step workflow.
 */
export async function runWorkflow(
  task: string,
  context?: { projectRoot?: string; systemPrompt?: string },
): Promise<WorkflowResult> {
  const llm = createLLM({ temperature: 0.6 });
  const projectRoot = context?.projectRoot ?? process.cwd();

  // --- Plan ---
  const plan = await llm.chat([
    {
      role: "system",
      content:
        context?.systemPrompt ??
        "You are a technical planner. Analyze the task and produce a clear step-by-step plan.",
    },
    { role: "user", content: `Task: ${task}\n\nProduce a numbered execution plan.` },
  ]);

  // --- Execute ---
  const output = await llm.chat([
    {
      role: "system",
      content: `You are an executor. Follow the plan below precisely.\n\nPlan:\n${plan}`,
    },
    { role: "user", content: task },
  ]);

  // --- Review ---
  const review = await llm.chat([
    {
      role: "system",
      content: "You are a code reviewer. Check correctness, completeness, and style.",
    },
    {
      role: "user",
      content: `Task: ${task}\n\nOutput:\n${output}\n\nReview the output. List issues if any.`,
    },
  ]);

  // --- Refine (if review found issues) ---
  const needsRefine =
    review.toLowerCase().includes("issue") ||
    review.toLowerCase().includes("fix") ||
    review.toLowerCase().includes("error");

  let refined: string | undefined;
  if (needsRefine) {
    refined = await llm.chat([
      {
        role: "system",
        content: "Apply the review feedback and produce an improved version.",
      },
      {
        role: "user",
        content: `Original task: ${task}\n\nPrevious output:\n${output}\n\nReview feedback:\n${review}\n\nProduce the refined output.`,
      },
    ]);
  }

  return { plan, output, review, refined, stages: needsRefine ? 4 : 3 };
}
