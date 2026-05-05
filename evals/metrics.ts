/** Evaluation metrics for VIB AI Agent */

export interface EvalResult {
  taskId: string;
  name: string;
  passed: boolean;
  score: number;        // 0.0 – 1.0
  latencyMs: number;
  errors: string[];
  outputSample: string; // truncated output for manual review
  timestamp: string;
}

export interface EvalScenario {
  id: string;
  name: string;
  description: string;
  taskPrompt: string;
  expectedOutputFields: string[];
  expectedConfidenceRange?: [number, number];
  expectedLatencyMax?: number;
  mode: "repl" | "workflow" | "check";
  validate: (output: string) => ValidationResult;
}

export interface ValidationResult {
  passed: boolean;
  score: number;        // 0.0 – 1.0
  errors: string[];
}

export function recordMetrics(result: EvalResult): EvalResult {
  // In future: persist to evals/reports/ or analytics
  return result;
}

export function confidenceInRange(
  confidence: number,
  range: [number, number],
): boolean {
  return confidence >= range[0] && confidence <= range[1];
}

/** Check if output contains all required fields (case-insensitive) */
export function outputContainsAll(
  output: string,
  fields: string[],
): ValidationResult {
  const missing: string[] = [];
  const lower = output.toLowerCase();

  for (const field of fields) {
    if (!lower.includes(field.toLowerCase())) {
      missing.push(field);
    }
  }

  return {
    passed: missing.length === 0,
    score: missing.length === 0 ? 1.0 : 1.0 - missing.length / fields.length,
    errors: missing.map((f) => `Missing field: ${f}`),
  };
}
