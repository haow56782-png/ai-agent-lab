import { describe, expect, test } from "vitest";
import { getCompletedFixStepDuration, makeCompletedFixStep } from "../src/services/jobs/fix-step-result.js";

describe("fix step result", () => {
  test("builds completed step with summary from fix type", () => {
    expect(makeCompletedFixStep("heading", 1)).toEqual({
      type: "heading",
      status: "done",
      summary: "标题层级已规范化",
      duration: 2,
    });
  });

  test("keeps deterministic duration rotation", () => {
    expect([
      getCompletedFixStepDuration(0),
      getCompletedFixStepDuration(1),
      getCompletedFixStepDuration(2),
      getCompletedFixStepDuration(3),
      getCompletedFixStepDuration(4),
    ]).toEqual([1, 2, 3, 1, 2]);
  });
});
