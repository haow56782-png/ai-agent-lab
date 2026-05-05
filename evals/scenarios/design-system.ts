import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const designSystemRead: EvalScenario = {
  id: "DS-001",
  name: "Read Design System Colors",
  description: "Agent should return color tokens from the VIB design system",
  taskPrompt: "Read the VIB design system color tokens",
  expectedOutputFields: ["--vib-", "4E41FF", "gray"],
  mode: "repl",
  validate(output: string) {
    // Must contain at least some --vib- token references
    const vibTokenCount = (output.match(/--vib-/g) ?? []).length;
    const hasBrandColor = output.includes("4E41FF");

    const errors: string[] = [];
    if (vibTokenCount < 3) errors.push(`Only ${vibTokenCount} --vib- tokens found (expected ≥ 3)`);
    if (!hasBrandColor) errors.push("Missing brand color #4E41FF");

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.3),
      errors,
    };
  },
};

export const designSystemGenerate: EvalScenario = {
  id: "DS-002",
  name: "Generate Button CSS",
  description: "Agent should generate VIB-themed button CSS using design tokens",
  taskPrompt: "Generate VIB theme primary button CSS",
  expectedOutputFields: [".vib-", "var(--vib-"],
  mode: "repl",
  validate(output: string) {
    const hasClass = output.includes(".vib-");
    const hasToken = output.includes("var(--vib-");
    const hasRadius = output.includes("--vib-radius-xl") || output.includes("--vib-radius-lg");

    const errors: string[] = [];
    if (!hasClass) errors.push("Missing .vib- class name");
    if (!hasToken) errors.push("Missing var(--vib-) token references");
    if (!hasRadius) errors.push("Missing border-radius token");

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.3),
      errors,
    };
  },
};
