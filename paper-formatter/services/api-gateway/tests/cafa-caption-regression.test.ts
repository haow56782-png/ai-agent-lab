import { describe, expect, it } from "vitest";
import { CAFA_ANCHORED_FIXTURES } from "../src/fixtures/cafa-caption-fixtures.js";
import { CAFA_RULE_SEED } from "../src/fixtures/profile-rule-samples.js";
import type { CafaAnchoredFixture } from "../src/fixtures/cafa-types.js";
import { buildCaptionAnchorObjectsFromFixture, detectCaptionKind, evaluateCaptionAnchors } from "../src/rules/evaluators/caption-anchor-evaluator.js";

function normalizeText(value: string | undefined): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function inferRelations(fixture: CafaAnchoredFixture) {
  return evaluateCaptionAnchors(buildCaptionAnchorObjectsFromFixture(fixture.documentObjects)).map((relation) => ({
    fromObjectId: relation.fromObjectId,
    toObjectId: relation.toObjectId,
    relationType: relation.relationType,
  }));
}

function getFixture(fixtureId: string): CafaAnchoredFixture {
  const fixture = CAFA_ANCHORED_FIXTURES.find((item) => item.fixtureId === fixtureId);
  if (!fixture) throw new Error(`Fixture ${fixtureId} not found`);
  return fixture;
}

function getRuleExpectation(ruleId: string) {
  const rule = CAFA_RULE_SEED.rules.find((item) => item.ruleId === ruleId);
  if (!rule) throw new Error(`Rule ${ruleId} not found`);
  return rule.expected;
}

describe("CAFA anchored fixture regression", () => {
  it("ensures expected relations reference existing object anchors", () => {
    for (const fixture of CAFA_ANCHORED_FIXTURES) {
      const objectIds = new Set(fixture.documentObjects.map((object) => object.objectId));
      for (const relation of fixture.expectedRelations) {
        expect(objectIds.has(relation.fromObjectId)).toBe(true);
        expect(objectIds.has(relation.toObjectId)).toBe(true);
      }
    }
  });

  it("prevents figure captions from binding to tables and table captions from binding to figures", () => {
    for (const fixture of CAFA_ANCHORED_FIXTURES) {
      const objectMap = new Map(fixture.documentObjects.map((object) => [object.objectId, object]));
      for (const relation of fixture.expectedRelations) {
        const from = objectMap.get(relation.fromObjectId)!;
        const to = objectMap.get(relation.toObjectId)!;
        const kind = detectCaptionKind(from.text || "");
        if (kind === "figure") expect(to.type).toBe("figure");
        if (kind === "table") expect(to.type).toBe("table");
      }
    }
  });

  it("covers standard and wrong-position figure scenarios", () => {
    const standard = inferRelations(getFixture("cafa-fig-standard-001"));
    const wrong = inferRelations(getFixture("cafa-fig-wrong-position-001"));
    expect(standard).toEqual([
      { fromObjectId: "fig-caption-1", toObjectId: "figure-1", relationType: "caption_belongs_to_figure" },
    ]);
    expect(wrong).toEqual([
      { fromObjectId: "fig-caption-2", toObjectId: "figure-2", relationType: "caption_wrong_position" },
    ]);
  });

  it("handles multi-figure binding, wrapped captions, and body-reference interference", () => {
    const fixture = getFixture("cafa-fig-multi-wrap-001");
    const relations = inferRelations(fixture);
    expect(relations).toEqual([
      { fromObjectId: "fig-caption-3a", toObjectId: "figure-3a", relationType: "caption_belongs_to_figure" },
      { fromObjectId: "fig-caption-3b", toObjectId: "figure-3b", relationType: "caption_belongs_to_figure" },
    ]);
    expect(relations.some((relation) => relation.fromObjectId === "body-ref-fig-1")).toBe(false);
    expect(normalizeText(fixture.documentObjects.find((item) => item.objectId === "fig-caption-3a")?.text)).toContain("图2-1 中国石油 财务结构图");
  });

  it("covers standard table captions, wrong positions, continued tables, and body-reference interference", () => {
    const standard = inferRelations(getFixture("cafa-table-standard-001"));
    const complex = inferRelations(getFixture("cafa-table-wrong-position-continued-001"));
    expect(standard).toEqual([
      { fromObjectId: "table-caption-1", toObjectId: "table-1", relationType: "caption_belongs_to_table" },
    ]);
    expect(complex).toEqual([
      { fromObjectId: "table-caption-wrong-1", toObjectId: "table-main-1", relationType: "caption_wrong_position" },
      { fromObjectId: "table-caption-continued-1", toObjectId: "table-continued-1", relationType: "caption_belongs_to_table" },
    ]);
    expect(complex.some((relation) => relation.fromObjectId === "body-ref-table-1")).toBe(false);
  });

  it("enforces style expectations from CAFA rule seed on standard fixtures", () => {
    const figureCaption = getFixture("cafa-fig-standard-001").documentObjects.find((item) => item.objectId === "fig-caption-1")!;
    const tableCaption = getFixture("cafa-table-standard-001").documentObjects.find((item) => item.objectId === "table-caption-1")!;

    const figureAlign = getRuleExpectation("CAFA-FIG-CAPTION-002");
    const figureFont = getRuleExpectation("CAFA-FIG-CAPTION-003");
    const figureStyle = getRuleExpectation("CAFA-FIG-CAPTION-004");
    expect(figureCaption.style?.align).toBe(figureAlign.alignment);
    expect(figureCaption.style?.font).toBe(figureFont.fontFamily);
    expect(figureCaption.style?.sizePt).toBe(figureStyle.sizePt);
    expect(figureCaption.style?.spacingBeforePt).toBe(figureStyle.spacingBeforePt);
    expect(figureCaption.style?.spacingAfterPt).toBe(figureStyle.spacingAfterPt);
    expect(figureCaption.style?.bold).toBe(figureStyle.bold);

    const tableAlign = getRuleExpectation("CAFA-TABLE-CAPTION-002");
    const tableFont = getRuleExpectation("CAFA-TABLE-CAPTION-003");
    const tableStyle = getRuleExpectation("CAFA-TABLE-CAPTION-004");
    expect(tableCaption.style?.align).toBe(tableAlign.alignment);
    expect(tableCaption.style?.font).toBe(tableFont.fontFamily);
    expect(tableCaption.style?.sizePt).toBe(tableStyle.sizePt);
    expect(tableCaption.style?.spacingBeforePt).toBe(tableStyle.spacingBeforePt);
    expect(tableCaption.style?.spacingAfterPt).toBe(tableStyle.spacingAfterPt);
    expect(tableCaption.style?.bold).toBe(tableStyle.bold);
  });
});
