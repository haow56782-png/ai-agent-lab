import type { EvalFixture } from "./index.js";

export const emptyResultFixtures: EvalFixture[] = [
  {
    id: "EMPTY-001",
    taskId: "PRED-EMPTY-001",
    category: "empty-results",
    input: "",
    expectedBehavior: "Empty input should not produce NaN in any statistical computation",
    score: 0,
    confidence: 0,
    actualOutcome: "EMPTY",
    tags: ["empty", "bounds", "sanitization"],
  },
  {
    id: "EMPTY-002",
    taskId: "PRED-EMPTY-002",
    category: "empty-results",
    input: "null",
    expectedBehavior: "Null-like input should not crash statistical functions",
    score: 0,
    confidence: 0,
    actualOutcome: "EMPTY",
    tags: ["empty", "bounds", "null"],
  },
  {
    id: "EMPTY-003",
    taskId: "PRED-LOW-003",
    category: "empty-results",
    input: "Predict something with very low confidence",
    expectedBehavior: "Low confidence extreme values should not produce NaN",
    score: 0.05,
    confidence: 0.01,
    actualOutcome: "PARTIAL",
    tags: ["empty", "bounds", "low-confidence"],
  },
];
