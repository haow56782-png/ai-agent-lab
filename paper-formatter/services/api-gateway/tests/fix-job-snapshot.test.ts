import { describe, expect, test } from "vitest";
import type { FixJobArtifact, FixJobEvent, FixResult, FixType } from "../../../packages/shared-types/src/job-contract";
import {
  buildCompletedFixJobSnapshot,
  buildFailedFixJobSnapshot,
  buildProcessingFixJobSnapshot,
} from "../src/services/jobs/fix-job-snapshot.js";
import type { CompletedFixStep } from "../src/services/jobs/fix-progress-model.js";

const fixTypes: FixType[] = ["margin", "heading"];
const completedSteps: CompletedFixStep[] = [
  { type: "margin", status: "done", summary: "页边距已校准到规则包要求", duration: 1 },
];
const events: FixJobEvent[] = [
  {
    id: "evt_001",
    at: "2026-05-15T00:00:00.000Z",
    type: "artifact",
    stage: "fixed:margin",
    title: "页边距已校准到规则包要求",
    detail: "已写回页边距",
    fixType: "margin",
    finding_id: "finding-margin",
  },
];
const artifacts: FixJobArtifact[] = [
  {
    id: "art_margin",
    fixType: "margin",
    title: "页边距已校准到规则包要求",
    summary: "页边距已校准到规则包要求，已写回到修复稿件。",
    details: [],
    status: "ready",
    finding_id: "finding-margin",
  },
];

const snapshotBase = {
  fixTypes,
  completedSteps,
  events,
  artifacts,
  findingTotal: 2,
};

describe("fix job snapshot", () => {
  test("builds processing snapshot from one shared base", () => {
    const snapshot = buildProcessingFixJobSnapshot({
      ...snapshotBase,
      currentStep: "heading",
      message: "正在处理标题层级",
    });

    expect(snapshot.fixTypes).toBe(fixTypes);
    expect(snapshot.selectedFixes).toBe(fixTypes);
    expect(snapshot.currentStep).toBe("heading");
    expect(snapshot.findingTotal).toBe(2);
    expect(snapshot.autoFixableFindingTotal).toBe(1);
    expect(snapshot.fixedFindingTotal).toBe(1);
    expect(snapshot.needsReviewFindingTotal).toBe(0);
    expect(snapshot.notAutoFixedFindingTotal).toBe(1);
    expect(snapshot.actionTotal).toBe(2);
    expect(snapshot.completedActionTotal).toBe(1);
    expect(snapshot.message).toBe("正在处理标题层级");
  });

  test("builds completed snapshot with output paths and result payload", () => {
    const resultPayload: FixResult = {
      fixedFileId: "outputs/doc_001/thesis_fixed.docx",
      totalFixed: 1,
      totalFindings: 2,
      newScore: 96,
      contentHash: "content-hash",
      originalHash: "original-hash",
    };
    const snapshot = buildCompletedFixJobSnapshot({
      ...snapshotBase,
      outputPath: "outputs/doc_001/thesis_fixed.docx",
      diffPath: "doc_001/fix-job_001-diff.json",
      message: "修复稿已生成，可进入人工确认",
      result: resultPayload,
    });

    expect(snapshot.outputPath).toBe("outputs/doc_001/thesis_fixed.docx");
    expect(snapshot.diffPath).toBe("doc_001/fix-job_001-diff.json");
    expect(snapshot.findingTotal).toBe(2);
    expect(snapshot.autoFixableFindingTotal).toBe(1);
    expect(snapshot.fixedFindingTotal).toBe(1);
    expect(snapshot.needsReviewFindingTotal).toBe(0);
    expect(snapshot.notAutoFixedFindingTotal).toBe(1);
    expect(snapshot.result).toBe(resultPayload);
    expect(snapshot.selectedFixes).toBe(fixTypes);
  });

  test("builds failed snapshot without output-specific fields", () => {
    const snapshot = buildFailedFixJobSnapshot({
      ...snapshotBase,
      message: "formatter unavailable",
    });

    expect(snapshot.message).toBe("formatter unavailable");
    expect(snapshot.autoFixableFindingTotal).toBe(1);
    expect(snapshot.fixedFindingTotal).toBe(1);
    expect(snapshot.needsReviewFindingTotal).toBe(0);
    expect(snapshot.notAutoFixedFindingTotal).toBe(1);
    expect(snapshot).not.toHaveProperty("outputPath");
    expect(snapshot).not.toHaveProperty("diffPath");
    expect(snapshot).not.toHaveProperty("result");
  });
});
