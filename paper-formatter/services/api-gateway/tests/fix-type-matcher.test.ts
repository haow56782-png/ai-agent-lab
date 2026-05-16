import { describe, expect, it } from "vitest";
import { matchFindingForFixType, matchFormatterFindingIdForFixType } from "../src/rules/fix-type-matcher.js";

describe("fix type matcher", () => {
  it("prefers explicit ruleId -> fixType mapping for findings", () => {
    const finding = matchFindingForFixType("heading", [
      {
        finding_id: "f-heading",
        rule_id: "HEADING_HIERARCHY_REVIEW",
        rule_group: "样式",
        rule_snapshot: { rule_text: "二级标题层级", rule_version: "vAuto" },
      } as any,
      {
        finding_id: "f-other",
        rule_id: "REFERENCE_MISSING_DOI",
        rule_group: "参考文献",
        rule_snapshot: { rule_text: "缺 DOI", rule_version: "vAuto" },
      } as any,
    ], 0);
    expect(finding?.finding_id).toBe("f-heading");
  });

  it("prefers explicit ruleId -> fixType mapping for formatter diffs", () => {
    const findingId = matchFormatterFindingIdForFixType({
      diffs: [
        { finding_id: "diff-toc", rule_id: "TOC_REFRESH_REVIEW", element: "toc", position: "page 2" },
        { finding_id: "diff-ref", rule_id: "REFERENCE_MISSING_DOI", element: "reference", position: "page 8" },
      ],
    }, "toc", 1);
    expect(findingId).toBe("diff-toc");
  });

  it("maps page margin rule to margin fix type", () => {
    const finding = matchFindingForFixType("margin", [
      {
        finding_id: "f-margin",
        rule_id: "PAGE_MARGIN_REVIEW",
        rule_group: "页面",
        rule_snapshot: { rule_text: "页边距", rule_version: "vAuto" },
      } as any,
    ], 0);
    expect(finding?.finding_id).toBe("f-margin");
  });

  it("maps footer alignment review to header/footer fix type", () => {
    const finding = matchFindingForFixType("header_footer", [
      {
        finding_id: "f-footer",
        rule_id: "FOOTER_ALIGNMENT_REVIEW",
        rule_group: "分节 & 页码",
        rule_snapshot: { rule_text: "页脚居中", rule_version: "vAuto" },
      } as any,
    ], 0);
    expect(finding?.finding_id).toBe("f-footer");
  });
});
