import { describe, expect, test } from "vitest";
import type { FixJobArtifact, FixType } from "../../../packages/shared-types/src/job-contract";
import {
  buildFixProgressMeta,
  countAutoFixableFindings,
  countFixedFindings,
  countNeedsReviewFindings,
  getFixStepProgress,
  type CompletedFixStep,
} from "../src/services/jobs/fix-progress-model.js";

const fixTypes: FixType[] = ["margin", "heading", "reference_format"];

function completedStep(fixType: FixType): CompletedFixStep {
  return {
    type: fixType,
    status: "done",
    summary: `${fixType} done`,
    duration: 1,
  };
}

function artifact(
  artifactId: string,
  findingId?: string,
  relatedFindingIds?: string[],
  status: FixJobArtifact["status"] = "ready",
): FixJobArtifact {
  return {
    id: artifactId,
    fixType: "heading",
    title: "标题层级已规范化",
    summary: "标题层级已规范化，已写回到修复稿件。",
    details: [],
    status,
    finding_id: findingId,
    related_finding_ids: relatedFindingIds,
  };
}

describe("fix progress model", () => {
  test("counts unique finding ids from artifacts and related findings", () => {
    const fixedFindingTotal = countFixedFindings({
      findingTotal: 4,
      completedSteps: [completedStep("margin"), completedStep("heading")],
      artifacts: [
        artifact("art-margin", "finding-1", ["finding-1", "finding-2"]),
        artifact("art-heading", "finding-2", ["finding-3"]),
      ],
    });

    expect(fixedFindingTotal).toBe(3);
  });

  test("falls back to completed action count when artifacts have no finding ids", () => {
    const fixedFindingTotal = countFixedFindings({
      findingTotal: 5,
      completedSteps: [completedStep("margin"), completedStep("heading")],
      artifacts: [artifact("art-margin"), artifact("art-heading")],
    });

    expect(fixedFindingTotal).toBe(2);
  });

  test("caps fixed finding count at total findings", () => {
    const fixedFindingTotal = countFixedFindings({
      findingTotal: 2,
      completedSteps: [completedStep("margin"), completedStep("heading"), completedStep("reference_format")],
      artifacts: [
        artifact("art-margin", "finding-1", ["finding-2"]),
        artifact("art-heading", "finding-3", ["finding-4"]),
      ],
    });

    expect(fixedFindingTotal).toBe(2);
  });

  test("counts auto-fixable findings from artifact finding ids instead of total findings", () => {
    const autoFixableFindingTotal = countAutoFixableFindings({
      findingTotal: 6,
      fixTypes: ["margin", "body_style", "caption", "page_number", "heading"],
      artifacts: [
        artifact("art-margin", "finding-1"),
        artifact("art-body", "finding-2"),
        artifact("art-caption", "finding-review", [], "needs_review"),
        artifact("art-page", "finding-4"),
        artifact("art-heading", "finding-4"),
      ],
    });

    expect(autoFixableFindingTotal).toBe(3);
  });

  test("counts needs-review findings separately from ready writeback artifacts", () => {
    const needsReviewFindingTotal = countNeedsReviewFindings({
      findingTotal: 6,
      artifacts: [
        artifact("art-margin", "finding-1"),
        artifact("art-caption", "finding-review", ["finding-review-related"], "needs_review"),
        artifact("art-reference", "finding-review", [], "needs_review"),
      ],
    });

    expect(needsReviewFindingTotal).toBe(2);
  });

  test("builds progress meta from the same progress snapshot", () => {
    const progressMeta = buildFixProgressMeta({
      findingTotal: 4,
      fixTypes,
      completedSteps: [completedStep("margin")],
      artifacts: [artifact("art-margin", "finding-1", ["finding-2"])],
    });

    expect(progressMeta).toEqual({
      findingTotal: 4,
      autoFixableFindingTotal: 2,
      fixedFindingTotal: 2,
      needsReviewFindingTotal: 0,
      notAutoFixedFindingTotal: 2,
      actionTotal: 3,
      completedActionTotal: 1,
    });
  });

  test("keeps fix step progress inside the formatting window", () => {
    expect(getFixStepProgress(0, 3)).toBe(63);
    expect(getFixStepProgress(1, 3)).toBe(72);
    expect(getFixStepProgress(2, 3)).toBe(80);
    expect(getFixStepProgress(9, 3)).toBe(82);
  });
});
