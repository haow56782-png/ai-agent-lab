import { describe, expect, test } from "vitest";
import type { FindingContract } from "../../../packages/shared-types/src/finding-contract";
import { makeFixArtifact, makeFixEvent } from "../src/services/jobs/fix-artifact-builder.js";
import type { FixSourceContext } from "../src/services/jobs/fix-source-context.js";

function makeFinding(findingId: string, ruleId: string, ruleText: string): FindingContract {
  return {
    finding_id: findingId,
    document_id: "doc_canonical_001",
    document_version: 1,
    rule_id: ruleId,
    rule_group: "style",
    rule_snapshot: {
      rule_text: ruleText,
      rule_version: "v1",
      rule_description: ruleText,
    },
    severity: "P2",
    confidence: 0.91,
    evidence_spans: [{ page: 1, char_start: 0, char_end: 8, snippet: ruleText }],
    evidence_snapshot: ruleText,
    suggestion: {
      type: "replace",
      fix_diff: {
        before: ruleText,
        after: "已按规则包修复",
        spans_affected: [{ page: 1, char_start: 0, char_end: 8, snippet: ruleText }],
      },
      explanation: "按学校规则包修复",
    },
    status: "pending",
    created_at: "2026-05-15T00:00:00.000Z",
    updated_at: "2026-05-15T00:00:00.000Z",
    audit_trail: [],
  };
}

const sourceContext: FixSourceContext = {
  chapters: ["第一章 绪论", "第二章 方法"],
  snippets: ["正文段落包含需要修复的标题层级和页码位置。", "参考文献存在 DOI 缺失和悬挂缩进问题。"],
  findings: [
    makeFinding("finding-heading", "HEADING_HIERARCHY_REVIEW", "二级标题层级"),
    makeFinding("finding-page-number", "PAGE_NUMBER_REVIEW", "页码位置"),
    makeFinding("finding-reference", "REFERENCE_FORMAT_REVIEW", "参考文献 DOI"),
  ],
};

describe("fix artifact builder", () => {
  test("uses formatter finding_id before regex fallback", () => {
    const artifact = makeFixArtifact("heading", sourceContext, 0, {
      diffs: [
        {
          finding_id: "finding-page-number",
          rule_id: "PAGE_NUMBER_REVIEW",
          element: "页码",
          note: "页码修复",
        },
      ],
    });

    expect(artifact.fixType).toBe("heading");
    expect(artifact.finding_id).toBe("finding-page-number");
    expect(artifact.related_finding_ids).toEqual(["finding-page-number"]);
    expect(artifact.chapter).toBe("第一章 绪论");
    expect(artifact.details.join("\n")).toContain("原稿片段：正文段落包含需要修复的标题层级和页码位置。");
  });

  test("falls back to source findings matched by fix type", () => {
    const artifact = makeFixArtifact("reference_format", sourceContext, 1, { diffs: [] });

    expect(artifact.finding_id).toBe("finding-reference");
    expect(artifact.status).toBe("needs_review");
    expect(artifact.title).toContain("参考文献");
    expect(artifact.sourceSnippet).toBe("参考文献存在 DOI 缺失和悬挂缩进问题。");
  });

  test("creates structured fix events with finding linkage", () => {
    const event = makeFixEvent({
      type: "artifact",
      stage: "fixed:heading",
      title: "标题层级已规范化",
      detail: "已写回标题层级",
      fixType: "heading",
      finding_id: "finding-heading",
      related_finding_ids: ["finding-heading"],
    });

    expect(event.id).toMatch(/^evt_/);
    expect(event.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(event.finding_id).toBe("finding-heading");
    expect(event.related_finding_ids).toEqual(["finding-heading"]);
  });
});
