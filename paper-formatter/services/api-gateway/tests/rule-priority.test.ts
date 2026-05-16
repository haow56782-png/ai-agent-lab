import { describe, expect, it } from "vitest";
import { sortDetectionsByPriority } from "../src/rules/priority.js";

describe("rule priority", () => {
  it("orders P1 ahead of P2", () => {
    const detections = sortDetectionsByPriority([
      { ruleId: "TABLE_KEEP_TOGETHER", label: "表 keep-together", group: "图表 & 题注", severity: "P2", confidence: 0.95, page: 1, snippet: "表格", suggestion: { type: "manual_review", before: "表", after: "人工复核", explanation: "表格跨页复核" } },
      { ruleId: "FLOATING_OBJECT_OVERLAP_TEXT", label: "图片/印章覆盖正文", group: "图形对象 & 正文", severity: "P1", confidence: 0.88, page: 1, snippet: "印章", suggestion: { type: "restructure", before: "印章", after: "下移", explanation: "避免遮挡正文" } },
    ]);
    expect(detections[0].ruleId).toBe("FLOATING_OBJECT_OVERLAP_TEXT");
  });

  it("orders higher confidence first within same severity", () => {
    const detections = sortDetectionsByPriority([
      { ruleId: "RULE_A", label: "A", group: "样式", severity: "P2", confidence: 0.62, page: 1, snippet: "A", suggestion: { type: "replace", before: "A", after: "B", explanation: "A" } },
      { ruleId: "RULE_B", label: "B", group: "样式", severity: "P2", confidence: 0.83, page: 1, snippet: "B", suggestion: { type: "replace", before: "B", after: "C", explanation: "B" } },
    ]);
    expect(detections[0].ruleId).toBe("RULE_B");
  });

  it("keeps FLOATING_OBJECT_OVERLAP_TEXT ahead of TABLE_KEEP_TOGETHER", () => {
    const detections = sortDetectionsByPriority([
      { ruleId: "TABLE_KEEP_TOGETHER", label: "表 keep-together", group: "图表 & 题注", severity: "P1", confidence: 0.97, page: 1, snippet: "表格", suggestion: { type: "manual_review", before: "表", after: "人工复核", explanation: "表格跨页复核" } },
      { ruleId: "FLOATING_OBJECT_OVERLAP_TEXT", label: "图片/印章覆盖正文", group: "图形对象 & 正文", severity: "P1", confidence: 0.86, page: 1, snippet: "印章", suggestion: { type: "restructure", before: "印章", after: "下移", explanation: "避免遮挡正文" } },
    ]);
    expect(detections[0].ruleId).toBe("FLOATING_OBJECT_OVERLAP_TEXT");
  });
});
