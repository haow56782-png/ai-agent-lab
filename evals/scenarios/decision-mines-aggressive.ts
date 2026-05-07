import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

const FORBIDDEN = ["guaranteed", "certain win", "sure profit", "必赚", "稳赢", "保证盈利"];

export const decisionMinesAggressive: EvalScenario = {
  id: "DEC-003",
  name: "Mines Aggressive Decision",
  description: "Mines game with aggressive preference — must include warnings via risk block, no guarantee language",
  taskPrompt: "Give me a mines decision. 5x5 grid, 8 mines, 3 picks. Bankroll 2000, bet 100. Aggressive risk preference.",
  expectedOutputFields: ["decision", "mines", "aggressive", "warning", "risk"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 15000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return { passed: false, score: fieldCheck.score, errors: fieldCheck.errors };

    // Check for forbidden language in output
    const lower = output.toLowerCase();
    for (const word of FORBIDDEN) {
      if (lower.includes(word.toLowerCase())) {
        return { passed: false, score: 0, errors: [`Contains forbidden language: "${word}"`] };
      }
    }

    // Try to extract any JSON object
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Narrative fallback — check for warnings discussion
      const hasWarning = lower.includes("warning") || lower.includes("caution") || lower.includes("risk");
      if (hasWarning) return { passed: true, score: 1.0, errors: [] };
      return { passed: false, score: 0.5, errors: ["Output should include risk warnings for aggressive strategy"] };
    }

    try {
      const data = JSON.parse(jsonMatch[0]);
      const errors: string[] = [];

      if (data.domain && data.domain !== "decision") errors.push("domain should be 'decision'");
      if (!data.risk?.warnings || data.risk.warnings.length < 1) {
        errors.push("Aggressive strategy must include risk.warnings");
      }

      return {
        passed: errors.length === 0,
        score: errors.length === 0 ? 1.0 : 0.5,
        errors,
      };
    } catch {
      return { passed: false, score: 0.3, errors: ["Failed to parse JSON output"] };
    }
  },
};
