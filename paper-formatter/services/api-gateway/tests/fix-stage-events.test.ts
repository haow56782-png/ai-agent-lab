import { describe, expect, test } from "vitest";
import type { FindingContract } from "../../../packages/shared-types/src/finding-contract";
import type { FixJobArtifact } from "../../../packages/shared-types/src/job-contract";
import {
  makeArtifactEvent,
  makeDoneEvent,
  makeFailedEvent,
  makeFormattingEvent,
  makePreparingEvent,
} from "../src/services/jobs/fix-stage-events.js";
import type { FixSourceContext } from "../src/services/jobs/fix-source-context.js";

function makeFinding(findingId: string): FindingContract {
  return {
    finding_id: findingId,
    document_id: "doc_canonical_001",
    document_version: 1,
    rule_id: "HEADING_HIERARCHY_REVIEW",
    rule_snapshot: { rule_text: "标题层级", rule_version: "v1" },
    severity: "P2",
    confidence: 0.9,
    evidence_spans: [{ page: 1, char_start: 0, char_end: 4, snippet: "标题层级" }],
    evidence_snapshot: "标题层级",
    suggestion: { type: "replace", explanation: "修复标题层级" },
    status: "pending",
    created_at: "2026-05-15T00:00:00.000Z",
    updated_at: "2026-05-15T00:00:00.000Z",
    audit_trail: [],
  };
}

const sourceContext: FixSourceContext = {
  chapters: ["第一章 绪论"],
  snippets: ["正文片段"],
  findings: [
    makeFinding("finding-1"),
    makeFinding("finding-2"),
    makeFinding("finding-3"),
    makeFinding("finding-4"),
  ],
};

describe("fix stage events", () => {
  test("builds preparing event with source chapter and first three finding ids", () => {
    const event = makePreparingEvent({ findingTotal: 4, fixType: "heading", sourceContext });

    expect(event.type).toBe("stage");
    expect(event.stage).toBe("preparing");
    expect(event.title).toBe("修复任务已创建");
    expect(event.detail).toContain("已接收 4 个发现项");
    expect(event.detail).toContain("第一章 绪论");
    expect(event.fixType).toBe("heading");
    expect(event.finding_id).toBe("finding-1");
    expect(event.related_finding_ids).toEqual(["finding-1", "finding-2", "finding-3"]);
  });

  test("builds formatting event from finding total and fix type", () => {
    const event = makeFormattingEvent({ findingTotal: 7, fixType: "margin" });

    expect(event.stage).toBe("formatting");
    expect(event.detail).toBe("正在按规则包写回 7 个发现项对应的版式修复。");
    expect(event.fixType).toBe("margin");
  });

  test("builds artifact event with finding linkage", () => {
    const artifact: FixJobArtifact = {
      id: "art_heading",
      fixType: "heading",
      title: "标题层级已规范化",
      summary: "标题层级已规范化，已写回到修复稿件。",
      details: [],
      status: "ready",
      chapter: "第一章 绪论",
      sourceSnippet: "这是一个很长的原稿片段，用于验证 artifact event 会带上原稿片段并保留修复细节。",
      finding_id: "finding-heading",
      related_finding_ids: ["finding-heading"],
    };

    const event = makeArtifactEvent("heading", artifact);

    expect(event.type).toBe("artifact");
    expect(event.stage).toBe("fixed:heading");
    expect(event.finding_id).toBe("finding-heading");
    expect(event.related_finding_ids).toEqual(["finding-heading"]);
    expect(event.detail).toContain("正在处理「第一章 绪论」");
    expect(event.detail).toContain("原稿片段：这是一个很长的原稿片段");
    expect(event.detail).toContain("标题样式已按层级重建");
  });

  test("builds done and failed events with explicit terminal wording", () => {
    expect(makeDoneEvent(false)).toMatchObject({
      type: "stage",
      stage: "done",
      title: "修复稿已生成",
    });
    expect(makeDoneEvent(true).detail).toContain("已保留原稿不变");
    expect(makeFailedEvent("formatter unavailable")).toMatchObject({
      type: "error",
      stage: "error",
      title: "修复任务失败",
      detail: "formatter unavailable",
    });
  });
});
