import type { EvalFixture } from "./index.js";

export const baselineComparisonFixtures: EvalFixture[] = [
  {
    id: "BASE-001",
    taskId: "PRED-BASE-001",
    category: "baseline-comparison",
    input: "Standard prediction scenario — consistency check",
    expectedBehavior: "Score should remain consistent with baseline expectations for a successful prediction",
    score: 0.9,
    confidence: 0.85,
    actualOutcome: "SUCCESS",
    tags: ["baseline", "regression", "stable"],
  },
  {
    id: "BASE-002",
    taskId: "PRED-BASE-002",
    category: "baseline-comparison",
    input: "Standard prediction scenario — expected degradation",
    expectedBehavior: "Score should reflect known accuracy ceiling for this domain",
    score: 0.65,
    confidence: 0.7,
    actualOutcome: "PARTIAL",
    tags: ["baseline", "regression", "degradation"],
  },
  {
    id: "BASE-003",
    taskId: "PRED-BASE-003",
    category: "baseline-comparison",
    input: "Calibration consistency fixture",
    expectedBehavior:
      "Should have score aligned with outcome: SUCCESS outcome should have score >= 0.5",
    score: 1.0,
    confidence: 0.95,
    actualOutcome: "SUCCESS",
    tags: ["baseline", "calibration", "alignment"],
  },
];
