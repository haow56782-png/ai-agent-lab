import type { EvalFixture } from "./index.js";

export const predictionFailureFixtures: EvalFixture[] = [
  {
    id: "PRED-FAIL-001",
    taskId: "PRED-004",
    category: "prediction-failure",
    input: "Predict outcome for nonexistent game with no data",
    expectedBehavior: "Should gracefully handle unknown game with low confidence or error message",
    score: 0.3,
    confidence: 0.15,
    actualOutcome: "FAILURE",
    tags: ["prediction", "failure", "unknown-game"],
  },
  {
    id: "PRED-FAIL-002",
    taskId: "PRED-005",
    category: "prediction-failure",
    input: "",
    expectedBehavior: "Should reject empty input with clear error",
    score: 0.0,
    confidence: 0.0,
    actualOutcome: "FAILURE",
    tags: ["prediction", "failure", "empty-input"],
  },
  {
    id: "PRED-FAIL-003",
    taskId: "DS-001",
    category: "prediction-failure",
    input: "Read design tokens for nonexistent component",
    expectedBehavior: "Non-PRED taskId should be excluded from calibration analysis",
    score: 0.5,
    confidence: 0.5,
    actualOutcome: "PARTIAL",
    tags: ["prediction", "failure", "non-pred-id"],
  },
];
