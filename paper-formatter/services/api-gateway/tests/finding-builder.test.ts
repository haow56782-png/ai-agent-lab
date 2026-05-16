import { describe, expect, it } from "vitest";
import { buildFindingsFromDetections } from "../src/rules/builders/finding-builder.js";

describe("finding builder", () => {
  it("converts RuleDetection into FindingContract", () => {
    const findings = buildFindingsFromDetections({
      doc: { canonical_document_id: "doc-1" } as any,
      profileId: "sch-001",
      detections: [{
        ruleId: "FLOATING_OBJECT_OVERLAP_TEXT",
        label: "图片/印章覆盖正文",
        group: "图形对象 & 正文",
        severity: "P1",
        confidence: 0.91,
        page: 2,
        snippet: "红色印章压住正文内容",
        evidence: {
          contextBefore: "前文",
          contextAfter: "后文",
          bbox: { x: 18, y: 12, w: 58, h: 18 },
          objectName: "红色印章",
          anchor: {
            relationId: "caption:table_caption:2->table:1",
            fromObjectId: "caption:table_caption:2",
            toObjectId: "table:1",
            relationType: "caption_wrong_position",
            captionKind: "table",
          },
        },
        suggestion: {
          type: "restructure",
          before: "红色印章",
          after: "调整为衬于文字下方",
          explanation: "调整图片环绕方式、图层顺序或锚点位置，确保图片不覆盖正文内容。",
        },
      }],
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].rule_id).toBe("FLOATING_OBJECT_OVERLAP_TEXT");
    expect(findings[0].severity).toBe("P1");
    expect(findings[0].suggestion.fix_diff?.after).toBe("调整为衬于文字下方");
    expect(findings[0].evidence_spans[0]).toMatchObject({
      page: 2,
      snippet: "红色印章压住正文内容",
      context_before: "前文",
      context_after: "后文",
      metadata: {
        anchor: {
          relationId: "caption:table_caption:2->table:1",
          fromObjectId: "caption:table_caption:2",
          toObjectId: "table:1",
          relationType: "caption_wrong_position",
          captionKind: "table",
        },
      },
    });
  });
});
